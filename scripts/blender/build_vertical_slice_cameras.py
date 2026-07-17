import json
import math
from dataclasses import dataclass
from pathlib import Path

import bpy
from mathutils import Vector
from mathutils.geometry import interpolate_bezier


ROOT = Path(__file__).resolve().parents[2]
OUTPUT_ROOT = ROOT / "public" / "assets" / "vertical-slice" / "v1"
SAMPLE_COUNT = 241


@dataclass(frozen=True)
class CameraSpec:
    chapter: str
    chapter_dir: str
    asset_id: str
    tier: str
    positions: tuple[tuple[float, float, float], ...]
    targets: tuple[tuple[float, float, float], ...]
    fov_start: float
    fov_end: float
    fov_breath: float
    roll_peak: float
    pace_bias: float


def three_to_blender(point):
    x, y, z = point
    return Vector((x, -z, y))


def blender_to_three(point):
    return [round(point.x, 4), round(point.z, 4), round(-point.y, 4)]


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def create_curve(name, points):
    curve_data = bpy.data.curves.new(name=name, type="CURVE")
    curve_data.dimensions = "3D"
    curve_data.resolution_u = 24
    spline = curve_data.splines.new(type="BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for bezier_point, point in zip(spline.bezier_points, points):
        bezier_point.co = three_to_blender(point)
        bezier_point.handle_left_type = "AUTO"
        bezier_point.handle_right_type = "AUTO"
    curve_object = bpy.data.objects.new(name, curve_data)
    bpy.context.collection.objects.link(curve_object)
    return curve_object


def dense_curve_samples(curve_object, segment_resolution=72):
    points = curve_object.data.splines[0].bezier_points
    samples = []
    for index in range(len(points) - 1):
        current = points[index]
        following = points[index + 1]
        segment = interpolate_bezier(
            current.co,
            current.handle_right,
            following.handle_left,
            following.co,
            segment_resolution,
        )
        if index:
            segment = segment[1:]
        samples.extend(segment)
    return samples


def arc_length_resample(points, sample_count):
    cumulative = [0.0]
    for index in range(1, len(points)):
        cumulative.append(cumulative[-1] + (points[index] - points[index - 1]).length)
    total = cumulative[-1]
    if total <= 1e-8:
        return [points[0].copy() for _ in range(sample_count)]

    result = []
    cursor = 1
    for sample_index in range(sample_count):
        target_distance = total * sample_index / (sample_count - 1)
        while cursor < len(cumulative) - 1 and cumulative[cursor] < target_distance:
            cursor += 1
        lower_index = max(0, cursor - 1)
        upper_index = cursor
        lower_distance = cumulative[lower_index]
        upper_distance = cumulative[upper_index]
        span = max(upper_distance - lower_distance, 1e-8)
        mix = (target_distance - lower_distance) / span
        result.append(points[lower_index].lerp(points[upper_index], mix))
    return result


def smoothstep(value):
    return value * value * (3.0 - 2.0 * value)


def paced_progress(progress, bias):
    eased = smoothstep(progress)
    asymmetric_hold = progress * progress * (1.0 - progress) * (1.0 - progress)
    return max(0.0, min(1.0, eased + bias * asymmetric_hold))


def sample_even_curve(points, progress):
    sample_position = progress * (len(points) - 1)
    lower_index = int(math.floor(sample_position))
    upper_index = min(len(points) - 1, lower_index + 1)
    mix = sample_position - lower_index
    return points[lower_index].lerp(points[upper_index], mix)


def camera_samples(spec, position_curve, target_curve):
    even_positions = arc_length_resample(dense_curve_samples(position_curve), SAMPLE_COUNT)
    even_targets = arc_length_resample(dense_curve_samples(target_curve), SAMPLE_COUNT)
    samples = []
    for index in range(SAMPLE_COUNT):
        progress = index / (SAMPLE_COUNT - 1)
        motion_progress = paced_progress(progress, spec.pace_bias)
        position = sample_even_curve(even_positions, motion_progress)
        target = sample_even_curve(even_targets, motion_progress)
        if index == 0:
            position = three_to_blender(spec.positions[0])
            target = three_to_blender(spec.targets[0])
        elif index == SAMPLE_COUNT - 1:
            position = three_to_blender(spec.positions[-1])
            target = three_to_blender(spec.targets[-1])
        eased = smoothstep(progress)
        breath = math.sin(progress * math.pi) * spec.fov_breath
        fov = spec.fov_start + (spec.fov_end - spec.fov_start) * eased + breath
        roll = math.sin(progress * math.pi) * spec.roll_peak
        samples.append({
            "progress": round(progress, 8),
            "position": blender_to_three(position),
            "target": blender_to_three(target),
            "fovDegrees": round(fov, 4),
            "rollDegrees": round(roll, 4),
        })
    return samples


def write_curve(spec):
    suffix = "Desktop" if spec.tier == "desktop" else "Mobile"
    position_curve = create_curve(f"CRV_{spec.chapter}_{suffix}_Pos", spec.positions)
    target_curve = create_curve(f"CRV_{spec.chapter}_{suffix}_Tgt", spec.targets)

    camera_data = bpy.data.cameras.new(f"CAM_{spec.chapter}_{suffix}")
    camera_object = bpy.data.objects.new(f"CAM_{spec.chapter}_{suffix}", camera_data)
    bpy.context.collection.objects.link(camera_object)
    camera_object.location = three_to_blender(spec.positions[0])
    direction = three_to_blender(spec.targets[0]) - camera_object.location
    camera_object.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    camera_data.lens = 42 if spec.tier == "desktop" else 36

    output_dir = OUTPUT_ROOT / spec.chapter_dir
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / f"camera.{spec.tier}.json"
    payload = {
        "schemaVersion": 1,
        "id": spec.asset_id,
        "samples": camera_samples(spec, position_curve, target_curve),
    }
    output_path.write_text(json.dumps(payload, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"Wrote {output_path.relative_to(ROOT)} ({SAMPLE_COUNT} samples)")


DESKTOP_SPECS = (
    CameraSpec(
        chapter="Threshold",
        chapter_dir="01-threshold",
        asset_id="vs01.camera.desktop",
        tier="desktop",
        positions=((8.4, 8.4, 31.5), (6.4, 7.5, 28.5), (3.5, 6.5, 24.5), (1.2, 5.8, 20.2), (0, 5.3, 16.5)),
        targets=((-3.0, 5.9, 15.0), (-2.35, 5.65, 15.0), (-1.15, 5.4, 15.0), (-0.3, 5.1, 14.8), (0, 4.7, 14.2)),
        fov_start=41,
        fov_end=43,
        fov_breath=-0.8,
        roll_peak=-0.38,
        pace_bias=-0.82,
    ),
    CameraSpec(
        chapter="Field",
        chapter_dir="02-field",
        asset_id="vs02.camera.desktop",
        tier="desktop",
        positions=((0, 5.3, 16.5), (0, 4.8, 11.4), (0.5, 4.5, 3), (-2.4, 4.2, -6), (1.7, 5.1, -18)),
        targets=((0, 4.7, 14.2), (0.1, 4.3, 7.6), (-0.6, 3.9, -2.5), (0.9, 4.2, -13), (-0.4, 4.6, -24)),
        fov_start=43,
        fov_end=49,
        fov_breath=1.4,
        roll_peak=0.85,
        pace_bias=0.85,
    ),
    CameraSpec(
        chapter="Lens",
        chapter_dir="03-lens",
        asset_id="vs03.camera.desktop",
        tier="desktop",
        positions=((1.7, 5.1, -18), (-3.2, 5.5, -31), (0.8, 5.2, -43), (0.3, 5.8, -54), (0, 5.3, -64)),
        targets=((-0.4, 4.6, -24), (0.6, 4.5, -37), (-0.7, 4.7, -49), (0.2, 4.8, -60), (0.3, 4.6, -70)),
        fov_start=49,
        fov_end=45,
        fov_breath=-1.1,
        roll_peak=-0.65,
        pace_bias=1.4,
    ),
    CameraSpec(
        chapter="Proof",
        chapter_dir="04-proof",
        asset_id="vs04.camera.desktop",
        tier="desktop",
        positions=((0, 5.3, -64), (0.7, 5.05, -67), (1.8, 4.6, -72)),
        targets=((0.3, 4.6, -70), (0, 4.25, -75), (-0.2, 4.1, -80)),
        fov_start=45,
        fov_end=48,
        fov_breath=0.6,
        roll_peak=0.28,
        pace_bias=-0.2,
    ),
)


def compact_spec(spec):
    if spec.chapter == "Threshold":
        # Mobile keeps the taller establishing composition; the desktop path is
        # deliberately lower and closer to avoid presenting the citadel as a model viewer.
        return CameraSpec(
            chapter=spec.chapter,
            chapter_dir=spec.chapter_dir,
            asset_id=spec.asset_id.replace("desktop", "mobile"),
            tier="mobile",
            positions=((8.28, 11.85, 38), (5.98, 10.55, 33), (3.22, 8.55, 27), (1.012, 6.75, 21), (0, 5.65, 16.5)),
            targets=((-0.504, 6.95, 14.8), (-0.336, 6.65, 14.9), (0, 6.25, 15), (0, 5.35, 14.8), (0, 4.85, 14.2)),
            fov_start=56,
            fov_end=53,
            fov_breath=-0.66,
            roll_peak=-0.245,
            pace_bias=-0.432,
        )
    return CameraSpec(
        chapter=spec.chapter,
        chapter_dir=spec.chapter_dir,
        asset_id=spec.asset_id.replace("desktop", "mobile"),
        tier="mobile",
        positions=tuple((x * 0.46, y + 0.35, z) for x, y, z in spec.positions),
        targets=tuple((x * 0.42, y + 0.15, z) for x, y, z in spec.targets),
        fov_start=spec.fov_start + 10,
        fov_end=spec.fov_end + 10,
        fov_breath=spec.fov_breath * 0.55,
        roll_peak=spec.roll_peak * 0.35,
        pace_bias=spec.pace_bias * 0.72,
    )


def main():
    reset_scene()
    for spec in DESKTOP_SPECS:
        write_curve(spec)
        write_curve(compact_spec(spec))
    print("Vertical slice camera curves complete.")


if __name__ == "__main__":
    main()
