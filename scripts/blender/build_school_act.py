"""Build the authored school passage for chapters 05-07.

Run with Blender 5.2+:
  blender --background --python-exit-code 1 --python scripts/blender/build_school_act.py

The scene is authored in Three.js coordinates and converted to Blender's Z-up
space at construction time. Blender's Y-up glTF export therefore lands at the
runtime coordinates without a wrapper transform.
"""

from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
ARTIFACT_DIR = ROOT / "artifacts" / "blender" / "school-act"
PUBLIC_DIR = ROOT / "public" / "assets" / "world" / "school-act"
RAW_GLB = ARTIFACT_DIR / "school-passage.raw.glb"
BLEND_FILE = ARTIFACT_DIR / "school-passage.blend"
ENTRY_PREVIEW = ARTIFACT_DIR / "school-passage-entry.png"
INTERIOR_PREVIEW = ARTIFACT_DIR / "school-passage-interior.png"

REQUIRED_NODES = (
    "VS05_07_School_ROOT",
    "ENV_School_GothicEntry",
    "ENV_School_Corridor",
    "ENV_School_Classroom",
    "ENV_School_Secretariat",
    "ENV_School_DescentThreshold",
    "PRP_Aegis_Phone",
    "PRP_Aegis_Scanner",
    "PRP_Aegis_Turnstile",
    "PRP_Aegis_TurnstilePivot",
    "PRP_Aegis_AuditTerminal",
    "PRP_SchoolMate_ClassroomScreen",
    "PRP_SchoolMate_SecretariatScreen",
    "PRP_SchoolMate_NoticeRail",
    "FX_Aegis_ScanPlane",
    "FX_Aegis_TransactionCore",
    "FX_SchoolMate_RequestThread",
    "ANC_School_Entry",
    "ANC_Aegis_PhoneFocus",
    "ANC_Aegis_ScannerFocus",
    "ANC_Aegis_Crossing",
    "ANC_SchoolMate_ClassroomFocus",
    "ANC_SchoolMate_SecretariatFocus",
    "ANC_School_HandoffDescent",
)

ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
PUBLIC_DIR.mkdir(parents=True, exist_ok=True)


def three_position(value: tuple[float, float, float]) -> tuple[float, float, float]:
    """Three.js (x, y, z) -> Blender (x, -z, y)."""
    x, y, z = value
    return (x, -z, y)


def three_dimensions(value: tuple[float, float, float]) -> tuple[float, float, float]:
    x, y, z = value
    return (x, z, y)


def hex_color(value: str, alpha: float = 1.0) -> tuple[float, float, float, float]:
    value = value.lstrip("#")
    return tuple(int(value[index:index + 2], 16) / 255 for index in (0, 2, 4)) + (alpha,)


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.materials,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for item in list(collection):
            collection.remove(item)


def make_material(
    name: str,
    color: str,
    roughness: float,
    metallic: float = 0.0,
    emission: str | None = None,
    emission_strength: float = 0.0,
    alpha: float = 1.0,
) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    material.diffuse_color = hex_color(color, alpha)
    material.metallic = metallic
    material.roughness = roughness
    material.use_backface_culling = alpha >= 1.0
    node = material.node_tree.nodes.get("Principled BSDF")
    if node:
        node.inputs["Base Color"].default_value = hex_color(color, alpha)
        node.inputs["Metallic"].default_value = metallic
        node.inputs["Roughness"].default_value = roughness
        node.inputs["Alpha"].default_value = alpha
        if emission and "Emission Color" in node.inputs:
            node.inputs["Emission Color"].default_value = hex_color(emission)
            node.inputs["Emission Strength"].default_value = emission_strength
    if alpha < 1.0:
        material.surface_render_method = "DITHERED"
        material.use_transparency_overlap = False
    return material


def create_empty(
    name: str,
    parent: bpy.types.Object | None = None,
    position: tuple[float, float, float] = (0.0, 0.0, 0.0),
) -> bpy.types.Object:
    obj = bpy.data.objects.new(name, None)
    obj.empty_display_type = "PLAIN_AXES"
    obj.empty_display_size = 0.35
    obj.location = three_position(position)
    if parent:
        obj.parent = parent
    bpy.context.collection.objects.link(obj)
    return obj


def assign_material(obj: bpy.types.Object, material: bpy.types.Material) -> None:
    obj.data.materials.append(material)


def apply_bevel(obj: bpy.types.Object, width: float, segments: int = 2) -> None:
    if width <= 0:
        return
    modifier = obj.modifiers.new("Authored edge profile", "BEVEL")
    modifier.width = width
    modifier.segments = segments
    modifier.limit_method = "ANGLE"
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=modifier.name)


def box(
    name: str,
    position: tuple[float, float, float],
    dimensions: tuple[float, float, float],
    material: bpy.types.Material,
    parent: bpy.types.Object,
    yaw: float = 0.0,
    bevel: float = 0.04,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=three_position(position))
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = three_dimensions(dimensions)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.rotation_euler[2] = yaw
    obj.parent = parent
    assign_material(obj, material)
    apply_bevel(obj, min(bevel, min(dimensions) * 0.22), 2)
    return obj


def linked_copy(
    source: bpy.types.Object,
    name: str,
    position: tuple[float, float, float],
    parent: bpy.types.Object,
    yaw: float = 0.0,
    scale: tuple[float, float, float] = (1.0, 1.0, 1.0),
) -> bpy.types.Object:
    obj = source.copy()
    obj.data = source.data
    obj.name = name
    obj.location = three_position(position)
    obj.rotation_euler[2] = yaw
    obj.scale = three_dimensions(scale)
    obj.parent = parent
    bpy.context.collection.objects.link(obj)
    return obj


def cylinder(
    name: str,
    position: tuple[float, float, float],
    radius: float,
    depth: float,
    material: bpy.types.Material,
    parent: bpy.types.Object,
    vertices: int = 16,
    axis: str = "y",
    bevel: float = 0.025,
) -> bpy.types.Object:
    rotation = (0.0, 0.0, 0.0)
    if axis == "z":
        rotation = (math.pi / 2, 0.0, 0.0)
    elif axis == "x":
        rotation = (0.0, math.pi / 2, 0.0)
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=depth,
        location=three_position(position),
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    obj.parent = parent
    assign_material(obj, material)
    apply_bevel(obj, bevel, 2)
    return obj


def sphere(
    name: str,
    position: tuple[float, float, float],
    radius: float,
    material: bpy.types.Material,
    parent: bpy.types.Object,
    scale: tuple[float, float, float] = (1.0, 1.0, 1.0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=radius, location=three_position(position))
    obj = bpy.context.object
    obj.name = name
    obj.scale = three_dimensions(scale)
    obj.parent = parent
    assign_material(obj, material)
    return obj


def curve_tube(
    name: str,
    points: list[tuple[float, float, float]],
    radius: float,
    material: bpy.types.Material,
    parent: bpy.types.Object,
    cyclic: bool = False,
) -> bpy.types.Object:
    curve = bpy.data.curves.new(f"{name}Mesh", "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 2
    curve.bevel_depth = radius
    curve.bevel_resolution = 2
    spline = curve.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for point, coordinate in zip(spline.points, points):
        converted = three_position(coordinate)
        point.co = (*converted, 1.0)
    spline.use_cyclic_u = cyclic
    obj = bpy.data.objects.new(name, curve)
    obj.parent = parent
    assign_material(obj, material)
    bpy.context.collection.objects.link(obj)
    return obj


def profile_prism(
    name: str,
    points_xy: list[tuple[float, float]],
    center_z: float,
    depth: float,
    material: bpy.types.Material,
    parent: bpy.types.Object,
    bevel: float = 0.025,
) -> bpy.types.Object:
    """Extrude an x/y silhouette through Three.js z."""
    count = len(points_xy)
    vertices_three = [(x, y, center_z - depth / 2) for x, y in points_xy]
    vertices_three += [(x, y, center_z + depth / 2) for x, y in points_xy]
    vertices = [three_position(vertex) for vertex in vertices_three]
    faces: list[tuple[int, ...]] = [tuple(reversed(range(count))), tuple(range(count, count * 2))]
    for index in range(count):
        next_index = (index + 1) % count
        faces.append((index, next_index, count + next_index, count + index))
    mesh = bpy.data.meshes.new(f"{name}Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    obj.parent = parent
    bpy.context.collection.objects.link(obj)
    assign_material(obj, material)
    apply_bevel(obj, bevel, 2)
    return obj


def arch_path(half_width: float, spring_y: float, rise: float, steps: int) -> list[tuple[float, float]]:
    left: list[tuple[float, float]] = []
    right: list[tuple[float, float]] = []
    for index in range(steps + 1):
        t = index / steps
        left.append((-half_width * (1.0 - t), spring_y + rise * (2.0 * t - t * t)))
        right.append((half_width * t, spring_y + rise * (1.0 - t * t)))
    return left + right[1:]


def pointed_arch_ring(
    name: str,
    center_z: float,
    spring_y: float,
    inner_half_width: float,
    outer_half_width: float,
    inner_rise: float,
    outer_rise: float,
    depth: float,
    material: bpy.types.Material,
    parent: bpy.types.Object,
    steps: int = 14,
) -> bpy.types.Object:
    inner = arch_path(inner_half_width, spring_y, inner_rise, steps)
    outer = arch_path(outer_half_width, spring_y, outer_rise, steps)
    count = len(inner)
    vertices_three: list[tuple[float, float, float]] = []
    for z in (center_z - depth / 2, center_z + depth / 2):
        vertices_three.extend((x, y, z) for x, y in inner)
        vertices_three.extend((x, y, z) for x, y in outer)
    vertices = [three_position(vertex) for vertex in vertices_three]
    front_inner, front_outer = 0, count
    back_inner, back_outer = count * 2, count * 3
    faces: list[tuple[int, int, int, int]] = []
    for index in range(count - 1):
        nxt = index + 1
        faces.extend((
            (front_inner + index, front_outer + index, front_outer + nxt, front_inner + nxt),
            (back_inner + index, back_inner + nxt, back_outer + nxt, back_outer + index),
            (front_outer + index, back_outer + index, back_outer + nxt, front_outer + nxt),
            (front_inner + index, front_inner + nxt, back_inner + nxt, back_inner + index),
        ))
    faces.extend((
        (front_inner, back_inner, back_outer, front_outer),
        (front_inner + count - 1, front_outer + count - 1, back_outer + count - 1, back_inner + count - 1),
    ))
    mesh = bpy.data.meshes.new(f"{name}Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    obj.parent = parent
    bpy.context.collection.objects.link(obj)
    assign_material(obj, material)
    apply_bevel(obj, 0.045, 2)
    return obj


def make_materials() -> dict[str, bpy.types.Material]:
    return {
        "stone_dark": make_material("School stone shadow", "#343833", 0.92),
        "stone": make_material("Carpathian limestone", "#79786d", 0.88),
        "stone_light": make_material("Worn limestone edge", "#aaa491", 0.82),
        "plaster": make_material("Lime plaster", "#b1ad9f", 0.94),
        "plaster_warm": make_material("Occupied plaster", "#c2b8a2", 0.91),
        "plaster_patch": make_material("Lime repair patch", "#8e9186", 0.96),
        "terrazzo": make_material("Worn civic terrazzo", "#696b64", 0.9),
        "tile_dark": make_material("Charcoal tile border", "#242a28", 0.86),
        "tile_light": make_material("Aged ceramic tile", "#9c9a8e", 0.9),
        "brass": make_material("Oxidized brass", "#776a43", 0.42, 0.72),
        "brass_edge": make_material("Handled brass", "#b29a59", 0.28, 0.82),
        "steel": make_material("Blackened gate steel", "#151b1b", 0.4, 0.78),
        "steel_worn": make_material("Worn black steel", "#303836", 0.48, 0.7),
        "oak": make_material("Dark civic oak", "#3f2d1e", 0.76, 0.02),
        "oak_light": make_material("Handled oak edge", "#77553a", 0.7, 0.02),
        "locker": make_material("Institutional green locker", "#455c57", 0.72, 0.2),
        "locker_alt": make_material("Faded green locker", "#58665e", 0.78, 0.14),
        "rubber": make_material("Scanner rubber", "#111515", 0.82),
        "glass": make_material("Smoked school glass", "#78918c", 0.22, 0.08, alpha=0.34),
        "frosted": make_material("Frosted office glass", "#a7b6ac", 0.48, alpha=0.46),
        "cyan": make_material("Aegis cyan signal", "#64d7d2", 0.22, 0.1, "#64e7e0", 6.0),
        "cyan_glass": make_material("Aegis scan glass", "#5acbc8", 0.18, 0.08, "#68e4de", 3.2, 0.32),
        "warm": make_material("Occupied school light", "#e1c583", 0.5, 0.0, "#efc879", 4.8),
        "white_line": make_material("Descent guide", "#cfd8d0", 0.3, 0.05, "#dce7df", 2.8),
        "paper": make_material("Warm school paper", "#d8cfb7", 0.96),
        "paper_blue": make_material("Notice paper blue", "#8ea7a2", 0.94),
        "paper_red": make_material("Notice paper red", "#9e6e62", 0.94),
        "chalk": make_material("Blackboard", "#1c2c29", 0.95),
        "textile": make_material("Student coat textile", "#26353b", 0.98),
        "skin": make_material("Student neutral skin", "#a67d61", 0.96),
        "hair": make_material("Student dark hair", "#171614", 0.96),
        "screen": make_material("Proxy screen neutral", "#102527", 0.32, 0.12, "#5fc9c5", 1.35),
    }


def add_bear_crest(parent: bpy.types.Object, materials: dict[str, bpy.types.Material]) -> None:
    shield = [(-1.3, 0.8), (-1.05, 2.05), (0.0, 2.6), (1.05, 2.05), (1.3, 0.8), (0.0, -0.75)]
    profile_prism("Entry bear crest shield", shield, -68.88, 0.18, materials["stone_dark"], parent, 0.06)
    profile_prism(
        "Entry bear crest brass field",
        [(x * 0.82, y * 0.82 + 0.28) for x, y in shield],
        -68.75,
        0.09,
        materials["brass"],
        parent,
        0.035,
    )
    sphere("Entry bear head", (0.0, 6.82, -68.66), 0.61, materials["stone_light"], parent, (1.0, 1.08, 0.44))
    sphere("Entry bear left ear", (-0.46, 7.26, -68.63), 0.27, materials["stone_light"], parent, (1.0, 1.0, 0.42))
    sphere("Entry bear right ear", (0.46, 7.26, -68.63), 0.27, materials["stone_light"], parent, (1.0, 1.0, 0.42))
    sphere("Entry bear muzzle", (0.0, 6.54, -68.51), 0.34, materials["plaster_warm"], parent, (1.05, 0.72, 0.3))
    sphere("Entry bear nose", (0.0, 6.65, -68.34), 0.11, materials["steel"], parent, (1.15, 0.72, 0.34))
    for side, label in ((-1, "left"), (1, "right")):
        sphere(f"Entry bear {label} eye", (side * 0.23, 6.92, -68.31), 0.055, materials["steel"], parent, (1.0, 1.0, 0.36))


def build_entry(root: bpy.types.Object, materials: dict[str, bpy.types.Material]) -> bpy.types.Object:
    entry = create_empty("ENV_School_GothicEntry", root)
    entry["chapter"] = "05-passage"

    box("Passage floor", (0.0, -0.16, -72.5), (12.8, 0.32, 17.0), materials["terrazzo"], entry, bevel=0.03)
    for index, z in enumerate((-64.5, -66.4, -68.2)):
        width = 5.2 + index * 0.65
        height = 7.4 + index * 0.24
        frame_material = materials["cyan"] if index == 0 else materials["brass"]
        box(f"Nexus mass frame {index + 1} left", (-width / 2, height / 2, z), (0.15 + index * 0.05, height, 0.18), frame_material, entry, bevel=0.04)
        box(f"Nexus mass frame {index + 1} right", (width / 2, height / 2, z), (0.15 + index * 0.05, height, 0.18), frame_material, entry, bevel=0.04)
        box(f"Nexus mass frame {index + 1} lintel", (0.0, height, z), (width, 0.16 + index * 0.05, 0.18), frame_material, entry, bevel=0.04)

    box("Entry left stone mass", (-4.7, 4.2, -70.0), (3.1, 8.4, 3.0), materials["stone"], entry, bevel=0.1)
    box("Entry right stone mass", (4.7, 4.2, -70.0), (3.1, 8.4, 3.0), materials["stone"], entry, bevel=0.1)
    box("Entry left inner pier", (-3.35, 2.25, -69.35), (1.15, 4.5, 1.65), materials["stone_light"], entry, bevel=0.075)
    box("Entry right inner pier", (3.35, 2.25, -69.35), (1.15, 4.5, 1.65), materials["stone_light"], entry, bevel=0.075)
    pointed_arch_ring("Entry limestone pointed arch", -69.35, 4.35, 2.82, 3.82, 2.68, 3.05, 1.62, materials["stone_light"], entry)
    pointed_arch_ring("Entry oxidized brass archivolt", -68.48, 4.42, 2.92, 3.15, 2.5, 2.69, 0.2, materials["brass"], entry, 18)
    box("Entry civic cornice", (0.0, 8.15, -69.5), (12.1, 0.52, 2.3), materials["plaster"], entry, bevel=0.09)
    box("Entry stone plinth left", (-4.6, 0.45, -68.8), (3.4, 0.9, 2.0), materials["stone_dark"], entry, bevel=0.06)
    box("Entry stone plinth right", (4.6, 0.45, -68.8), (3.4, 0.9, 2.0), materials["stone_dark"], entry, bevel=0.06)
    add_bear_crest(entry, materials)

    for side in (-1, 1):
        for course in range(5):
            y = 0.9 + course * 1.25
            offset = 0.18 if course % 2 == 0 else -0.15
            box(
                f"Entry {'left' if side < 0 else 'right'} masonry course {course + 1}",
                (side * (4.22 + offset), y, -68.38),
                (2.45, 0.12, 0.1),
                materials["stone_dark"],
                entry,
                bevel=0.015,
            )
    return entry


def build_corridor(root: bpy.types.Object, materials: dict[str, bpy.types.Material]) -> bpy.types.Object:
    corridor = create_empty("ENV_School_Corridor", root)
    corridor["chapter"] = "06-access"

    box("School corridor floor", (0.0, -0.18, -98.0), (12.4, 0.36, 39.0), materials["terrazzo"], corridor, bevel=0.03)
    box("Corridor ceiling spine", (0.0, 8.25, -98.0), (12.0, 0.3, 38.0), materials["plaster_patch"], corridor, bevel=0.04)
    box("Left wall entry run", (-6.0, 4.05, -87.3), (0.45, 8.1, 15.6), materials["plaster"], corridor, bevel=0.05)
    box("Left wall rear run", (-6.0, 4.05, -112.3), (0.45, 8.1, 8.0), materials["plaster_warm"], corridor, bevel=0.05)
    box("Right wall long run", (6.0, 4.05, -92.5), (0.45, 8.1, 25.0), materials["plaster"], corridor, bevel=0.05)
    box("Right wall descent run", (6.0, 4.05, -116.2), (0.45, 8.1, 5.6), materials["stone"], corridor, bevel=0.05)

    for side in (-1, 1):
        label = "left" if side < 0 else "right"
        box(f"Corridor {label} stone wainscot", (side * 5.73, 1.02, -97.8), (0.12, 2.04, 37.8), materials["stone_dark"], corridor, bevel=0.025)
        box(f"Corridor {label} handled oak rail", (side * 5.61, 2.18, -97.8), (0.1, 0.18, 37.8), materials["oak_light"], corridor, bevel=0.025)
        box(f"Corridor {label} tile border", (side * 4.93, 0.035, -97.8), (0.32, 0.08, 37.5), materials["tile_dark"], corridor, bevel=0.008)

    tile_source = box("Floor tile inset 01", (-4.35, 0.025, -80.2), (1.26, 0.05, 1.42), materials["tile_light"], corridor, bevel=0.015)
    tile_index = 1
    for row in range(25):
        for column in range(6):
            if row == 0 and column == 0:
                continue
            tile_index += 1
            linked_copy(tile_source, f"Floor tile inset {tile_index:02d}", (-4.35 + column * 1.73, 0.025, -80.2 - row * 1.42), corridor)

    for index, z in enumerate((-82.0, -87.0, -92.0, -97.0, -102.0, -107.0, -112.0)):
        box(f"Civic ceiling beam {index + 1}", (0.0, 7.88, z), (12.0, 0.38, 0.42), materials["oak"], corridor, bevel=0.05)
        box(f"Civic ceiling light housing {index + 1}", (0.9 if index % 2 else -0.8, 7.68, z - 0.12), (2.7, 0.16, 0.78), materials["steel_worn"], corridor, bevel=0.04)
        box(f"Civic ceiling light diffuser {index + 1}", (0.9 if index % 2 else -0.8, 7.55, z - 0.12), (2.35, 0.09, 0.56), materials["warm"], corridor, bevel=0.025)

    locker_source = box("Locker body 01", (-5.35, 1.55, -82.0), (1.02, 3.1, 0.72), materials["locker"], corridor, bevel=0.065)
    locker_door_source = box("Locker door 01", (-4.82, 1.55, -82.0), (0.06, 2.86, 0.62), materials["locker_alt"], corridor, bevel=0.025)
    vent_source = box("Locker vent 01-1", (-4.77, 2.42, -82.0), (0.035, 0.06, 0.32), materials["steel_worn"], corridor, bevel=0.008)
    for index in range(9):
        z = -82.0 - index * 0.84
        if index:
            linked_copy(locker_source, f"Locker body {index + 1:02d}", (-5.35, 1.55, z), corridor)
            linked_copy(locker_door_source, f"Locker door {index + 1:02d}", (-4.82, 1.55, z), corridor)
        for vent in range(3):
            if index == 0 and vent == 0:
                continue
            linked_copy(vent_source, f"Locker vent {index + 1:02d}-{vent + 1}", (-4.77, 2.42 - vent * 0.16, z), corridor)
        cylinder(f"Locker handle {index + 1:02d}", (-4.72, 1.55, z - 0.19), 0.045, 0.24, materials["brass_edge"], corridor, 10, "y", 0.008)

    rail = curve_tube("Corridor coat rail", [(5.54, 3.25, -81.0), (5.54, 3.25, -88.7)], 0.055, materials["steel_worn"], corridor)
    rail["shared_system"] = "coat-hooks"
    hook_source: bpy.types.Object | None = None
    for index in range(10):
        z = -81.2 - index * 0.78
        if hook_source is None:
            hook_source = cylinder("Coat hook 01", (5.36, 2.92, z), 0.055, 0.34, materials["brass"], corridor, 10, "x", 0.008)
        else:
            linked_copy(hook_source, f"Coat hook {index + 1:02d}", (5.36, 2.92, z), corridor)

    curve_tube("Radiator lower pipe", [(5.48, 0.42, -89.5), (5.48, 0.42, -102.2)], 0.075, materials["brass"], corridor)
    curve_tube("Radiator upper pipe", [(5.48, 0.74, -89.5), (5.48, 0.74, -102.2)], 0.055, materials["brass_edge"], corridor)
    radiator_frame = box("Radiator frame", (5.42, 1.12, -96.4), (0.28, 1.55, 4.5), materials["steel_worn"], corridor, bevel=0.04)
    fin_source = box("Radiator fin 01", (5.20, 1.12, -94.55), (0.16, 1.36, 0.12), materials["stone_light"], corridor, bevel=0.02)
    for index in range(24):
        if index == 0:
            continue
        linked_copy(fin_source, f"Radiator fin {index + 1:02d}", (5.20, 1.12, -94.55 - index * 0.16), corridor)
    radiator_frame["environment_detail"] = True

    for index, (x, y, z, sx, sy, sz) in enumerate((
        (-5.76, 4.8, -91.0, 0.04, 1.5, 2.8),
        (5.76, 5.4, -87.7, 0.04, 1.1, 2.1),
        (-5.76, 5.8, -112.8, 0.04, 1.3, 2.6),
        (5.76, 3.7, -102.4, 0.04, 0.8, 1.7),
    )):
        box(f"Worn plaster repair {index + 1}", (x, y, z), (sx, sy, sz), materials["plaster_patch"], corridor, bevel=0.02)
    return corridor


def build_aegis(root: bpy.types.Object, materials: dict[str, bpy.types.Material]) -> None:
    scanner = create_empty("PRP_Aegis_Scanner", root, (-0.25, 0.0, -77.6))
    scanner["runtime_role"] = "scan-reader"
    box("Aegis scanner plinth", (0.0, 0.78, 0.0), (0.58, 1.56, 0.66), materials["steel"], scanner, bevel=0.09)
    box("Aegis scanner brass shoulder", (0.0, 1.62, -0.02), (0.68, 0.18, 0.76), materials["brass"], scanner, bevel=0.06)
    box("Aegis scanner angled head", (0.0, 1.94, -0.12), (0.84, 0.48, 0.78), materials["rubber"], scanner, bevel=0.1)
    box("Aegis scanner glass", (0.0, 2.02, -0.535), (0.61, 0.25, 0.035), materials["cyan_glass"], scanner, bevel=0.025)
    cylinder("Aegis reader status ring", (0.0, 1.72, -0.53), 0.13, 0.045, materials["cyan"], scanner, 16, "z", 0.008)

    phone = create_empty("PRP_Aegis_Phone", root, (-1.30, 2.45, -76.85))
    phone["runtime_role"] = "phone-raise"
    phone["screen_slot"] = "aegis-phone"
    phone.rotation_euler = (math.radians(-7), math.radians(4), math.radians(-8))
    box("Aegis phone body", (0.0, 0.0, 0.0), (0.82, 1.62, 0.12), materials["steel"], phone, bevel=0.12)
    screen = box("Aegis phone screen proxy", (0.0, 0.0, -0.071), (0.70, 1.45, 0.022), materials["screen"], phone, bevel=0.07)
    screen["runtime_texture_slot"] = "aegis-phone"
    box("Aegis phone token field", (0.0, 0.05, -0.087), (0.51, 0.51, 0.008), materials["cyan"], phone, bevel=0.025)

    student = create_empty("CHR_Student_Waiting", root, (-2.25, 0.0, -76.25))
    student["character_treatment"] = "anonymous-editorial"
    box("Student torso", (0.0, 2.15, 0.0), (1.25, 2.2, 0.7), materials["textile"], student, bevel=0.28)
    sphere("Student head", (0.0, 3.72, -0.04), 0.57, materials["skin"], student, (0.86, 1.04, 0.9))
    sphere("Student hair", (0.0, 3.98, -0.07), 0.54, materials["hair"], student, (0.9, 0.66, 0.93))
    for side, label in ((-1, "left"), (1, "right")):
        box(f"Student {label} leg", (side * 0.32, 0.85, 0.02), (0.42, 1.7, 0.48), materials["steel_worn"], student, bevel=0.18)
        box(f"Student {label} shoe", (side * 0.32, 0.16, -0.22), (0.48, 0.3, 0.82), materials["rubber"], student, bevel=0.14)
    box("Student backpack", (-0.72, 2.3, 0.13), (0.55, 1.5, 0.72), materials["oak"], student, bevel=0.2)
    box("Student phone arm", (0.70, 2.62, -0.08), (0.34, 1.32, 0.38), materials["textile"], student, yaw=-0.18, bevel=0.16)

    turnstile = create_empty("PRP_Aegis_Turnstile", root, (1.35, 0.0, -78.2))
    turnstile["runtime_role"] = "access-gate"
    cylinder("Turnstile floor socket", (0.0, 0.10, 0.0), 0.56, 0.20, materials["steel"], turnstile, 20, "y", 0.04)
    cylinder("Turnstile central post", (0.0, 1.26, 0.0), 0.27, 2.32, materials["steel_worn"], turnstile, 16, "y", 0.035)
    cylinder("Turnstile brass collar", (0.0, 1.22, 0.0), 0.39, 0.24, materials["brass"], turnstile, 18, "y", 0.025)
    pivot = create_empty("PRP_Aegis_TurnstilePivot", turnstile, (0.0, 1.24, 0.0))
    pivot["runtime_animation"] = "rotation.y"
    pivot["closed_rotation"] = 0.0
    pivot["open_rotation"] = 1.0472
    hub = cylinder("Turnstile pivot hub", (0.0, 0.0, 0.0), 0.34, 0.34, materials["brass_edge"], pivot, 18, "y", 0.025)
    hub["mechanical_pivot"] = True
    for index in range(3):
        angle = index * math.tau / 3
        x = math.cos(angle) * 0.95
        z = math.sin(angle) * 0.95
        arm = cylinder(f"Turnstile arm {index + 1}", (x, 0.0, z), 0.075, 1.9, materials["steel_worn"], pivot, 12, "x", 0.015)
        arm.rotation_euler[2] = -angle
        sphere(f"Turnstile arm cap {index + 1}", (x * 1.92, 0.0, z * 1.92), 0.11, materials["brass_edge"], pivot)

    terminal = create_empty("PRP_Aegis_AuditTerminal", root, (4.95, 2.75, -80.8))
    terminal["screen_slot"] = "aegis-gate-audit"
    terminal.rotation_euler[2] = -math.pi / 2
    box("Audit terminal wall bracket", (-0.12, 0.0, 0.0), (0.20, 2.2, 2.85), materials["steel"], terminal, bevel=0.08)
    audit_screen = box("Audit terminal screen proxy", (-0.24, 0.10, 0.0), (0.06, 1.65, 2.35), materials["screen"], terminal, bevel=0.06)
    audit_screen["runtime_texture_slot"] = "aegis-gate-audit"
    box("Audit terminal allow strip", (-0.28, -0.63, 0.0), (0.025, 0.11, 1.94), materials["cyan"], terminal, bevel=0.008)

    scan = create_empty("FX_Aegis_ScanPlane", root, (-0.72, 2.15, -77.25))
    scan["runtime_animation"] = "visibility-and-travel"
    box("Aegis scan volume", (0.0, 0.0, 0.0), (1.85, 2.45, 0.035), materials["cyan_glass"], scan, bevel=0.025)
    for index in range(4):
        box(f"Aegis scan line {index + 1}", (-0.68 + index * 0.46, 0.0, -0.028), (0.025, 2.1, 0.012), materials["cyan"], scan, bevel=0.004)

    transaction = create_empty("FX_Aegis_TransactionCore", root)
    transaction["runtime_animation"] = "five-stage-canonical-progress"
    chamber_z = (-80.6, -82.3, -84.0, -85.7, -87.4)
    labels = ("issue", "present", "gate-role", "atomic-redeem", "audit")
    for index, (z, label) in enumerate(zip(chamber_z, labels)):
        cylinder(f"Transaction chamber {index + 1}", (3.72, 0.45, z), 0.32, 0.32, materials["brass"], transaction, 14, "z", 0.025)
        cylinder(f"Transaction contact {index + 1}", (3.72, 0.45, z - 0.02), 0.15, 0.37, materials["cyan"], transaction, 12, "z", 0.012)
        box(f"Transaction bed {index + 1}", (3.72, 0.16, z), (0.82, 0.18, 0.8), materials["steel"], transaction, bevel=0.04)
        transaction[f"stage_{index + 1}"] = label
    curve_tube("Aegis transaction conduit", [(3.72, 0.45, z) for z in chamber_z], 0.055, materials["brass_edge"], transaction)
    curve_tube("Aegis floor continuation", [(3.72, 0.09, -87.4), (3.72, 0.09, -92.0), (2.2, 0.09, -96.0), (2.2, 0.09, -103.5)], 0.07, materials["brass"], transaction)


def make_desk_module(parent: bpy.types.Object, materials: dict[str, bpy.types.Material]) -> tuple[bpy.types.Object, list[bpy.types.Object]]:
    top = box("Classroom desk top 01", (-10.0, 1.36, -97.4), (2.25, 0.16, 1.05), materials["oak_light"], parent, bevel=0.06)
    parts: list[bpy.types.Object] = []
    for side in (-1, 1):
        parts.append(box(f"Classroom desk leg 01 {'L' if side < 0 else 'R'}", (-10.0 + side * 0.82, 0.67, -97.4), (0.12, 1.3, 0.78), materials["steel_worn"], parent, bevel=0.025))
    return top, parts


def build_classroom(root: bpy.types.Object, materials: dict[str, bpy.types.Material]) -> None:
    classroom = create_empty("ENV_School_Classroom", root)
    classroom["chapter"] = "07-schoolmate"
    box("Classroom floor", (-10.3, -0.16, -101.2), (8.4, 0.32, 14.6), materials["oak"], classroom, bevel=0.035)
    box("Classroom far wall", (-14.5, 4.0, -101.2), (0.36, 8.0, 14.6), materials["plaster_warm"], classroom, bevel=0.05)
    box("Classroom front wall", (-10.3, 4.0, -108.3), (8.4, 8.0, 0.35), materials["plaster"], classroom, bevel=0.05)
    box("Classroom rear wall", (-10.3, 4.0, -94.0), (8.4, 8.0, 0.35), materials["plaster"], classroom, bevel=0.05)
    box("Classroom corridor lintel", (-6.05, 7.35, -101.0), (0.45, 1.3, 14.0), materials["oak"], classroom, bevel=0.05)
    for index, z in enumerate((-95.5, -99.2, -102.9, -106.6)):
        box(f"Classroom corridor mullion {index + 1}", (-6.15, 3.72, z), (0.25, 7.2, 0.26), materials["oak_light"], classroom, bevel=0.035)
        box(f"Classroom corridor glass {index + 1}", (-6.17, 4.1, z - 1.72), (0.08, 5.6, 3.25), materials["glass"], classroom, bevel=0.02)
    box("Classroom blackboard", (-14.28, 3.65, -101.6), (0.08, 2.65, 5.6), materials["chalk"], classroom, bevel=0.07)
    box("Classroom chalk rail", (-14.12, 2.18, -101.6), (0.22, 0.12, 5.9), materials["oak_light"], classroom, bevel=0.025)
    for index in range(5):
        box(f"Blackboard chalk trace {index + 1}", (-14.20, 4.3 - index * 0.35, -102.8 + index * 0.55), (0.025, 0.035, 2.4 - index * 0.25), materials["paper"], classroom, bevel=0.005)

    desk_top, desk_legs = make_desk_module(classroom, materials)
    desk_positions = [
        (-9.8, -97.0), (-12.2, -97.0),
        (-9.8, -100.0), (-12.2, -100.0),
        (-9.8, -103.0), (-12.2, -103.0),
        (-9.8, -106.0), (-12.2, -106.0),
    ]
    for index, (x, z) in enumerate(desk_positions):
        if index == 0:
            continue
        linked_copy(desk_top, f"Classroom desk top {index + 1:02d}", (x, 1.36, z), classroom)
        for leg_index, source in enumerate(desk_legs):
            side = -1 if leg_index == 0 else 1
            linked_copy(source, f"Classroom desk leg {index + 1:02d}-{'L' if side < 0 else 'R'}", (x + side * 0.82, 0.67, z), classroom)
    paper_source = box("Classroom paper 01", (-9.9, 1.48, -97.1), (0.72, 0.025, 0.9), materials["paper"], classroom, yaw=0.08, bevel=0.01)
    book_source = box("Classroom book 01", (-12.25, 1.53, -96.9), (0.58, 0.12, 0.82), materials["paper_red"], classroom, yaw=-0.06, bevel=0.025)
    for index, (x, z) in enumerate(desk_positions[1:], start=2):
        linked_copy(paper_source, f"Classroom paper {index:02d}", (x - 0.18, 1.48, z + 0.1), classroom, yaw=(index % 3 - 1) * 0.07)
        if index % 2 == 0:
            linked_copy(book_source, f"Classroom book {index:02d}", (x + 0.32, 1.53, z - 0.12), classroom, yaw=-0.04 * index)

    screen = create_empty("PRP_SchoolMate_ClassroomScreen", root, (-14.15, 4.25, -105.2))
    screen["runtime_texture_slot"] = "schoolmate-classroom"
    screen.rotation_euler[2] = -math.pi / 2
    box("Classroom screen case", (0.0, 0.0, 0.0), (0.18, 2.55, 3.55), materials["steel"], screen, bevel=0.08)
    display = box("Classroom screen proxy", (-0.11, 0.0, 0.0), (0.035, 2.28, 3.25), materials["screen"], screen, bevel=0.04)
    display["runtime_texture_slot"] = "schoolmate-classroom"
    box("Classroom screen request marker", (-0.14, -0.75, -0.9), (0.02, 0.12, 1.08), materials["warm"], screen, bevel=0.008)


def build_notice_rail(root: bpy.types.Object, materials: dict[str, bpy.types.Material]) -> None:
    notice = create_empty("PRP_SchoolMate_NoticeRail", root, (5.67, 3.55, -101.0))
    notice["runtime_role"] = "workflow-consequence"
    notice.rotation_euler[2] = math.pi / 2
    box("SchoolMate notice backing", (0.0, 0.0, 0.0), (0.18, 2.85, 7.8), materials["oak"], notice, bevel=0.06)
    box("SchoolMate notice cork", (-0.11, 0.0, 0.0), (0.04, 2.55, 7.35), materials["plaster_warm"], notice, bevel=0.03)
    paper_specs = (
        (-2.7, 0.62, 1.35, 1.05, "paper"),
        (-1.2, -0.45, 1.1, 1.4, "paper_blue"),
        (0.25, 0.48, 1.4, 1.1, "paper"),
        (1.85, -0.25, 1.25, 1.55, "paper_red"),
        (3.05, 0.55, 0.75, 1.0, "paper"),
    )
    for index, (z, y, width, height, material_key) in enumerate(paper_specs):
        box(f"Notice paper {index + 1}", (-0.145, y, z), (0.018, height, width), materials[material_key], notice, yaw=(index - 2) * 0.015, bevel=0.018)
        cylinder(f"Notice pin {index + 1}", (-0.17, y + height * 0.35, z), 0.045, 0.03, materials["brass_edge"], notice, 10, "x", 0.006)


def build_secretariat(root: bpy.types.Object, materials: dict[str, bpy.types.Material]) -> None:
    office = create_empty("ENV_School_Secretariat", root)
    office["chapter"] = "07-schoolmate"
    box("Secretariat floor", (10.1, -0.16, -109.5), (7.8, 0.32, 11.0), materials["oak"], office, bevel=0.035)
    box("Secretariat far wall", (13.9, 4.0, -109.5), (0.36, 8.0, 11.0), materials["plaster_warm"], office, bevel=0.05)
    box("Secretariat rear wall", (10.1, 4.0, -115.0), (7.8, 8.0, 0.35), materials["plaster"], office, bevel=0.05)
    box("Secretariat corridor lintel", (6.1, 7.35, -109.5), (0.45, 1.3, 10.6), materials["oak"], office, bevel=0.05)
    for index, z in enumerate((-105.2, -108.1, -111.0, -113.9)):
        box(f"Secretariat glass mullion {index + 1}", (6.16, 3.72, z), (0.25, 7.2, 0.24), materials["oak_light"], office, bevel=0.035)
        if index < 3:
            box(f"Secretariat frosted glass {index + 1}", (6.17, 4.05, z - 1.35), (0.08, 5.6, 2.55), materials["frosted"], office, bevel=0.02)

    desk_top = box("Secretariat desk top", (10.1, 1.32, -109.3), (5.1, 0.2, 1.65), materials["oak_light"], office, bevel=0.08)
    for side in (-1, 1):
        box(f"Secretariat desk pedestal {'L' if side < 0 else 'R'}", (10.1 + side * 2.05, 0.65, -109.3), (0.72, 1.3, 1.38), materials["steel_worn"], office, bevel=0.06)
    desk_top["occupied_surface"] = True
    filing_source = box("Secretariat filing cabinet 01", (13.2, 1.35, -105.4), (1.2, 2.7, 1.35), materials["locker_alt"], office, bevel=0.08)
    drawer_source = box("Secretariat drawer 01-1", (12.58, 1.85, -105.4), (0.06, 0.52, 1.08), materials["locker"], office, bevel=0.025)
    for cabinet in range(3):
        z = -105.4 - cabinet * 1.5
        if cabinet:
            linked_copy(filing_source, f"Secretariat filing cabinet {cabinet + 1:02d}", (13.2, 1.35, z), office)
        for drawer in range(4):
            if cabinet == 0 and drawer == 0:
                continue
            linked_copy(drawer_source, f"Secretariat drawer {cabinet + 1:02d}-{drawer + 1}", (12.58, 1.85 - drawer * 0.58, z), office)
            box(f"Secretariat drawer label {cabinet + 1:02d}-{drawer + 1}", (12.53, 1.85 - drawer * 0.58, z), (0.025, 0.13, 0.38), materials["paper"], office, bevel=0.008)

    for index in range(8):
        box(
            f"Secretariat document stack {index + 1}",
            (8.4 + (index % 4) * 0.42, 1.5 + (index // 4) * 0.06, -109.2 + (index % 2) * 0.22),
            (0.36, 0.045, 0.58),
            materials["paper_blue"] if index % 3 == 0 else materials["paper"],
            office,
            yaw=(index - 3) * 0.018,
            bevel=0.008,
        )

    screen = create_empty("PRP_SchoolMate_SecretariatScreen", root, (10.55, 2.72, -109.2))
    screen["runtime_texture_slot"] = "schoolmate-secretariat"
    screen.rotation_euler[2] = math.pi
    box("Secretariat monitor case", (0.0, 0.0, 0.0), (3.35, 2.15, 0.18), materials["steel"], screen, bevel=0.09)
    display = box("Secretariat screen proxy", (0.0, 0.0, 0.11), (3.08, 1.88, 0.035), materials["screen"], screen, bevel=0.045)
    display["runtime_texture_slot"] = "schoolmate-secretariat"
    box("Secretariat resolved marker", (-1.15, -0.65, 0.14), (0.62, 0.12, 0.02), materials["warm"], screen, bevel=0.008)
    cylinder("Secretariat monitor stem", (0.0, -1.48, 0.0), 0.12, 0.92, materials["steel_worn"], screen, 12, "y", 0.018)
    box("Secretariat monitor foot", (0.0, -1.93, 0.0), (1.35, 0.12, 0.68), materials["steel_worn"], screen, bevel=0.06)


def build_schoolmate_thread(root: bpy.types.Object, materials: dict[str, bpy.types.Material]) -> None:
    thread = create_empty("FX_SchoolMate_RequestThread", root)
    thread["runtime_animation"] = "canonical-request-progress"
    thread["project"] = "SchoolMate"
    points = [
        (-13.9, 2.25, -105.2),
        (-10.0, 2.18, -105.2),
        (-6.0, 2.18, -105.2),
        (-3.5, 0.10, -106.0),
        (2.3, 0.10, -106.0),
        (5.65, 2.9, -104.0),
        (5.65, 2.9, -110.0),
        (10.55, 2.72, -109.2),
    ]
    curve_tube("SchoolMate request conduit", points, 0.06, materials["brass_edge"], thread)
    packet = profile_prism(
        "SchoolMate request packet",
        [(-0.34, 0.0), (0.0, 0.22), (0.34, 0.0), (0.0, -0.22)],
        -105.12,
        0.08,
        materials["warm"],
        thread,
        0.025,
    )
    packet.location = three_position((-8.0, 2.24, 0.0))
    packet["runtime_role"] = "request-packet"


def build_descent(root: bpy.types.Object, materials: dict[str, bpy.types.Material]) -> None:
    descent = create_empty("ENV_School_DescentThreshold", root)
    descent["handoff"] = "08-buried-hands"
    box("Descent left stone wall", (-4.35, 3.5, -119.2), (3.3, 7.0, 3.8), materials["stone_dark"], descent, bevel=0.09)
    box("Descent right stone wall", (4.35, 3.5, -119.2), (3.3, 7.0, 3.8), materials["stone_dark"], descent, bevel=0.09)
    box("Descent left pier", (-2.92, 2.15, -117.8), (0.85, 4.3, 1.25), materials["stone_light"], descent, bevel=0.07)
    box("Descent right pier", (2.92, 2.15, -117.8), (0.85, 4.3, 1.25), materials["stone_light"], descent, bevel=0.07)
    pointed_arch_ring("Descent pointed threshold", -117.8, 4.18, 2.53, 3.38, 2.35, 2.72, 1.2, materials["stone_light"], descent)
    box("Descent shadow chamber", (0.0, 2.65, -120.3), (5.3, 5.3, 4.2), materials["stone_dark"], descent, bevel=0.06)
    for index in range(7):
        z = -118.6 - index * 0.68
        y = -0.06 - index * 0.31
        box(f"Descent stair {index + 1}", (0.0, y, z), (5.05, 0.28, 0.9), materials["stone"], descent, bevel=0.035)
    curve_tube("Descent left handrail", [(-2.2, 1.0, -118.4), (-2.2, 0.2, -120.5), (-2.2, -1.5, -123.0)], 0.075, materials["brass"], descent)
    curve_tube("Descent guide line", [(0.0, 0.08, -114.0), (0.0, 0.08, -118.8), (0.0, -1.75, -123.0)], 0.07, materials["white_line"], descent)


def add_anchors(root: bpy.types.Object) -> None:
    anchors = {
        "ANC_School_Entry": (0.0, 2.8, -68.0),
        "ANC_Aegis_PhoneFocus": (-1.3, 2.45, -76.85),
        "ANC_Aegis_ScannerFocus": (-0.25, 1.8, -77.6),
        "ANC_Aegis_Crossing": (1.2, 1.35, -80.6),
        "ANC_SchoolMate_ClassroomFocus": (-10.8, 2.8, -101.5),
        "ANC_SchoolMate_SecretariatFocus": (10.3, 2.8, -109.4),
        "ANC_School_HandoffDescent": (0.0, 1.0, -120.8),
    }
    for name, position in anchors.items():
        anchor = create_empty(name, root, position)
        anchor["interaction_anchor"] = True


def add_lighting() -> None:
    world = bpy.context.scene.world
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    if background:
        background.inputs["Color"].default_value = hex_color("#0b1515")
        background.inputs["Strength"].default_value = 0.16

    def area(name: str, position: tuple[float, float, float], target: tuple[float, float, float], color: str, energy: float, size: float) -> None:
        data = bpy.data.lights.new(name, "AREA")
        data.color = hex_color(color)[:3]
        data.energy = energy
        data.shape = "DISK"
        data.size = size
        obj = bpy.data.objects.new(name, data)
        obj.location = three_position(position)
        look_at(obj, target)
        bpy.context.collection.objects.link(obj)

    area("Cold entry fill", (10.0, 10.0, -58.0), (0.0, 3.0, -73.0), "#8eb7b4", 1500, 9.0)
    area("Warm corridor occupation", (-3.0, 7.0, -93.0), (0.0, 2.0, -101.0), "#e0bf7a", 1250, 7.0)
    area("Classroom daylight", (-14.0, 6.0, -98.0), (-8.0, 2.0, -102.0), "#b9d0c8", 1100, 5.0)
    area("Secretariat practical", (13.0, 6.0, -107.0), (8.0, 2.0, -109.0), "#e3c887", 950, 4.5)


def look_at(obj: bpy.types.Object, target: tuple[float, float, float]) -> None:
    direction = Vector(three_position(target)) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def render_preview(name: str, position: tuple[float, float, float], target: tuple[float, float, float], filepath: Path, lens: float) -> None:
    data = bpy.data.cameras.new(name)
    data.lens = lens
    data.sensor_width = 36
    camera = bpy.data.objects.new(name, data)
    camera.location = three_position(position)
    look_at(camera, target)
    bpy.context.collection.objects.link(camera)
    bpy.context.scene.camera = camera
    bpy.context.scene.render.filepath = str(filepath)
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(camera, do_unlink=True)
    bpy.data.cameras.remove(data)


def configure_scene() -> None:
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1600
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.image_settings.color_depth = "8"
    scene.render.film_transparent = False
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.view_settings.exposure = 0.48


def validate_required_nodes() -> None:
    for name in REQUIRED_NODES:
        matches = [obj for obj in bpy.data.objects if obj.name == name]
        if len(matches) != 1:
            raise RuntimeError(f"Required node {name!r} exists {len(matches)} times")
    root = bpy.data.objects["VS05_07_School_ROOT"]
    if tuple(round(value, 6) for value in root.location) != (0.0, 0.0, 0.0):
        raise RuntimeError("VS05_07_School_ROOT must keep an identity translation")
    if tuple(round(value, 6) for value in root.rotation_euler) != (0.0, 0.0, 0.0):
        raise RuntimeError("VS05_07_School_ROOT must keep an identity rotation")
    if tuple(round(value, 6) for value in root.scale) != (1.0, 1.0, 1.0):
        raise RuntimeError("VS05_07_School_ROOT must keep an identity scale")


def mesh_statistics() -> tuple[int, int, int]:
    mesh_objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    unique_meshes = {obj.data for obj in mesh_objects}
    triangle_instances = 0
    for obj in mesh_objects:
        triangle_instances += sum(max(0, len(polygon.vertices) - 2) for polygon in obj.data.polygons)
    return len(mesh_objects), len(unique_meshes), triangle_instances


def join_meshes_by_material(
    objects: list[bpy.types.Object],
    parent: bpy.types.Object,
    prefix: str,
) -> None:
    buckets: dict[str, list[bpy.types.Object]] = {}
    for child in objects:
        if child.type != "MESH" or len(child.data.materials) != 1:
            continue
        material = child.data.materials[0]
        if not material:
            continue
        buckets.setdefault(material.name, []).append(child)

    for material_name, objects in buckets.items():
        if len(objects) < 2:
            continue
        bpy.ops.object.select_all(action="DESELECT")
        for obj in objects:
            obj.select_set(True)
        active = objects[0]
        bpy.context.view_layer.objects.active = active
        bpy.ops.object.join()
        active.parent = parent
        active.name = f"EXPORT_{prefix}_{material_name}"[:63]


def join_direct_meshes_by_material(parent: bpy.types.Object) -> None:
    join_meshes_by_material(
        [child for child in parent.children if child.type == "MESH"],
        parent,
        parent.name,
    )


def convert_to_mesh(obj: bpy.types.Object) -> bpy.types.Object:
    if obj.type == "MESH":
        return obj
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.convert(target="MESH")
    return bpy.context.object


def join_named_prefix(parent: bpy.types.Object, prefix: str, output_name: str) -> None:
    objects = [
        child for child in parent.children
        if child.type == "MESH" and child.name.startswith(prefix)
    ]
    if len(objects) < 2:
        return
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    active = objects[0]
    bpy.context.view_layer.objects.active = active
    bpy.ops.object.join()
    active.name = output_name


def prepare_runtime_export() -> None:
    # The authored .blend keeps the individual modules. Only the web delivery is
    # collapsed, and only within static or single-transform groups.
    environment_groups = (
        "ENV_School_GothicEntry",
        "ENV_School_Corridor",
        "ENV_School_Classroom",
        "ENV_School_Secretariat",
        "ENV_School_DescentThreshold",
    )
    root = bpy.data.objects["VS05_07_School_ROOT"]
    static_group = create_empty("EXPORT_School_StaticEnvironment", root)
    static_group["runtime_role"] = "static-environment"
    static_meshes: list[bpy.types.Object] = []
    for name in environment_groups:
        environment = bpy.data.objects[name]
        environment["export_geometry_group"] = static_group.name
        for child in list(environment.children):
            if child.type not in {"MESH", "CURVE"}:
                continue
            mesh = convert_to_mesh(child)
            world_matrix = mesh.matrix_world.copy()
            mesh.parent = static_group
            mesh.matrix_world = world_matrix
            static_meshes.append(mesh)
    join_meshes_by_material(static_meshes, static_group, "School_Static")

    for name in (
        "CHR_Student_Waiting",
        "PRP_Aegis_TurnstilePivot",
        "PRP_SchoolMate_NoticeRail",
        "PRP_SchoolMate_SecretariatScreen",
        "FX_Aegis_ScanPlane",
    ):
        join_direct_meshes_by_material(bpy.data.objects[name])

    # Shells and beds never animate independently. The five cyan contacts keep
    # their individual names for the canonical sequential transaction.
    transaction = bpy.data.objects["FX_Aegis_TransactionCore"]
    join_named_prefix(transaction, "Transaction chamber", "EXPORT_Transaction_Chambers")
    join_named_prefix(transaction, "Transaction bed", "EXPORT_Transaction_Beds")

    # The delivery currently uses material factors only. UVs would add memory
    # and validator noise without enabling any visual feature.
    for mesh in bpy.data.meshes:
        while mesh.uv_layers:
            mesh.uv_layers.remove(mesh.uv_layers[0])


def export_scene() -> None:
    validate_required_nodes()
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_FILE))
    prepare_runtime_export()
    validate_required_nodes()
    bpy.ops.export_scene.gltf(
        filepath=str(RAW_GLB),
        export_format="GLB",
        export_yup=True,
        export_apply=True,
        export_attributes=True,
        export_tangents=False,
        export_materials="EXPORT",
        export_extras=True,
        export_cameras=False,
        export_lights=False,
        export_animations=False,
    )


def main() -> None:
    clear_scene()
    materials = make_materials()
    root = create_empty("VS05_07_School_ROOT")
    root["asset_contract"] = "05-07-v1"
    root["runtime_coordinates"] = "threejs-x-y-z"

    build_entry(root, materials)
    build_corridor(root, materials)
    build_aegis(root, materials)
    build_classroom(root, materials)
    build_notice_rail(root, materials)
    build_secretariat(root, materials)
    build_schoolmate_thread(root, materials)
    build_descent(root, materials)
    add_anchors(root)
    add_lighting()
    configure_scene()
    validate_required_nodes()

    render_preview("School passage entry camera", (0.0, 4.0, -56.5), (0.0, 3.35, -75.5), ENTRY_PREVIEW, 44.0)
    render_preview("School passage interior camera", (-0.2, 4.2, -84.0), (0.8, 2.5, -106.0), INTERIOR_PREVIEW, 39.0)
    export_scene()

    objects, meshes, triangles = mesh_statistics()
    print(f"Built {RAW_GLB}")
    print(f"Saved {BLEND_FILE}")
    print(f"Mesh objects: {objects}; unique meshes: {meshes}; instanced triangles: {triangles}")


if __name__ == "__main__":
    main()
