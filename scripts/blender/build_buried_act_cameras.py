import bisect
import json
import math
from dataclasses import dataclass
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
OUTPUT_DIR = ROOT / "public" / "assets" / "vertical-slice" / "v1" / "08-10-buried"
SAMPLE_COUNT = 241
SAMPLE_KEYS = {
    "progress",
    "position",
    "target",
    "fovDegrees",
    "rollDegrees",
}
PAYLOAD_KEYS = {"schemaVersion", "id", "samples"}
FOV_RANGES = {
    "desktop": (42.0, 53.0),
    "mobile": (52.0, 64.0),
}

LAMP_HOLD_TARGET = (0.0, -0.45, -154.15)
OIL_FOCUS_TARGET = (-4.15, -1.55, -153.65)
MECHANISM_FOCUS_TARGET = (3.15, 0.85, -153.55)
MERCURY_FOCUS_TARGET = (3.75, -2.35, -158.7)
GUARDS_EVIDENCE_TARGET = (-5.28, -0.75, -169.65)
MERCURY_EVIDENCE_TARGET = (5.28, -0.75, -177.75)
ROYAL_HALL_EVIDENCE_TARGET = (-7.38, -0.55, -188.15)
PIXEL_HANDOFF_TARGET = (0.0, -0.52, -195.35)

SCHOOL_HANDOFFS = {
    "desktop": {
        "position": (0.0, 3.8, -120.0),
        "target": (0.0, 1.65, -128.0),
        "fov_degrees": 50.0,
        "roll_degrees": 0.0,
    },
    "mobile": {
        "position": (0.0, 4.25, -120.0),
        "target": (0.0, 1.7, -128.0),
        "fov_degrees": 60.0,
        "roll_degrees": 0.0,
    },
}

PIXEL_HANDOFFS = {
    "desktop": {
        "position": (0.0, -0.45, -191.85),
        "target": PIXEL_HANDOFF_TARGET,
        "fov_degrees": 42.0,
        "roll_degrees": 0.0,
    },
    "mobile": {
        "position": (0.0, -0.35, -191.85),
        "target": PIXEL_HANDOFF_TARGET,
        "fov_degrees": 54.0,
        "roll_degrees": 0.0,
    },
}

HOLD_CONTRACTS = (("lamp-hold-in", "lamp-hold-out", (0.18, 0.28)),)
NARRATIVE_WINDOWS = {
    "axial-descent": (0.0, 0.08),
    "mineral-sentries": (0.08, 0.18),
    "oil-focus": (0.28, 0.39),
    "mechanism-evidence": (0.39, 0.50),
    "mercury-focus": (0.50, 0.61),
    "guards-evidence": (0.61, 0.70),
    "mercury-evidence": (0.70, 0.79),
    "royal-hall-evidence": (0.79, 0.90),
    "proof-wide": (0.90, 0.96),
    "pixel-iris": (0.96, 1.0),
    "pixel-compression": (0.96, 1.0),
}


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
    samples[0] = sample_from_beat(first)
    samples[-1] = sample_from_beat(last)
    return samples


def sample_from_beat(beat):
    return {
        "progress": beat.progress,
        "position": list(beat.position),
        "target": list(beat.target),
        "fovDegrees": beat.fov_degrees,
        "rollDegrees": beat.roll_degrees,
    }


def values_match(first, second, tolerance=1e-4):
    return abs(first - second) <= tolerance


def vectors_match(first, second, tolerance=1e-4):
    return all(values_match(a, b, tolerance) for a, b in zip(first, second))


def poses_match(first, second):
    return (
        vectors_match(first.position, second["position"])
        and vectors_match(first.target, second["target"])
        and values_match(first.fov_degrees, second["fov_degrees"])
        and values_match(first.roll_degrees, second["roll_degrees"])
    )


def samples_match(first, second):
    return (
        vectors_match(first["position"], second["position"])
        and vectors_match(first["target"], second["target"])
        and values_match(first["fovDegrees"], second["fovDegrees"])
        and values_match(first["rollDegrees"], second["rollDegrees"])
    )


def validate_spec(spec):
    if spec.tier not in FOV_RANGES:
        raise ValueError(f"{spec.asset_id} has an unsupported tier")
    if not 12 <= len(spec.beats) <= 16:
        raise ValueError(f"{spec.asset_id} must contain 12-16 authored beats")
    if spec.beats[0].progress != 0 or spec.beats[-1].progress != 1:
        raise ValueError(f"{spec.asset_id} must cover local progress 0..1")

    labels = [beat.label for beat in spec.beats]
    if len(set(labels)) != len(labels):
        raise ValueError(f"{spec.asset_id} contains duplicate beat labels")

    minimum_fov, maximum_fov = FOV_RANGES[spec.tier]
    for beat in spec.beats:
        values = [
            beat.progress,
            *beat.position,
            *beat.target,
            beat.fov_degrees,
            beat.roll_degrees,
            beat.tangent_scale,
        ]
        if not all(type(value) in (int, float) and math.isfinite(value) for value in values):
            raise ValueError(f"{spec.asset_id} beat {beat.label} contains a non-finite value")
        if not values_match(beat.progress * (SAMPLE_COUNT - 1), round(beat.progress * (SAMPLE_COUNT - 1)), 1e-7):
            raise ValueError(f"{spec.asset_id} beat {beat.label} is not sample-aligned")
        if not minimum_fov <= beat.fov_degrees <= maximum_fov:
            raise ValueError(f"{spec.asset_id} beat {beat.label} contains an unsafe FOV")
        if abs(beat.roll_degrees) > 1.0:
            raise ValueError(f"{spec.asset_id} beat {beat.label} contains an unsafe roll")
        if (Vector(beat.target) - Vector(beat.position)).length < 1.25:
            raise ValueError(f"{spec.asset_id} beat {beat.label} has a target that is too close")

    for previous, current in zip(spec.beats, spec.beats[1:]):
        if current.progress <= previous.progress:
            raise ValueError(f"{spec.asset_id} beat progress must be strictly increasing")

    if not poses_match(spec.beats[0], SCHOOL_HANDOFFS[spec.tier]):
        raise ValueError(f"{spec.asset_id} does not match the School Act handoff")
    if not poses_match(spec.beats[-1], PIXEL_HANDOFFS[spec.tier]):
        raise ValueError(f"{spec.asset_id} does not end at the pixel handoff")

    beats_by_label = {beat.label: beat for beat in spec.beats}
    axial_beats = [
        beats_by_label[label]
        for label in ("school-handoff", "axial-descent", "mineral-sentries", "lamp-hold-in")
    ]
    if any(abs(beat.position[0]) > 1e-4 or abs(beat.target[0]) > 1e-4 for beat in axial_beats):
        raise ValueError(f"{spec.asset_id} descent must remain on the mausoleum axis")
    if any(current.position[2] >= previous.position[2] for previous, current in zip(axial_beats, axial_beats[1:])):
        raise ValueError(f"{spec.asset_id} descent must travel forward through each axial zone")
    if any(current.position[1] >= previous.position[1] for previous, current in zip(axial_beats, axial_beats[1:])):
        raise ValueError(f"{spec.asset_id} descent must lose elevation before the lamp hold")

    for label, allowed_range in NARRATIVE_WINDOWS.items():
        beat = beats_by_label.get(label)
        if beat is None or not allowed_range[0] <= beat.progress <= allowed_range[1]:
            raise ValueError(f"{spec.asset_id} {label} is outside its narrative range")

    for hold_in_label, hold_out_label, allowed_range in HOLD_CONTRACTS:
        if hold_in_label not in beats_by_label or hold_out_label not in beats_by_label:
            raise ValueError(f"{spec.asset_id} is missing the {hold_in_label} hold")
        hold_in = beats_by_label[hold_in_label]
        hold_out = beats_by_label[hold_out_label]
        if hold_in.progress < allowed_range[0] or hold_out.progress > allowed_range[1]:
            raise ValueError(f"{spec.asset_id} {hold_in_label} is outside its narrative range")
        if hold_in.progress >= hold_out.progress:
            raise ValueError(f"{spec.asset_id} {hold_in_label} has no duration")
        if hold_in.tangent_scale != 0 or hold_out.tangent_scale != 0:
            raise ValueError(f"{spec.asset_id} {hold_in_label} must settle at both ends")
        if not poses_match(hold_in, {
            "position": hold_out.position,
            "target": hold_out.target,
            "fov_degrees": hold_out.fov_degrees,
            "roll_degrees": hold_out.roll_degrees,
        }):
            raise ValueError(f"{spec.asset_id} {hold_in_label} must remain stationary")

    expected_targets = {
        "lamp-hold-in": LAMP_HOLD_TARGET,
        "oil-focus": OIL_FOCUS_TARGET,
        "mechanism-evidence": MECHANISM_FOCUS_TARGET,
        "mercury-focus": MERCURY_FOCUS_TARGET,
        "guards-evidence": GUARDS_EVIDENCE_TARGET,
        "mercury-evidence": MERCURY_EVIDENCE_TARGET,
        "royal-hall-evidence": ROYAL_HALL_EVIDENCE_TARGET,
        "pixel-iris": PIXEL_HANDOFF_TARGET,
        "pixel-compression": PIXEL_HANDOFF_TARGET,
        "pixel-handoff": PIXEL_HANDOFF_TARGET,
    }
    for label, target in expected_targets.items():
        if beats_by_label[label].target != target:
            raise ValueError(f"{spec.asset_id} {label} misses its semantic anchor")


def validate_payload(spec, payload):
    if type(payload) is not dict or set(payload) != PAYLOAD_KEYS:
        raise ValueError(f"{spec.asset_id} payload does not match schema v1")
    if payload["schemaVersion"] != 1 or payload["id"] != spec.asset_id:
        raise ValueError(f"{spec.asset_id} payload metadata is invalid")
    if type(payload["samples"]) is not list:
        raise ValueError(f"{spec.asset_id} samples must be an array")
    validate_samples(spec, payload["samples"])


def validate_samples(spec, samples):
    if len(samples) != SAMPLE_COUNT:
        raise ValueError(f"{spec.asset_id} wrote {len(samples)} samples")

    minimum_fov, maximum_fov = FOV_RANGES[spec.tier]
    for index, sample in enumerate(samples):
        if type(sample) is not dict or set(sample) != SAMPLE_KEYS:
            raise ValueError(f"{spec.asset_id} sample {index} does not match schema v1")
        expected_progress = round(index / (SAMPLE_COUNT - 1), 8)
        if sample["progress"] != expected_progress:
            raise ValueError(f"{spec.asset_id} sample {index} has invalid progress")
        if type(sample["position"]) is not list or len(sample["position"]) != 3:
            raise ValueError(f"{spec.asset_id} sample {index} has an invalid position")
        if type(sample["target"]) is not list or len(sample["target"]) != 3:
            raise ValueError(f"{spec.asset_id} sample {index} has an invalid target")

        values = [
            sample["progress"],
            *sample["position"],
            *sample["target"],
            sample["fovDegrees"],
            sample["rollDegrees"],
        ]
        if not all(type(value) in (int, float) and math.isfinite(value) for value in values):
            raise ValueError(f"{spec.asset_id} sample {index} contains a non-finite value")
        if not minimum_fov <= sample["fovDegrees"] <= maximum_fov:
            raise ValueError(f"{spec.asset_id} sample {index} contains an unsafe FOV")
        if abs(sample["rollDegrees"]) > 1.0:
            raise ValueError(f"{spec.asset_id} sample {index} contains an unsafe roll")
        if (Vector(sample["target"]) - Vector(sample["position"])).length < 1.25:
            raise ValueError(f"{spec.asset_id} sample {index} has a target that is too close")

    if not samples_match(samples[0], sample_from_beat(spec.beats[0])):
        raise ValueError(f"{spec.asset_id} emitted an invalid School Act handoff")
    if not samples_match(samples[-1], sample_from_beat(spec.beats[-1])):
        raise ValueError(f"{spec.asset_id} emitted an invalid pixel handoff")

    beats_by_label = {beat.label: beat for beat in spec.beats}
    for hold_in_label, hold_out_label, _ in HOLD_CONTRACTS:
        hold_in = beats_by_label[hold_in_label]
        hold_out = beats_by_label[hold_out_label]
        first_index = round(hold_in.progress * (SAMPLE_COUNT - 1))
        last_index = round(hold_out.progress * (SAMPLE_COUNT - 1))
        if samples[first_index]["progress"] != round(hold_in.progress, 8):
            raise ValueError(f"{spec.asset_id} {hold_in_label} is not sample-aligned")
        if samples[last_index]["progress"] != round(hold_out.progress, 8):
            raise ValueError(f"{spec.asset_id} {hold_out_label} is not sample-aligned")
        reference = samples[first_index]
        for index in range(first_index, last_index + 1):
            if not samples_match(reference, samples[index]):
                raise ValueError(f"{spec.asset_id} {hold_in_label} drifts at sample {index}")


def write_curve(spec):
    validate_spec(spec)
    suffix = "Desktop" if spec.tier == "desktop" else "Mobile"
    position_curve = create_authored_curve(f"CRV_BuriedAct_{suffix}_Pos", spec.beats, "position")
    target_curve = create_authored_curve(f"CRV_BuriedAct_{suffix}_Tgt", spec.beats, "target")

    camera_data = bpy.data.cameras.new(f"CAM_BuriedAct_{suffix}")
    camera_object = bpy.data.objects.new(f"CAM_BuriedAct_{suffix}", camera_data)
    bpy.context.collection.objects.link(camera_object)
    camera_object.location = three_to_blender(spec.beats[0].position)
    direction = three_to_blender(spec.beats[0].target) - camera_object.location
    camera_object.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    camera_data.angle = math.radians(spec.beats[0].fov_degrees)

    payload = {
        "schemaVersion": 1,
        "id": spec.asset_id,
        "samples": camera_samples(spec, position_curve, target_curve),
    }
    validate_payload(spec, payload)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_path = OUTPUT_DIR / f"camera.{spec.tier}.json"
    serialized = json.dumps(payload, separators=(",", ":"), allow_nan=False)
    output_path.write_text(serialized + "\n", encoding="utf-8")
    labels = " -> ".join(beat.label for beat in spec.beats)
    print(f"Wrote {output_path.relative_to(ROOT)} ({SAMPLE_COUNT} samples)")
    print(f"  {labels}")


DESKTOP_BEATS = (
    CameraBeat("school-handoff", 0.0, (0.0, 3.8, -120.0), (0.0, 1.65, -128.0), 50.0),
    CameraBeat("axial-descent", 19 / 240, (0.0, 3.0, -129.2), (0.0, 0.65, -137.0), 49.0),
    CameraBeat("mineral-sentries", 39 / 240, (0.0, 2.05, -140.1), (0.0, -0.75, -146.1), 47.0),
    CameraBeat("lamp-hold-in", 48 / 240, (0.0, 1.65, -147.25), LAMP_HOLD_TARGET, 51.0, 0.0, 0.0),
    CameraBeat("lamp-hold-out", 64 / 240, (0.0, 1.65, -147.25), LAMP_HOLD_TARGET, 51.0, 0.0, 0.0),
    CameraBeat("oil-focus", 84 / 240, (-0.25, 0.1, -148.4), OIL_FOCUS_TARGET, 44.0, -0.12, 0.72),
    CameraBeat("mechanism-evidence", 108 / 240, (0.3, 0.1, -148.3), MECHANISM_FOCUS_TARGET, 43.0, 0.12, 0.72),
    CameraBeat("mercury-focus", 132 / 240, (0.4, -0.4, -153.6), MERCURY_FOCUS_TARGET, 45.0, -0.08, 0.68),
    CameraBeat("gallery-threshold", 146 / 240, (0.0, -0.5, -163.5), (0.0, -0.72, -169.3), 47.0, 0.04),
    CameraBeat("guards-evidence", 160 / 240, (0.0, -0.72, -167.4), GUARDS_EVIDENCE_TARGET, 43.0, -0.08, 0.72),
    CameraBeat("mercury-evidence", 181 / 240, (0.0, -0.72, -175.5), MERCURY_EVIDENCE_TARGET, 43.5, 0.08, 0.72),
    CameraBeat("royal-hall-evidence", 204 / 240, (0.0, -0.55, -185.8), ROYAL_HALL_EVIDENCE_TARGET, 49.0, -0.06, 0.62),
    CameraBeat("proof-wide", 222 / 240, (0.0, 2.4, -184.5), (0.0, -0.7, -190.5), 53.0, 0.0, 0.0),
    CameraBeat("pixel-iris", 231 / 240, (0.0, 1.4, -188.4), PIXEL_HANDOFF_TARGET, 49.0, 0.0, 0.5),
    CameraBeat("pixel-compression", 236 / 240, (0.0, -0.15, -190.6), PIXEL_HANDOFF_TARGET, 45.0, 0.0, 0.4),
    CameraBeat("pixel-handoff", 1.0, (0.0, -0.45, -191.85), PIXEL_HANDOFF_TARGET, 42.0, 0.0, 0.0),
)


MOBILE_BEATS = (
    CameraBeat("school-handoff", 0.0, (0.0, 4.25, -120.0), (0.0, 1.7, -128.0), 60.0),
    CameraBeat("axial-descent", 19 / 240, (0.0, 3.25, -129.6), (0.0, 0.7, -137.3), 59.0),
    CameraBeat("mineral-sentries", 39 / 240, (0.0, 2.2, -140.6), (0.0, -0.8, -146.2), 58.0),
    CameraBeat("lamp-hold-in", 48 / 240, (0.0, 1.7, -148.2), LAMP_HOLD_TARGET, 62.0, 0.0, 0.0),
    CameraBeat("lamp-hold-out", 64 / 240, (0.0, 1.7, -148.2), LAMP_HOLD_TARGET, 62.0, 0.0, 0.0),
    CameraBeat("oil-focus", 84 / 240, (-0.8, -0.2, -149.3), OIL_FOCUS_TARGET, 55.0, -0.04, 0.68),
    CameraBeat("mechanism-evidence", 108 / 240, (0.9, 0.0, -149.3), MECHANISM_FOCUS_TARGET, 54.0, 0.04, 0.68),
    CameraBeat("mercury-focus", 132 / 240, (1.1, -0.75, -154.7), MERCURY_FOCUS_TARGET, 56.0, -0.03, 0.64),
    CameraBeat("gallery-threshold", 146 / 240, (0.0, -0.65, -164.5), (0.0, -0.72, -169.3), 59.0, 0.02),
    CameraBeat("guards-evidence", 160 / 240, (-0.45, -0.72, -167.65), GUARDS_EVIDENCE_TARGET, 63.0, -0.04, 0.68),
    CameraBeat("mercury-evidence", 181 / 240, (0.45, -0.72, -175.75), MERCURY_EVIDENCE_TARGET, 63.0, 0.04, 0.68),
    CameraBeat("royal-hall-evidence", 204 / 240, (-0.65, -0.52, -185.95), ROYAL_HALL_EVIDENCE_TARGET, 63.0, -0.03, 0.58),
    CameraBeat("proof-wide", 222 / 240, (0.0, 1.9, -186.0), (0.0, -0.65, -191.2), 64.0, 0.0, 0.0),
    CameraBeat("pixel-iris", 231 / 240, (0.0, 1.0, -188.8), PIXEL_HANDOFF_TARGET, 60.0, 0.0, 0.46),
    CameraBeat("pixel-compression", 236 / 240, (0.0, -0.25, -190.9), PIXEL_HANDOFF_TARGET, 56.0, 0.0, 0.38),
    CameraBeat("pixel-handoff", 1.0, (0.0, -0.35, -191.85), PIXEL_HANDOFF_TARGET, 54.0, 0.0, 0.0),
)


def main():
    reset_scene()
    specs = (
        CameraSpec("vs08-10.buried.camera.desktop", "desktop", DESKTOP_BEATS),
        CameraSpec("vs08-10.buried.camera.mobile", "mobile", MOBILE_BEATS),
    )
    for spec in specs:
        write_curve(spec)
    print("Buried act authored camera curves complete.")


if __name__ == "__main__":
    main()
