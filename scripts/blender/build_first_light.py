"""Build the First Light architectural kit and its static poster.

Run with:
  blender --background --python scripts/blender/build_first_light.py

The script is intentionally deterministic so the web asset can be rebuilt and
reviewed without depending on a local .blend file or manual export settings.
"""

from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
WORLD_DIR = ROOT / "public" / "assets" / "world"
SOURCE_DIR = ROOT / "artifacts" / "blender"
RAW_GLB = WORLD_DIR / "first-light-citadel.raw.glb"
POSTER = WORLD_DIR / "first-light-poster.png"
BLEND_FILE = SOURCE_DIR / "first-light-citadel.blend"

WORLD_DIR.mkdir(parents=True, exist_ok=True)
SOURCE_DIR.mkdir(parents=True, exist_ok=True)


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for data_collection in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.materials,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for item in list(data_collection):
            data_collection.remove(item)


def hex_color(value: str) -> tuple[float, float, float, float]:
    value = value.lstrip("#")
    return tuple(int(value[index:index + 2], 16) / 255 for index in (0, 2, 4)) + (1.0,)


def make_material(
    name: str,
    color: str,
    roughness: float,
    metallic: float = 0.0,
    emission: str | None = None,
    emission_strength: float = 0.0,
) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    material.diffuse_color = hex_color(color)
    node = material.node_tree.nodes.get("Principled BSDF")
    if node:
        node.inputs["Base Color"].default_value = hex_color(color)
        node.inputs["Roughness"].default_value = roughness
        node.inputs["Metallic"].default_value = metallic
        if emission and "Emission Color" in node.inputs:
            node.inputs["Emission Color"].default_value = hex_color(emission)
            node.inputs["Emission Strength"].default_value = emission_strength
    return material


def assign_material(obj: bpy.types.Object, material: bpy.types.Material) -> None:
    obj.data.materials.append(material)


def bevel_object(obj: bpy.types.Object, width: float = 0.08, segments: int = 2) -> None:
    modifier = obj.modifiers.new(name="Soft mineral edges", type="BEVEL")
    modifier.width = width
    modifier.segments = segments
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=modifier.name)


def cube(
    name: str,
    location: tuple[float, float, float],
    dimensions: tuple[float, float, float],
    material: bpy.types.Material,
    rotation_z: float = 0.0,
    bevel: float = 0.06,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=(0.0, 0.0, rotation_z))
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel > 0:
        bevel_object(obj, min(bevel, min(dimensions) * 0.22), 2)
    assign_material(obj, material)
    return obj


def cylinder(
    name: str,
    location: tuple[float, float, float],
    radius: float,
    depth: float,
    vertices: int,
    material: bpy.types.Material,
    bevel: float = 0.05,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location)
    obj = bpy.context.object
    obj.name = name
    if bevel > 0:
        bevel_object(obj, bevel, 2)
    assign_material(obj, material)
    return obj


def cone(
    name: str,
    location: tuple[float, float, float],
    radius: float,
    depth: float,
    vertices: int,
    material: bpy.types.Material,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius, radius2=0.16, depth=depth, location=location)
    obj = bpy.context.object
    obj.name = name
    assign_material(obj, material)
    return obj


def annular_segment(
    name: str,
    inner_radius: float,
    outer_radius: float,
    start_angle: float,
    end_angle: float,
    base_z: float,
    height: float,
    material: bpy.types.Material,
    steps: int = 3,
) -> bpy.types.Object:
    vertices: list[tuple[float, float, float]] = []
    faces: list[tuple[int, int, int, int]] = []
    for level in (base_z, base_z + height):
        for radius in (inner_radius, outer_radius):
            for step in range(steps + 1):
                angle = start_angle + (end_angle - start_angle) * step / steps
                vertices.append((math.cos(angle) * radius, math.sin(angle) * radius, level))

    row = steps + 1
    bottom_inner = 0
    bottom_outer = row
    top_inner = row * 2
    top_outer = row * 3
    for step in range(steps):
        next_step = step + 1
        faces.extend(
            [
                (bottom_inner + step, bottom_inner + next_step, bottom_outer + next_step, bottom_outer + step),
                (top_inner + step, top_outer + step, top_outer + next_step, top_inner + next_step),
                (bottom_outer + step, bottom_outer + next_step, top_outer + next_step, top_outer + step),
                (bottom_inner + step, top_inner + step, top_inner + next_step, bottom_inner + next_step),
            ]
        )
    faces.extend(
        [
            (bottom_inner, bottom_outer, top_outer, top_inner),
            (bottom_inner + steps, top_inner + steps, top_outer + steps, bottom_outer + steps),
        ]
    )

    mesh = bpy.data.meshes.new(f"{name}Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    bevel_object(obj, 0.055, 2)
    assign_material(obj, material)
    return obj


def arch_ring(
    name: str,
    y: float,
    center_z: float,
    inner_radius: float,
    outer_radius: float,
    depth: float,
    material: bpy.types.Material,
    steps: int = 18,
) -> bpy.types.Object:
    vertices: list[tuple[float, float, float]] = []
    faces: list[tuple[int, int, int, int]] = []
    for side_y in (y - depth / 2, y + depth / 2):
        for radius in (inner_radius, outer_radius):
            for step in range(steps + 1):
                angle = math.pi * step / steps
                vertices.append((math.cos(angle) * radius, side_y, center_z + math.sin(angle) * radius))

    row = steps + 1
    front_inner = 0
    front_outer = row
    back_inner = row * 2
    back_outer = row * 3
    for step in range(steps):
        next_step = step + 1
        faces.extend(
            [
                (front_inner + step, front_outer + step, front_outer + next_step, front_inner + next_step),
                (back_inner + step, back_inner + next_step, back_outer + next_step, back_outer + step),
                (front_outer + step, back_outer + step, back_outer + next_step, front_outer + next_step),
                (front_inner + step, front_inner + next_step, back_inner + next_step, back_inner + step),
            ]
        )
    faces.extend(
        [
            (front_inner, back_inner, back_outer, front_outer),
            (front_inner + steps, front_outer + steps, back_outer + steps, back_inner + steps),
        ]
    )

    mesh = bpy.data.meshes.new(f"{name}Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    bevel_object(obj, 0.045, 2)
    assign_material(obj, material)
    return obj


def gable_roof(
    name: str,
    location: tuple[float, float, float],
    width: float,
    depth: float,
    height: float,
    material: bpy.types.Material,
) -> bpy.types.Object:
    x = width / 2
    y = depth / 2
    vertices = [
        (-x, -y, 0), (x, -y, 0), (x, y, 0), (-x, y, 0),
        (0, -y, height), (0, y, height),
    ]
    faces = [
        (0, 1, 4), (3, 5, 2), (0, 4, 5, 3), (1, 2, 5, 4), (0, 3, 2, 1),
    ]
    mesh = bpy.data.meshes.new(f"{name}Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    obj.location = location
    bpy.context.collection.objects.link(obj)
    bevel_object(obj, 0.08, 2)
    assign_material(obj, material)
    return obj


def mountain_ridge(
    name: str,
    y: float,
    base_z: float,
    peaks: list[tuple[float, float]],
    material: bpy.types.Material,
) -> bpy.types.Object:
    vertices = [(x, y, base_z) for x, _ in peaks]
    vertices += [(x, y, z) for x, z in peaks]
    faces = []
    count = len(peaks)
    for index in range(count - 1):
        faces.append((index, index + 1, count + index + 1, count + index))
    mesh = bpy.data.meshes.new(f"{name}Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    assign_material(obj, material)
    return obj


def point_light(name: str, location: tuple[float, float, float], color: str, energy: float, radius: float) -> None:
    data = bpy.data.lights.new(name=name, type="POINT")
    data.color = hex_color(color)[:3]
    data.energy = energy
    data.shadow_soft_size = radius
    obj = bpy.data.objects.new(name, data)
    obj.location = location
    bpy.context.collection.objects.link(obj)


def look_at(obj: bpy.types.Object, target: tuple[float, float, float]) -> None:
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def build_world() -> None:
    limestone = make_material("Limestone", "#756f62", 0.88)
    limestone_light = make_material("Limestone light", "#9b9482", 0.82)
    plaster = make_material("Mineral plaster", "#aaa38f", 0.9)
    timber = make_material("Blackened timber", "#1b1916", 0.68)
    roof = make_material("Charcoal roof", "#252722", 0.7, metallic=0.05)
    earth = make_material("Night earth", "#242823", 0.96)
    path = make_material("Worn stone path", "#4f5047", 0.92)
    brass = make_material("Oxidized brass", "#81724e", 0.38, metallic=0.72)
    window = make_material("Occupied light", "#d6b56d", 0.32, emission="#e5bd6f", emission_strength=5.2)
    cyan = make_material("Signal anchor", "#67d8d2", 0.24, metallic=0.15, emission="#69e1dc", emission_strength=7.0)
    mountain_far = make_material("Mountain far", "#1d2728", 1.0)
    mountain_near = make_material("Mountain near", "#252f2d", 1.0)

    cylinder("Terrain", (0, 1.5, -0.34), 31.5, 0.68, 64, earth, bevel=0.0)

    ring_segments = 28
    for index in range(ring_segments):
        start = index / ring_segments * math.tau
        end = (index + 1) / ring_segments * math.tau
        midpoint = (start + end) / 2
        gate_delta = abs(math.atan2(math.sin(midpoint + math.pi / 2), math.cos(midpoint + math.pi / 2)))
        if gate_delta < 0.35:
            continue

        body_material = plaster if index % 4 in (1, 2) else limestone
        annular_segment(
            f"Inhabited ring {index:02d}",
            12.2,
            15.25,
            start + 0.018,
            end - 0.018,
            0.0,
            5.65 + (index % 3) * 0.12,
            body_material,
        )
        annular_segment(
            f"Ring roof {index:02d}",
            11.95,
            15.5,
            start + 0.012,
            end - 0.012,
            5.62 + (index % 3) * 0.12,
            0.42,
            roof,
        )

        radius = 15.33
        window_x = math.cos(midpoint) * radius
        window_y = math.sin(midpoint) * radius
        cube(
            f"Window {index:02d}",
            (window_x, window_y, 3.15 + (index % 2) * 0.38),
            (0.62, 0.12, 0.94),
            window if index % 3 != 0 else timber,
            rotation_z=midpoint - math.pi / 2,
            bevel=0.035,
        )
        cube(
            f"Timber lintel {index:02d}",
            (math.cos(midpoint) * 15.4, math.sin(midpoint) * 15.4, 4.7),
            (1.45, 0.14, 0.12),
            timber,
            rotation_z=midpoint - math.pi / 2,
            bevel=0.025,
        )

    for side in (-1, 1):
        tower_x = side * 5.1
        cylinder(f"Gate tower {'L' if side < 0 else 'R'}", (tower_x, -13.4, 4.05), 2.28, 8.1, 12, limestone, 0.1)
        cone(f"Gate tower roof {'L' if side < 0 else 'R'}", (tower_x, -13.4, 9.05), 2.72, 2.15, 12, roof)
        cube(f"Tower window {'L' if side < 0 else 'R'}", (tower_x, -15.69, 4.85), (0.54, 0.11, 1.5), window, bevel=0.035)
        cube(f"Tower slit {'L' if side < 0 else 'R'}", (tower_x + side * 0.86, -15.45, 6.65), (0.28, 0.1, 1.05), window, bevel=0.025)
        cube(f"Gate brass line {'L' if side < 0 else 'R'}", (side * 3.33, -15.22, 4.2), (0.12, 0.12, 6.6), brass, bevel=0.025)

    cube("Gate left pier", (-3.16, -14.15, 3.25), (1.48, 3.15, 6.5), limestone_light, bevel=0.09)
    cube("Gate right pier", (3.16, -14.15, 3.25), (1.48, 3.15, 6.5), limestone_light, bevel=0.09)
    arch_ring("Gate arch", -14.15, 5.25, 2.45, 3.42, 3.16, limestone_light)
    cube("Gate upper beam", (0, -14.15, 8.15), (7.75, 3.15, 0.72), plaster, bevel=0.08)
    cube("Gate shadow pocket", (0, -12.7, 4.25), (5.05, 0.32, 8.45), timber, bevel=0.04)

    cube("Workshop body", (0, 3.2, 2.25), (8.7, 6.5, 4.5), plaster, bevel=0.12)
    gable_roof("Workshop roof", (0, 3.2, 4.48), 9.6, 7.3, 2.45, roof)
    cube("Workshop chimney", (2.65, 4.3, 7.15), (0.82, 0.82, 3.3), limestone, bevel=0.06)
    cube("Workshop door", (0, -0.08, 1.55), (1.35, 0.15, 3.1), timber, bevel=0.045)
    for index in range(6):
        x = -3.25 + index * 1.3
        cube(f"Workshop response {index + 1}", (x, -0.12, 3.35), (0.48, 0.14, 1.22), window, bevel=0.045)
        cylinder(f"Response anchor {index + 1}", (x, -0.28, 4.35), 0.11, 0.18, 12, cyan, bevel=0.015)

    for index, y in enumerate((-18.5, -14.6, -10.5, -6.2, -1.8)):
        width = 5.2 - index * 0.35
        cube(f"Approach stone {index + 1}", (0, y, 0.06), (width, 3.4, 0.16), path, bevel=0.06)

    for index, angle in enumerate((-2.78, -2.25, -1.82, -1.32, -0.88, -0.36)):
        radius = 11.45
        x = math.cos(angle) * radius
        y = math.sin(angle) * radius
        cylinder(f"Ring signal anchor {index + 1}", (x, y, 5.98), 0.18, 0.22, 12, brass, bevel=0.02)

    mountain_ridge(
        "Far Carpathians",
        27.0,
        -0.1,
        [(-34, 2.5), (-26, 7.2), (-20, 4.8), (-13, 10.2), (-6, 5.6), (1, 8.7), (9, 4.9), (17, 9.4), (25, 5.5), (34, 7.0)],
        mountain_far,
    )
    mountain_ridge(
        "Near ridge",
        20.0,
        -0.1,
        [(-32, 1.6), (-24, 4.8), (-17, 3.1), (-10, 6.4), (-2, 2.8), (7, 5.3), (15, 2.4), (24, 5.8), (32, 2.2)],
        mountain_near,
    )


def setup_lighting_and_camera() -> None:
    world = bpy.context.scene.world or bpy.data.worlds.new("Blue hour")
    bpy.context.scene.world = world
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    if background:
        background.inputs["Color"].default_value = hex_color("#081012")
        background.inputs["Strength"].default_value = 0.28

    sun_data = bpy.data.lights.new(name="Cold blue-hour sun", type="SUN")
    sun_data.color = hex_color("#b8cbc9")[:3]
    sun_data.energy = 2.3
    sun_data.angle = math.radians(18)
    sun = bpy.data.objects.new("Cold blue-hour sun", sun_data)
    sun.rotation_euler = (math.radians(38), math.radians(-24), math.radians(-28))
    bpy.context.collection.objects.link(sun)

    area_data = bpy.data.lights.new(name="Warm gate wash", type="AREA")
    area_data.color = hex_color("#d6ba80")[:3]
    area_data.energy = 1450
    area_data.shape = "DISK"
    area_data.size = 10
    area = bpy.data.objects.new("Warm gate wash", area_data)
    area.location = (-6.5, -21.0, 13.0)
    look_at(area, (0, -8, 3.8))
    bpy.context.collection.objects.link(area)

    point_light("Workshop occupation", (0, 0.2, 4.0), "#e5bb6f", 950, 4.0)
    point_light("Gate signal", (0, -15.0, 5.0), "#69d9d5", 620, 2.0)
    point_light("Courtyard fill", (7.5, 0.0, 5.0), "#9bc4c1", 700, 5.0)

    camera_data = bpy.data.cameras.new("First Light camera")
    camera_data.lens = 42
    camera_data.sensor_width = 36
    camera = bpy.data.objects.new("First Light camera", camera_data)
    camera.location = (19.5, -36.0, 13.5)
    look_at(camera, (0, 0.8, 3.8))
    bpy.context.collection.objects.link(camera)
    bpy.context.scene.camera = camera


def configure_output() -> None:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1600
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.film_transparent = False
    scene.render.filepath = str(POSTER)
    scene.render.use_file_extension = True

    scene.render.image_settings.color_depth = "8"
    try:
        scene.view_settings.look = "AgX - Medium High Contrast"
    except TypeError:
        pass


def export_and_render() -> None:
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_FILE))
    bpy.ops.export_scene.gltf(
        filepath=str(RAW_GLB),
        export_format="GLB",
        export_yup=True,
        export_apply=True,
        export_materials="EXPORT",
        export_cameras=False,
        export_lights=False,
        export_animations=False,
    )
    bpy.ops.render.render(write_still=True)


def main() -> None:
    clear_scene()
    build_world()
    setup_lighting_and_camera()
    configure_output()
    export_and_render()
    print(f"Built {RAW_GLB}")
    print(f"Rendered {POSTER}")


if __name__ == "__main__":
    main()
