import bisect
import json
import math
from dataclasses import dataclass
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
OUTPUT_DIR = ROOT / "public" / "assets" / "vertical-slice" / "v1" / "05-07-school"
SAMPLE_COUNT = 241
AEGIS_SCAN_TARGET = (-0.775, 1.65, -77.225)
CLASSROOM_FOCUS_TARGET = (-12.2, 2.2, -102.1)
SECRETARIAT_SCREEN_TARGET = (10.55, 2.72, -109.2)
DESKTOP_SCAN_HOLD_RANGE = (0.18333333, 0.25833333)
DESKTOP_SCHOOLMATE_START = 0.328
DESKTOP_CLASSROOM_HOLD_RANGE = (0.405, 0.475)
MOBILE_SCAN_HOLD_RANGE = (0.153, 0.232)
MOBILE_SCHOOLMATE_START = 0.291
MOBILE_CLASSROOM_HOLD_RANGE = (0.325, 0.355)


@dataclass(frozen=True)
class CameraBeat:
    label: str
    progress: float
    position: tuple[float, float, float]
    target: tuple[float, float, float]
    fov_degrees: float
    roll_degrees: float = 0.0
    tangent_scale: float = 1.0


@dataclass(frozen=True)
class CameraSpec:
    asset_id: str
    tier: str
    beats: tuple[CameraBeat, ...]


def three_to_blender(point):
    x, y, z = point
    return Vector((x, -z, y))


def blender_to_three(point):
    return [round(point.x, 4), round(point.z, 4), round(-point.y, 4)]


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def derivative(points, progresses, index, scale):
    if scale == 0:
        return Vector((0.0, 0.0, 0.0))
    if index == 0:
        span = progresses[1] - progresses[0]
        tangent = (points[1] - points[0]) / span
    elif index == len(points) - 1:
        span = progresses[-1] - progresses[-2]
        tangent = (points[-1] - points[-2]) / span
    else:
        span = progresses[index + 1] - progresses[index - 1]
        tangent = (points[index + 1] - points[index - 1]) / span
    return tangent * scale


def create_authored_curve(name, beats, field):
    points = [three_to_blender(getattr(beat, field)) for beat in beats]
    progresses = [beat.progress for beat in beats]
    tangents = [
        derivative(points, progresses, index, beat.tangent_scale)
        for index, beat in enumerate(beats)
    ]

    curve_data = bpy.data.curves.new(name=name, type="CURVE")
    curve_data.dimensions = "3D"
    curve_data.resolution_u = 24
    spline = curve_data.splines.new(type="BEZIER")
    spline.bezier_points.add(len(beats) - 1)

    for index, bezier_point in enumerate(spline.bezier_points):
        bezier_point.co = points[index]
        bezier_point.handle_left_type = "FREE"
        bezier_point.handle_right_type = "FREE"
        previous_span = progresses[index] - progresses[index - 1] if index else 0.0
        next_span = progresses[index + 1] - progresses[index] if index < len(beats) - 1 else 0.0
        bezier_point.handle_left = points[index] - tangents[index] * previous_span / 3.0
        bezier_point.handle_right = points[index] + tangents[index] * next_span / 3.0

    curve_object = bpy.data.objects.new(name, curve_data)
    bpy.context.collection.objects.link(curve_object)
    return curve_object


def cubic_bezier(point_a, handle_a, handle_b, point_b, amount):
    inverse = 1.0 - amount
    return (
        point_a * (inverse ** 3)
        + handle_a * (3.0 * inverse * inverse * amount)
        + handle_b * (3.0 * inverse * amount * amount)
        + point_b * (amount ** 3)
    )


def segment_for_progress(beats, progress):
    progresses = [beat.progress for beat in beats]
    upper = bisect.bisect_right(progresses, progress)
    index = max(0, min(len(beats) - 2, upper - 1))
    start = progresses[index]
    end = progresses[index + 1]
    amount = (progress - start) / max(end - start, 1e-9)
    return index, max(0.0, min(1.0, amount))


def sample_curve(curve_object, beats, progress):
    index, amount = segment_for_progress(beats, progress)
    points = curve_object.data.splines[0].bezier_points
    current = points[index]
    following = points[index + 1]
    return cubic_bezier(
        current.co,
        current.handle_right,
        following.handle_left,
        following.co,
        amount,
    )


def scalar_derivative(beats, field, index):
    scale = beats[index].tangent_scale
    if scale == 0:
        return 0.0
    if index == 0:
        value_span = getattr(beats[1], field) - getattr(beats[0], field)
        progress_span = beats[1].progress - beats[0].progress
    elif index == len(beats) - 1:
        value_span = getattr(beats[-1], field) - getattr(beats[-2], field)
        progress_span = beats[-1].progress - beats[-2].progress
    else:
        value_span = getattr(beats[index + 1], field) - getattr(beats[index - 1], field)
        progress_span = beats[index + 1].progress - beats[index - 1].progress
    return value_span / max(progress_span, 1e-9) * scale


def sample_scalar(beats, field, progress):
    index, amount = segment_for_progress(beats, progress)
    current = beats[index]
    following = beats[index + 1]
    span = following.progress - current.progress
    value_a = getattr(current, field)
    value_b = getattr(following, field)
    handle_a = value_a + scalar_derivative(beats, field, index) * span / 3.0
    handle_b = value_b - scalar_derivative(beats, field, index + 1) * span / 3.0
    inverse = 1.0 - amount
    return (
        value_a * (inverse ** 3)
        + handle_a * (3.0 * inverse * inverse * amount)
        + handle_b * (3.0 * inverse * amount * amount)
        + value_b * (amount ** 3)
    )


def camera_samples(spec, position_curve, target_curve):
    samples = []
    for index in range(SAMPLE_COUNT):
        progress = index / (SAMPLE_COUNT - 1)
        position = sample_curve(position_curve, spec.beats, progress)
        target = sample_curve(target_curve, spec.beats, progress)
        samples.append({
            "progress": round(progress, 8),
            "position": blender_to_three(position),
            "target": blender_to_three(target),
            "fovDegrees": round(sample_scalar(spec.beats, "fov_degrees", progress), 4),
            "rollDegrees": round(sample_scalar(spec.beats, "roll_degrees", progress), 4),
        })

    first = spec.beats[0]
    last = spec.beats[-1]
    samples[0] = {
        "progress": 0.0,
        "position": list(first.position),
        "target": list(first.target),
        "fovDegrees": first.fov_degrees,
        "rollDegrees": first.roll_degrees,
    }
    samples[-1] = {
        "progress": 1.0,
        "position": list(last.position),
        "target": list(last.target),
        "fovDegrees": last.fov_degrees,
        "rollDegrees": last.roll_degrees,
    }
    return samples


def validate_spec(spec):
    if not 12 <= len(spec.beats) <= 16:
        raise ValueError(f"{spec.asset_id} must contain 12-16 authored beats")
    if spec.beats[0].progress != 0 or spec.beats[-1].progress != 1:
        raise ValueError(f"{spec.asset_id} must cover local progress 0..1")
    for previous, current in zip(spec.beats, spec.beats[1:]):
        if current.progress <= previous.progress:
            raise ValueError(f"{spec.asset_id} beat progress must be strictly increasing")

    beats_by_label = {beat.label: beat for beat in spec.beats}
    hold_in = beats_by_label["scanner-hold-in"]
    hold_out = beats_by_label["scanner-hold-out"]
    if hold_in.position != hold_out.position or hold_in.target != hold_out.target:
        raise ValueError(f"{spec.asset_id} scan hold must remain settled")
    if hold_in.target != AEGIS_SCAN_TARGET:
        raise ValueError(f"{spec.asset_id} scan hold must frame the phone and scanner")

    classroom_label = "classroom-hold-in"
    secretariat_label = "secretariat-arrival" if spec.tier == "desktop" else "secretariat-crop"
    classroom = beats_by_label[classroom_label]
    classroom_hold_out = beats_by_label["classroom-hold-out"]
    secretariat = beats_by_label[secretariat_label]
    if classroom.target != CLASSROOM_FOCUS_TARGET:
        raise ValueError(f"{spec.asset_id} classroom beat must frame the desks and blackboard")
    if classroom.position != classroom_hold_out.position or classroom.target != classroom_hold_out.target:
        raise ValueError(f"{spec.asset_id} classroom hold must remain settled")
    if secretariat.target != SECRETARIAT_SCREEN_TARGET:
        raise ValueError(f"{spec.asset_id} secretariat beat must target the secretariat screen")

    hold_range = DESKTOP_SCAN_HOLD_RANGE if spec.tier == "desktop" else MOBILE_SCAN_HOLD_RANGE
    classroom_hold_range = (
        DESKTOP_CLASSROOM_HOLD_RANGE
        if spec.tier == "desktop"
        else MOBILE_CLASSROOM_HOLD_RANGE
    )
    schoolmate_start = DESKTOP_SCHOOLMATE_START if spec.tier == "desktop" else MOBILE_SCHOOLMATE_START
    if (hold_in.progress, hold_out.progress) != hold_range:
        raise ValueError(f"{spec.asset_id} scan hold is outside the access interaction")
    if (classroom.progress, classroom_hold_out.progress) != classroom_hold_range:
        raise ValueError(f"{spec.asset_id} classroom hold is outside the classroom passage")

    gate = beats_by_label["gate-opens"]
    corridor_label = "corridor-wakes" if spec.tier == "desktop" else "corridor-vertical"
    corridor = beats_by_label[corridor_label]
    if gate.progress >= schoolmate_start or corridor.progress >= schoolmate_start:
        raise ValueError(f"{spec.asset_id} access transition must finish before SchoolMate")
    if classroom.progress <= schoolmate_start or secretariat.progress <= schoolmate_start:
        raise ValueError(f"{spec.asset_id} SchoolMate beats must remain in the SchoolMate section")


def validate_samples(spec, samples):
    if len(samples) != SAMPLE_COUNT:
        raise ValueError(f"{spec.asset_id} wrote {len(samples)} samples")
    previous_progress = -1.0
    for sample in samples:
        values = [
            sample["progress"],
            *sample["position"],
            *sample["target"],
            sample["fovDegrees"],
            sample["rollDegrees"],
        ]
        if not all(math.isfinite(value) for value in values):
            raise ValueError(f"{spec.asset_id} contains a non-finite sample")
        if sample["progress"] <= previous_progress:
            raise ValueError(f"{spec.asset_id} progress is not strictly increasing")
        if not 30 <= sample["fovDegrees"] <= 72:
            raise ValueError(f"{spec.asset_id} contains an unsafe FOV")
        position = Vector(sample["position"])
        target = Vector(sample["target"])
        if (target - position).length < 1.25:
            raise ValueError(f"{spec.asset_id} camera target is too close")
        previous_progress = sample["progress"]


def write_curve(spec):
    validate_spec(spec)
    suffix = "Desktop" if spec.tier == "desktop" else "Mobile"
    position_curve = create_authored_curve(f"CRV_SchoolAct_{suffix}_Pos", spec.beats, "position")
    target_curve = create_authored_curve(f"CRV_SchoolAct_{suffix}_Tgt", spec.beats, "target")

    camera_data = bpy.data.cameras.new(f"CAM_SchoolAct_{suffix}")
    camera_object = bpy.data.objects.new(f"CAM_SchoolAct_{suffix}", camera_data)
    bpy.context.collection.objects.link(camera_object)
    camera_object.location = three_to_blender(spec.beats[0].position)
    direction = three_to_blender(spec.beats[0].target) - camera_object.location
    camera_object.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    camera_data.angle = math.radians(spec.beats[0].fov_degrees)

    samples = camera_samples(spec, position_curve, target_curve)
    validate_samples(spec, samples)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_path = OUTPUT_DIR / f"camera.{spec.tier}.json"
    payload = {"schemaVersion": 1, "id": spec.asset_id, "samples": samples}
    output_path.write_text(json.dumps(payload, separators=(",", ":")) + "\n", encoding="utf-8")
    labels = " -> ".join(beat.label for beat in spec.beats)
    print(f"Wrote {output_path.relative_to(ROOT)} ({SAMPLE_COUNT} samples)")
    print(f"  {labels}")


DESKTOP_BEATS = (
    CameraBeat("proof-handoff", 0.0, (1.8, 4.6, -72.0), (-0.2, 4.1, -80.0), 48.0),
    CameraBeat("detection-residue", 0.0625, (3.8, 4.65, -75.2), AEGIS_SCAN_TARGET, 47.5, -0.12),
    CameraBeat("gate-materialises", 0.1, (4.3, 4.3, -77.6), AEGIS_SCAN_TARGET, 46.0, -0.24),
    CameraBeat("student-enters", 0.13333333, (3.8, 4.0, -79.5), AEGIS_SCAN_TARGET, 44.0, 0.32),
    CameraBeat("over-shoulder", 0.16666667, (2.8, 3.75, -80.9), AEGIS_SCAN_TARGET, 43.0, -0.48),
    CameraBeat("scanner-hold-in", 0.18333333, (2.0, 3.6, -81.5), AEGIS_SCAN_TARGET, 48.0, -0.2, 0.0),
    CameraBeat("scanner-hold-out", 0.25833333, (2.0, 3.6, -81.5), AEGIS_SCAN_TARGET, 48.0, -0.2, 0.0),
    CameraBeat("transaction-resolves", 0.27916667, (4.15, 4.1, -81.8), (3.72, 0.7, -84.0), 44.0, 0.34),
    CameraBeat("gate-opens", 0.30416667, (1.2, 4.35, -84.0), (0.0, 2.8, -89.5), 46.5, 0.1),
    CameraBeat("corridor-wakes", 0.325, (-1.0, 4.85, -89.0), (-0.2, 3.65, -95.0), 48.5, -0.18),
    CameraBeat("classroom-threshold", 0.365, (-4.6, 4.45, -96.4), (-10.8, 3.15, -101.5), 47.0, 0.12, 0.7),
    CameraBeat("classroom-hold-in", 0.405, (-8.4, 4.15, -99.4), CLASSROOM_FOCUS_TARGET, 48.0, 0.08, 0.0),
    CameraBeat("classroom-hold-out", 0.475, (-8.4, 4.15, -99.4), CLASSROOM_FOCUS_TARGET, 48.0, 0.08, 0.0),
    CameraBeat("secretariat-arrival", 0.68, (7.0, 3.7, -104.8), SECRETARIAT_SCREEN_TARGET, 43.0, 0.3),
    CameraBeat("editorial-wide", 0.91, (2.8, 5.9, -113.0), (0.0, 3.5, -118.0), 49.0),
    CameraBeat("descent-handoff", 1.0, (0.0, 3.8, -120.0), (0.0, 1.65, -128.0), 50.0),
)


MOBILE_BEATS = (
    CameraBeat("proof-handoff", 0.0, (0.828, 4.95, -72.0), (-0.084, 4.25, -80.0), 58.0),
    CameraBeat("detection-residue", 0.05416667, (4.4, 4.6, -75.7), AEGIS_SCAN_TARGET, 57.5, -0.04),
    CameraBeat("gate-vertical", 0.10833333, (3.4, 4.0, -80.8), AEGIS_SCAN_TARGET, 62.0, -0.08),
    CameraBeat("student-enters", 0.12916667, (1.7, 3.7, -82.1), AEGIS_SCAN_TARGET, 58.0, 0.1),
    CameraBeat("portrait-shoulder", 0.145, (0.2, 3.55, -82.55), AEGIS_SCAN_TARGET, 60.0, -0.14),
    CameraBeat("scanner-hold-in", 0.153, (-0.6, 3.5, -82.5), AEGIS_SCAN_TARGET, 60.0, -0.06, 0.0),
    CameraBeat("scanner-hold-out", 0.232, (-0.6, 3.5, -82.5), AEGIS_SCAN_TARGET, 60.0, -0.06, 0.0),
    CameraBeat("transaction-stacked", 0.25, (-0.2, 4.0, -83.2), (3.72, 0.7, -84.0), 60.0, 0.12),
    CameraBeat("gate-opens", 0.27083333, (0.05, 4.5, -85.0), (0.0, 3.0, -91.0), 61.0, 0.04),
    CameraBeat("corridor-vertical", 0.289, (0.2, 5.1, -88.8), (0.0, 3.6, -94.8), 63.0, -0.08),
    CameraBeat("classroom-threshold", 0.305, (-3.1, 4.75, -96.0), (-10.8, 3.3, -101.5), 64.0, 0.05, 0.65),
    CameraBeat("classroom-hold-in", 0.325, (-8.6, 4.2, -99.7), CLASSROOM_FOCUS_TARGET, 64.0, 0.04, 0.0),
    CameraBeat("classroom-hold-out", 0.355, (-8.6, 4.2, -99.7), CLASSROOM_FOCUS_TARGET, 64.0, 0.04, 0.0),
    CameraBeat("secretariat-crop", 0.69, (7.0, 3.7, -103.0), SECRETARIAT_SCREEN_TARGET, 60.0, 0.1),
    CameraBeat("editorial-vertical", 0.91, (0.0, 6.35, -113.5), (0.0, 3.3, -119.0), 64.0),
    CameraBeat("descent-handoff", 1.0, (0.0, 4.25, -120.0), (0.0, 1.7, -128.0), 60.0),
)


def main():
    reset_scene()
    specs = (
        CameraSpec("vs05-07.school.camera.desktop", "desktop", DESKTOP_BEATS),
        CameraSpec("vs05-07.school.camera.mobile", "mobile", MOBILE_BEATS),
    )
    for spec in specs:
        write_curve(spec)
    print("School act authored camera curves complete.")


if __name__ == "__main__":
    main()
