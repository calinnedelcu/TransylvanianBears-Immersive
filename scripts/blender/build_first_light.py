"""Build the First Light architectural kit and its static poster.

Run with:
  blender --background --python scripts/blender/build_first_light.py

The script is intentionally deterministic so the web asset can be rebuilt and
reviewed without depending on a local .blend file or manual export settings.
"""

from __future__ import annotations

import math
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
WORLD_DIR = ROOT / "public" / "assets" / "world"
SOURCE_DIR = ROOT / "artifacts" / "blender"
RAW_GLB = WORLD_DIR / "first-light-citadel.raw.glb"
POSTER = WORLD_DIR / "first-light-poster.png"
BLEND_FILE = SOURCE_DIR / "first-light-citadel.blend"
EDGE_WEAR_MATERIALS: dict[str, str] = {}

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


def srgb_to_linear(value: float) -> float:
    if value <= 0.04045:
        return value / 12.92
    return ((value + 0.055) / 1.055) ** 2.4


def linear_color(value: str) -> tuple[float, float, float]:
    return tuple(srgb_to_linear(channel) for channel in hex_color(value)[:3])


def tiled_noise(u: float, v: float, cells: int, seed: float) -> float:
    x = u * cells
    y = v * cells
    x0 = math.floor(x)
    y0 = math.floor(y)
    tx = x - x0
    ty = y - y0
    tx = tx * tx * (3.0 - 2.0 * tx)
    ty = ty * ty * (3.0 - 2.0 * ty)

    def sample(ix: int, iy: int) -> float:
        wrapped_x = ix % cells
        wrapped_y = iy % cells
        value = math.sin(wrapped_x * 127.1 + wrapped_y * 311.7 + seed * 74.7) * 43758.5453
        return value - math.floor(value)

    a = sample(x0, y0)
    b = sample(x0 + 1, y0)
    c = sample(x0, y0 + 1)
    d = sample(x0 + 1, y0 + 1)
    return (a * (1.0 - tx) + b * tx) * (1.0 - ty) + (c * (1.0 - tx) + d * tx) * ty


def surface_height(profile: str, u: float, v: float) -> float:
    broad = tiled_noise(u, v, 3, 1.7)
    medium = tiled_noise(u, v, 8, 4.1)
    fine = tiled_noise(u, v, 19, 8.3)
    if profile == "mineral":
        vein = 0.5 + 0.5 * math.sin(math.tau * (u * 2.0 + v * 3.0 + medium * 0.3))
        return broad * 0.48 + medium * 0.3 + fine * 0.12 + vein * 0.1
    if profile == "plaster":
        sweep = 0.5 + 0.5 * math.sin(math.tau * (u * 2.0 + medium * 0.22))
        return broad * 0.55 + medium * 0.25 + fine * 0.05 + sweep * 0.15
    if profile == "timber":
        warp = tiled_noise(u, v, 4, 12.4) * 0.24 + math.sin(math.tau * v * 2.0) * 0.025
        grain = 0.5 + 0.5 * math.sin(math.tau * (u * 11.0 + warp))
        tight_grain = 0.5 + 0.5 * math.sin(math.tau * (u * 27.0 + warp * 1.7))
        return grain * 0.48 + tight_grain * 0.17 + medium * 0.2 + broad * 0.15
    if profile == "roof":
        seam = 0.5 + 0.5 * math.sin(math.tau * (u * 6.0 + v * 0.45))
        return broad * 0.38 + medium * 0.36 + fine * 0.12 + seam * 0.14
    if profile == "ground":
        course = abs(math.sin(math.tau * (u * 3.0 + medium * 0.12)))
        return broad * 0.4 + medium * 0.32 + fine * 0.12 + course * 0.16
    tarnish = tiled_noise(u, v, 5, 21.0)
    scratches = 0.5 + 0.5 * math.sin(math.tau * (u * 17.0 + v * 2.0))
    return broad * 0.32 + medium * 0.26 + tarnish * 0.32 + scratches * 0.1


def make_generated_image(
    name: str,
    size: int,
    pixels: list[float],
    color_space: str,
) -> bpy.types.Image:
    image = bpy.data.images.new(name, width=size, height=size, alpha=False)
    image.file_format = "PNG"
    image.colorspace_settings.name = color_space
    image.pixels.foreach_set(pixels)
    image.pack()
    return image


def make_surface_maps(
    name: str,
    profile: str,
    roughness: float,
    metallic: float,
    normal_strength: float,
    size: int = 128,
) -> tuple[list[float], bpy.types.Image, bpy.types.Image]:
    heights = [
        surface_height(profile, x / size, y / size)
        for y in range(size)
        for x in range(size)
    ]
    normal_pixels: list[float] = []
    orm_pixels: list[float] = []
    for y in range(size):
        for x in range(size):
            index = y * size + x
            height = heights[index]
            left = heights[y * size + (x - 1) % size]
            right = heights[y * size + (x + 1) % size]
            down = heights[((y - 1) % size) * size + x]
            up = heights[((y + 1) % size) * size + x]
            nx = (left - right) * normal_strength
            ny = (down - up) * normal_strength
            nz = 1.0
            length = math.sqrt(nx * nx + ny * ny + nz * nz)
            normal_pixels.extend((nx / length * 0.5 + 0.5, ny / length * 0.5 + 0.5, nz / length * 0.5 + 0.5, 1.0))

            local_roughness = max(0.04, min(1.0, roughness + (height - 0.5) * 0.12))
            occlusion = max(0.68, min(1.0, 0.92 + (height - 0.5) * 0.16))
            local_metallic = max(0.0, min(1.0, metallic - max(0.0, 0.48 - height) * 0.28))
            orm_pixels.extend((occlusion, local_roughness, local_metallic, 1.0))

    normal = make_generated_image(f"{name} Normal", size, normal_pixels, "Non-Color")
    orm = make_generated_image(f"{name} ORM", size, orm_pixels, "Non-Color")
    return heights, normal, orm


def make_base_color_image(
    name: str,
    heights: list[float],
    low_color: str,
    high_color: str,
    size: int = 128,
) -> bpy.types.Image:
    low = linear_color(low_color)
    high = linear_color(high_color)
    pixels: list[float] = []
    for index, height in enumerate(heights):
        x = index % size
        y = index // size
        u = x / size
        v = y / size
        stain = tiled_noise(u, v, 5, 31.0)
        blend = max(0.0, min(1.0, height * 0.78 + stain * 0.22))
        channels = [low[channel] * (1.0 - blend) + high[channel] * blend for channel in range(3)]
        pixels.extend((*channels, 1.0))
    return make_generated_image(f"{name} BaseColor", size, pixels, "sRGB")


def build_texture_library() -> dict[str, dict[str, bpy.types.Image | float]]:
    profile_specs = {
        "mineral": (0.9, 0.0, 4.2),
        "plaster": (0.94, 0.0, 2.6),
        "timber": (0.78, 0.02, 4.6),
        "roof": (0.76, 0.04, 3.8),
        "ground": (0.95, 0.0, 4.0),
        "metal": (0.42, 0.78, 3.2),
    }
    profiles: dict[str, tuple[list[float], bpy.types.Image, bpy.types.Image]] = {}
    for profile, (roughness, metallic, strength) in profile_specs.items():
        profiles[profile] = make_surface_maps(
            f"First Light {profile.title()}",
            profile,
            roughness,
            metallic,
            strength,
        )

    variants = {
        "limestone": ("mineral", "#5d5b52", "#8f8979", 0.46),
        "limestone-light": ("mineral", "#777469", "#aaa28e", 0.42),
        "plaster": ("plaster", "#878478", "#b2aa96", 0.3),
        "timber": ("timber", "#100f0d", "#2d2922", 0.52),
        "roof": ("roof", "#171b1a", "#343735", 0.38),
        "earth": ("ground", "#151a18", "#30352f", 0.34),
        "path": ("ground", "#353a36", "#68685d", 0.42),
        "brass": ("metal", "#433a28", "#a18a52", 0.48),
        "iron": ("metal", "#0c1010", "#303633", 0.4),
    }
    library: dict[str, dict[str, bpy.types.Image | float]] = {}
    for key, (profile, low, high, strength) in variants.items():
        heights, normal, orm = profiles[profile]
        library[key] = {
            "base": make_base_color_image(f"First Light {key.title()}", heights, low, high),
            "normal": normal,
            "orm": orm,
            "normal_strength": strength,
        }
    return library


def gltf_occlusion_group() -> bpy.types.NodeTree:
    group = bpy.data.node_groups.get("glTF Material Output")
    if group:
        return group
    group = bpy.data.node_groups.new("glTF Material Output", "ShaderNodeTree")
    group.interface.new_socket(name="Occlusion", in_out="INPUT", socket_type="NodeSocketFloat")
    return group


def make_material(
    name: str,
    color: str,
    roughness: float,
    metallic: float = 0.0,
    emission: str | None = None,
    emission_strength: float = 0.0,
    textures: dict[str, bpy.types.Image | float] | None = None,
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
        if textures:
            nodes = material.node_tree.nodes
            links = material.node_tree.links
            base_texture = nodes.new("ShaderNodeTexImage")
            base_texture.name = f"{name} BaseColor"
            base_texture.label = "GLTF BaseColor"
            base_texture.image = textures["base"]
            base_texture.extension = "REPEAT"
            base_texture.interpolation = "Linear"
            base_texture.location = (-620, 160)
            links.new(base_texture.outputs["Color"], node.inputs["Base Color"])

            normal_texture = nodes.new("ShaderNodeTexImage")
            normal_texture.name = f"{name} Normal"
            normal_texture.label = "GLTF Normal"
            normal_texture.image = textures["normal"]
            normal_texture.image.colorspace_settings.name = "Non-Color"
            normal_texture.extension = "REPEAT"
            normal_texture.interpolation = "Linear"
            normal_texture.location = (-620, -150)
            normal_map = nodes.new("ShaderNodeNormalMap")
            normal_map.inputs["Strength"].default_value = float(textures["normal_strength"])
            normal_map.location = (-350, -120)
            links.new(normal_texture.outputs["Color"], normal_map.inputs["Color"])
            links.new(normal_map.outputs["Normal"], node.inputs["Normal"])

            orm_texture = nodes.new("ShaderNodeTexImage")
            orm_texture.name = f"{name} ORM"
            orm_texture.label = "GLTF ORM"
            orm_texture.image = textures["orm"]
            orm_texture.image.colorspace_settings.name = "Non-Color"
            orm_texture.extension = "REPEAT"
            orm_texture.interpolation = "Linear"
            orm_texture.location = (-620, -430)
            separate = nodes.new("ShaderNodeSeparateColor")
            separate.mode = "RGB"
            separate.location = (-350, -400)
            links.new(orm_texture.outputs["Color"], separate.inputs["Color"])
            links.new(separate.outputs["Green"], node.inputs["Roughness"])
            links.new(separate.outputs["Blue"], node.inputs["Metallic"])
            occlusion = nodes.new("ShaderNodeGroup")
            occlusion.node_tree = gltf_occlusion_group()
            occlusion.location = (-80, -460)
            links.new(separate.outputs["Red"], occlusion.inputs["Occlusion"])
            material["pbr_textured"] = True
    return material


def assign_material(obj: bpy.types.Object, material: bpy.types.Material) -> None:
    obj.data.materials.append(material)


def bevel_object(obj: bpy.types.Object, width: float = 0.08, segments: int = 2) -> None:
    modifier = obj.modifiers.new(name="Soft mineral edges", type="BEVEL")
    modifier.width = width
    modifier.segments = segments
    if obj.data.materials:
        wear_name = EDGE_WEAR_MATERIALS.get(obj.data.materials[0].name)
        wear_material = bpy.data.materials.get(wear_name) if wear_name else None
        if wear_material:
            obj.data.materials.append(wear_material)
            modifier.material = len(obj.data.materials) - 1
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=modifier.name)


def linked_copy(
    source: bpy.types.Object,
    name: str,
    location: tuple[float, float, float],
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
    scale: tuple[float, float, float] = (1.0, 1.0, 1.0),
) -> bpy.types.Object:
    obj = source.copy()
    obj.data = source.data
    obj.name = name
    obj.location = location
    obj.rotation_euler = rotation
    obj.scale = scale
    bpy.context.collection.objects.link(obj)
    return obj


def rotated_cube(
    name: str,
    location: tuple[float, float, float],
    dimensions: tuple[float, float, float],
    material: bpy.types.Material,
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
    bevel: float = 0.06,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.rotation_euler = rotation
    assign_material(obj, material)
    if bevel > 0:
        bevel_object(obj, min(bevel, min(dimensions) * 0.22), 2)
    return obj


def cube(
    name: str,
    location: tuple[float, float, float],
    dimensions: tuple[float, float, float],
    material: bpy.types.Material,
    rotation_z: float = 0.0,
    bevel: float = 0.06,
) -> bpy.types.Object:
    return rotated_cube(name, location, dimensions, material, (0.0, 0.0, rotation_z), bevel)


def cube_instance(
    modules: dict[str, bpy.types.Object],
    key: str,
    name: str,
    location: tuple[float, float, float],
    dimensions: tuple[float, float, float],
    material: bpy.types.Material,
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
    bevel: float = 0.04,
) -> bpy.types.Object:
    source = modules.get(key)
    if source:
        return linked_copy(source, name, location, rotation)
    source = rotated_cube(name, location, dimensions, material, rotation, bevel)
    modules[key] = source
    return source


def cylinder(
    name: str,
    location: tuple[float, float, float],
    radius: float,
    depth: float,
    vertices: int,
    material: bpy.types.Material,
    bevel: float = 0.05,
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=depth,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    assign_material(obj, material)
    if bevel > 0:
        bevel_object(obj, bevel, 2)
    return obj


def cylinder_instance(
    modules: dict[str, bpy.types.Object],
    key: str,
    name: str,
    location: tuple[float, float, float],
    radius: float,
    depth: float,
    vertices: int,
    material: bpy.types.Material,
    bevel: float = 0.04,
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
) -> bpy.types.Object:
    source = modules.get(key)
    if source:
        return linked_copy(source, name, location, rotation)
    source = cylinder(name, location, radius, depth, vertices, material, bevel, rotation)
    modules[key] = source
    return source


def cone(
    name: str,
    location: tuple[float, float, float],
    radius: float,
    depth: float,
    vertices: int,
    material: bpy.types.Material,
    tip_radius: float = 0.12,
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius,
        radius2=min(tip_radius, radius * 0.34),
        depth=depth,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    assign_material(obj, material)
    return obj


def cone_instance(
    modules: dict[str, bpy.types.Object],
    key: str,
    name: str,
    location: tuple[float, float, float],
    radius: float,
    depth: float,
    vertices: int,
    material: bpy.types.Material,
    tip_radius: float = 0.08,
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
) -> bpy.types.Object:
    source = modules.get(key)
    if source:
        return linked_copy(source, name, location, rotation)
    source = cone(name, location, radius, depth, vertices, material, tip_radius, rotation)
    modules[key] = source
    return source


def profile_prism(
    name: str,
    points: list[tuple[float, float]],
    depth: float,
    material: bpy.types.Material,
    location: tuple[float, float, float] = (0.0, 0.0, 0.0),
    rotation_z: float = 0.0,
    bevel: float = 0.0,
) -> bpy.types.Object:
    count = len(points)
    vertices = [(x, -depth / 2, z) for x, z in points]
    vertices += [(x, depth / 2, z) for x, z in points]
    faces: list[tuple[int, ...]] = [
        tuple(reversed(range(count))),
        tuple(range(count, count * 2)),
    ]
    for index in range(count):
        next_index = (index + 1) % count
        faces.append((index, next_index, count + next_index, count + index))

    mesh = bpy.data.meshes.new(f"{name}Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    obj.location = location
    obj.rotation_euler[2] = rotation_z
    bpy.context.collection.objects.link(obj)
    assign_material(obj, material)
    if bevel > 0:
        bevel_object(obj, bevel, 1)
    return obj


def profile_instance(
    modules: dict[str, bpy.types.Object],
    key: str,
    name: str,
    points: list[tuple[float, float]],
    depth: float,
    material: bpy.types.Material,
    location: tuple[float, float, float],
    rotation_z: float = 0.0,
    bevel: float = 0.0,
) -> bpy.types.Object:
    source = modules.get(key)
    if source:
        return linked_copy(source, name, location, (0.0, 0.0, rotation_z))
    source = profile_prism(name, points, depth, material, location, rotation_z, bevel)
    modules[key] = source
    return source


def lancet_points(width: float, height: float) -> list[tuple[float, float]]:
    return [
        (-width / 2, -height / 2),
        (width / 2, -height / 2),
        (width / 2, height * 0.05),
        (width * 0.36, height * 0.29),
        (0.0, height / 2),
        (-width * 0.36, height * 0.29),
        (-width / 2, height * 0.05),
    ]


def facade_position(
    origin: tuple[float, float, float],
    yaw: float,
    local_x: float,
    local_z: float,
    normal_offset: float = 0.0,
) -> tuple[float, float, float]:
    return (
        origin[0] + math.cos(yaw) * local_x - math.sin(yaw) * normal_offset,
        origin[1] + math.sin(yaw) * local_x + math.cos(yaw) * normal_offset,
        origin[2] + local_z,
    )


def facade_beam(
    modules: dict[str, bpy.types.Object],
    key: str,
    name: str,
    origin: tuple[float, float, float],
    yaw: float,
    start: tuple[float, float],
    end: tuple[float, float],
    width: float,
    depth: float,
    material: bpy.types.Material,
    normal_offset: float,
) -> bpy.types.Object:
    delta_x = end[0] - start[0]
    delta_z = end[1] - start[1]
    length = math.hypot(delta_x, delta_z)
    midpoint_x = (start[0] + end[0]) / 2
    midpoint_z = (start[1] + end[1]) / 2
    tilt = math.atan2(delta_x, delta_z)
    return cube_instance(
        modules,
        key,
        name,
        facade_position(origin, yaw, midpoint_x, midpoint_z, normal_offset),
        (width, depth, length),
        material,
        (0.0, tilt, yaw),
        min(width * 0.28, 0.025),
    )


def add_lancet_window(
    modules: dict[str, bpy.types.Object],
    panel_key: str,
    frame_key: str,
    name: str,
    origin: tuple[float, float, float],
    yaw: float,
    width: float,
    height: float,
    depth: float,
    panel_material: bpy.types.Material,
    surround_material: bpy.types.Material,
    tracery_material: bpy.types.Material,
    include_tracery: bool = True,
) -> None:
    profile_instance(
        modules,
        panel_key,
        name,
        lancet_points(width, height),
        depth,
        panel_material,
        origin,
        yaw,
        min(depth * 0.18, 0.018),
    )

    bottom = -height / 2
    shoulder = height * 0.05
    apex = height / 2
    surround_width = max(0.045, width * 0.105)
    tracery_width = max(0.025, width * 0.05)
    frame_depth = max(depth * 1.35, 0.1)
    frame_offset = depth * 0.72
    for side, label in ((-1, "left"), (1, "right")):
        facade_beam(
            modules,
            f"{frame_key}-jamb",
            f"{name} {label} jamb",
            origin,
            yaw,
            (side * width / 2, bottom),
            (side * width / 2, shoulder),
            surround_width,
            frame_depth,
            surround_material,
            frame_offset,
        )
        facade_beam(
            modules,
            f"{frame_key}-arch",
            f"{name} {label} arch stone",
            origin,
            yaw,
            (side * width / 2, shoulder),
            (0.0, apex),
            surround_width,
            frame_depth,
            surround_material,
            frame_offset,
        )
    facade_beam(
        modules,
        f"{frame_key}-sill",
        f"{name} sill",
        origin,
        yaw,
        (-width / 2, bottom),
        (width / 2, bottom),
        surround_width,
        frame_depth,
        surround_material,
        frame_offset,
    )
    if not include_tracery:
        return
    facade_beam(
        modules,
        f"{frame_key}-mullion",
        f"{name} central mullion",
        origin,
        yaw,
        (0.0, bottom + height * 0.09),
        (0.0, apex - height * 0.12),
        tracery_width,
        frame_depth * 1.06,
        tracery_material,
        frame_offset + 0.012,
    )
    facade_beam(
        modules,
        f"{frame_key}-transom",
        f"{name} tracery transom",
        origin,
        yaw,
        (-width * 0.34, height * 0.02),
        (width * 0.34, height * 0.02),
        tracery_width,
        frame_depth * 1.06,
        tracery_material,
        frame_offset + 0.012,
    )


def wedge_buttress(
    name: str,
    location: tuple[float, float, float],
    width: float,
    depth: float,
    height: float,
    material: bpy.types.Material,
    rotation_z: float = 0.0,
) -> bpy.types.Object:
    back = -0.18
    top_depth = depth * 0.22
    half_width = width / 2
    vertices = [
        (-half_width, back, 0.0),
        (half_width, back, 0.0),
        (half_width, back, height),
        (-half_width, back, height),
        (-half_width, depth, 0.0),
        (half_width, depth, 0.0),
        (half_width, top_depth, height),
        (-half_width, top_depth, height),
    ]
    faces = [
        (0, 3, 2, 1),
        (0, 1, 5, 4),
        (4, 5, 6, 7),
        (3, 7, 6, 2),
        (0, 4, 7, 3),
        (1, 2, 6, 5),
    ]
    mesh = bpy.data.meshes.new(f"{name}Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    obj.location = location
    obj.rotation_euler[2] = rotation_z
    bpy.context.collection.objects.link(obj)
    assign_material(obj, material)
    bevel_object(obj, 0.035, 1)
    return obj


def wedge_instance(
    modules: dict[str, bpy.types.Object],
    key: str,
    name: str,
    location: tuple[float, float, float],
    width: float,
    depth: float,
    height: float,
    material: bpy.types.Material,
    rotation_z: float,
) -> bpy.types.Object:
    source = modules.get(key)
    if source:
        return linked_copy(source, name, location, (0.0, 0.0, rotation_z))
    source = wedge_buttress(name, location, width, depth, height, material, rotation_z)
    modules[key] = source
    return source


def pointed_arch_ring(
    name: str,
    y: float,
    spring_z: float,
    inner_half_width: float,
    outer_half_width: float,
    inner_rise: float,
    outer_rise: float,
    depth: float,
    material: bpy.types.Material,
    steps: int = 8,
) -> bpy.types.Object:
    def arch_path(half_width: float, rise: float) -> list[tuple[float, float]]:
        points: list[tuple[float, float]] = []
        for step in range(steps + 1):
            t = step / steps
            inverse = 1.0 - t
            x = inverse * inverse * -half_width + 2 * inverse * t * -half_width + t * t * 0.0
            z = 2 * inverse * t * rise * 0.72 + t * t * rise
            points.append((x, z))
        for step in range(1, steps + 1):
            t = step / steps
            inverse = 1.0 - t
            x = 2 * inverse * t * half_width + t * t * half_width
            z = inverse * inverse * rise + 2 * inverse * t * rise * 0.72
            points.append((x, z))
        return points

    inner = arch_path(inner_half_width, inner_rise)
    outer = arch_path(outer_half_width, outer_rise)
    count = len(inner)
    vertices: list[tuple[float, float, float]] = []
    for side_y in (y - depth / 2, y + depth / 2):
        vertices.extend((x, side_y, spring_z + z) for x, z in inner)
        vertices.extend((x, side_y, spring_z + z) for x, z in outer)

    front_inner = 0
    front_outer = count
    back_inner = count * 2
    back_outer = count * 3
    faces: list[tuple[int, int, int, int]] = []
    for index in range(count - 1):
        next_index = index + 1
        faces.extend(
            [
                (front_inner + index, front_outer + index, front_outer + next_index, front_inner + next_index),
                (back_inner + index, back_inner + next_index, back_outer + next_index, back_outer + index),
                (front_outer + index, back_outer + index, back_outer + next_index, front_outer + next_index),
                (front_inner + index, front_inner + next_index, back_inner + next_index, back_inner + index),
            ]
        )
    faces.extend(
        [
            (front_inner, back_inner, back_outer, front_outer),
            (front_inner + count - 1, front_outer + count - 1, back_outer + count - 1, back_inner + count - 1),
        ]
    )
    mesh = bpy.data.meshes.new(f"{name}Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    assign_material(obj, material)
    bevel_object(obj, 0.045, 2)
    return obj


def add_bear_relief(
    modules: dict[str, bpy.types.Object],
    key_prefix: str,
    name: str,
    center: tuple[float, float, float],
    scale: float,
    backing_material: bpy.types.Material,
    relief_material: bpy.types.Material,
    dark_material: bpy.types.Material,
) -> None:
    face_rotation = (math.pi / 2, 0.0, 0.0)

    def disc(
        component: str,
        key: str,
        offset_x: float,
        offset_y: float,
        offset_z: float,
        radius: float,
        depth: float,
        vertices: int,
        material: bpy.types.Material,
    ) -> None:
        cylinder_instance(
            modules,
            f"{key_prefix}-{key}",
            f"{name} {component}",
            (
                center[0] + offset_x * scale,
                center[1] - offset_y * scale,
                center[2] + offset_z * scale,
            ),
            radius * scale,
            depth * scale,
            vertices,
            material,
            max(0.008, 0.018 * scale),
            face_rotation,
        )

    disc("stone medallion", "backing", 0.0, 0.0, 0.0, 1.0, 0.18, 16, backing_material)
    disc("dark field", "field", 0.0, 0.11, 0.0, 0.82, 0.12, 16, dark_material)
    disc("head", "head", 0.0, 0.19, 0.04, 0.46, 0.11, 14, relief_material)
    for side, label in ((-1, "left"), (1, "right")):
        disc(f"{label} ear", "ear", side * 0.35, 0.2, 0.36, 0.19, 0.11, 12, relief_material)
        disc(f"{label} eye", "eye", side * 0.16, 0.28, 0.08, 0.045, 0.09, 8, dark_material)
    disc("muzzle", "muzzle", 0.0, 0.26, -0.16, 0.25, 0.1, 12, backing_material)
    disc("nose", "nose", 0.0, 0.33, -0.12, 0.085, 0.08, 8, dark_material)


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
    assign_material(obj, material)
    bevel_object(obj, 0.055, 2)
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
    assign_material(obj, material)
    bevel_object(obj, 0.045, 2)
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
    assign_material(obj, material)
    bevel_object(obj, 0.08, 2)
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


def add_box_uvs() -> None:
    density_by_material = {
        "Blackened timber": 0.78,
        "Charcoal roof": 0.46,
        "Night earth": 0.3,
        "Worn stone path": 0.38,
        "Oxidized brass": 0.7,
        "Polished brass edge": 0.7,
        "Aged iron": 0.72,
    }
    for mesh in bpy.data.meshes:
        textured_materials = [material for material in mesh.materials if material and material.get("pbr_textured")]
        if not textured_materials or not mesh.vertices:
            continue
        while mesh.uv_layers:
            mesh.uv_layers.remove(mesh.uv_layers[0])
        uv_layer = mesh.uv_layers.new(name="UVMap")
        coordinates = [vertex.co for vertex in mesh.vertices]
        extents = [
            max(coordinate[axis] for coordinate in coordinates) - min(coordinate[axis] for coordinate in coordinates)
            for axis in range(3)
        ]
        longest_axis = max(range(3), key=lambda axis: extents[axis])
        density = density_by_material.get(textured_materials[0].name, 0.54)
        for polygon in mesh.polygons:
            normal = polygon.normal
            dominant = max(range(3), key=lambda axis: abs(normal[axis]))
            plane_axes = tuple(axis for axis in range(3) if axis != dominant)
            if longest_axis in plane_axes:
                v_axis = longest_axis
                u_axis = plane_axes[0] if plane_axes[1] == v_axis else plane_axes[1]
            else:
                u_axis, v_axis = plane_axes
            for loop_index in polygon.loop_indices:
                coordinate = mesh.vertices[mesh.loops[loop_index].vertex_index].co
                uv_layer.data[loop_index].uv = (
                    coordinate[u_axis] * density,
                    coordinate[v_axis] * density,
                )


def triangulate_textured_meshes() -> None:
    for mesh in bpy.data.meshes:
        if not any(material and material.get("pbr_textured") for material in mesh.materials):
            continue
        editable = bmesh.new()
        editable.from_mesh(mesh)
        bmesh.ops.triangulate(
            editable,
            faces=list(editable.faces),
            quad_method="BEAUTY",
            ngon_method="BEAUTY",
        )
        editable.to_mesh(mesh)
        editable.free()
        mesh.update()


def build_world() -> None:
    textures = build_texture_library()
    limestone = make_material("Limestone", "#756f62", 0.88, textures=textures["limestone"])
    limestone_light = make_material("Limestone light", "#9b9482", 0.82, textures=textures["limestone-light"])
    plaster = make_material("Mineral plaster", "#aaa38f", 0.9, textures=textures["plaster"])
    timber = make_material("Blackened timber", "#1b1916", 0.68, textures=textures["timber"])
    roof = make_material("Charcoal roof", "#252722", 0.7, metallic=0.05, textures=textures["roof"])
    earth = make_material("Night earth", "#242823", 0.96, textures=textures["earth"])
    path = make_material("Worn stone path", "#4f5047", 0.92, textures=textures["path"])
    brass = make_material("Oxidized brass", "#81724e", 0.38, metallic=0.72, textures=textures["brass"])
    polished_brass = make_material("Polished brass edge", "#b49d64", 0.28, metallic=0.82)
    aged_iron = make_material("Aged iron", "#171c1b", 0.46, metallic=0.76, textures=textures["iron"])
    window = make_material("Occupied light", "#d6b56d", 0.32, emission="#e5bd6f", emission_strength=5.2)
    cyan = make_material("Signal anchor", "#67d8d2", 0.24, metallic=0.15, emission="#69e1dc", emission_strength=7.0)
    mountain_far = make_material("Mountain far", "#1d2728", 1.0)
    mountain_near = make_material("Mountain near", "#252f2d", 1.0)
    EDGE_WEAR_MATERIALS.clear()
    EDGE_WEAR_MATERIALS.update({
        "Limestone": "Limestone light",
        "Mineral plaster": "Limestone",
        "Worn stone path": "Limestone light",
        "Oxidized brass": "Polished brass edge",
    })
    modules: dict[str, bpy.types.Object] = {}

    cylinder("Terrain", (0, 1.5, -0.34), 31.5, 0.68, 64, earth, bevel=0.0)

    ring_segments = 28
    turret_angles = (-2.42, -0.72, 0.72, 2.42)
    for index in range(ring_segments):
        start = index / ring_segments * math.tau
        end = (index + 1) / ring_segments * math.tau
        midpoint = (start + end) / 2
        gate_delta = abs(math.atan2(math.sin(midpoint + math.pi / 2), math.cos(midpoint + math.pi / 2)))
        if gate_delta < 0.35:
            continue

        body_material = plaster if index % 4 in (1, 2) else limestone
        body_height = 5.82 + (index % 3) * 0.12
        annular_segment(
            f"Inhabited ring {index:02d}",
            12.2,
            15.25,
            start + 0.018,
            end - 0.018,
            0.0,
            body_height,
            body_material,
        )
        annular_segment(
            f"Ring roof {index:02d}",
            11.95,
            15.5,
            start + 0.012,
            end - 0.012,
            body_height - 0.03,
            0.5,
            roof,
        )

        yaw = midpoint - math.pi / 2
        radius = 15.38
        window_x = math.cos(midpoint) * radius
        window_y = math.sin(midpoint) * radius
        occupied = index % 3 != 0
        add_lancet_window(
            modules,
            f"ring-panel-{'lit' if occupied else 'dark'}",
            "ring-lancet-frame",
            f"Window {index:02d}",
            (window_x, window_y, 3.18 + (index % 2) * 0.3),
            yaw,
            0.62,
            1.42,
            0.11,
            window if occupied else timber,
            limestone_light,
            brass,
        )
        cube_instance(
            modules,
            "ring-timber-lintel",
            f"Timber lintel {index:02d}",
            (math.cos(midpoint) * 15.43, math.sin(midpoint) * 15.43, 4.92),
            (1.42, 0.15, 0.12),
            timber,
            (0.0, 0.0, yaw),
            0.022,
        )
        for course_index, course_z in enumerate((1.18, 2.62, 4.1)):
            cube_instance(
                modules,
                "ring-stone-course",
                f"Ring stone course {index:02d}-{course_index + 1}",
                (math.cos(midpoint) * 15.39, math.sin(midpoint) * 15.39, course_z),
                (2.75, 0.16, 0.1),
                limestone_light,
                (0.0, 0.0, yaw),
                0.018,
            )

    for index in range(0, ring_segments, 2):
        angle = index / ring_segments * math.tau
        gate_delta = abs(math.atan2(math.sin(angle + math.pi / 2), math.cos(angle + math.pi / 2)))
        turret_delta = min(
            abs(math.atan2(math.sin(angle - turret_angle), math.cos(angle - turret_angle)))
            for turret_angle in turret_angles
        )
        if gate_delta < 0.48 or turret_delta < 0.27:
            continue
        wedge_instance(
            modules,
            "curtain-buttress",
            f"Curtain buttress {index:02d}",
            (math.cos(angle) * 15.12, math.sin(angle) * 15.12, 0.0),
            0.58,
            0.82,
            5.95,
            limestone_light,
            angle - math.pi / 2,
        )

    turret_labels = ("Southwest", "Southeast", "Northeast", "Northwest")
    for turret_index, (label, angle) in enumerate(zip(turret_labels, turret_angles)):
        tower_radius = 14.28
        tower_x = math.cos(angle) * tower_radius
        tower_y = math.sin(angle) * tower_radius
        cylinder_instance(
            modules,
            "curtain-turret-body",
            f"{label} curtain turret",
            (tower_x, tower_y, 3.75),
            1.66,
            7.5,
            10,
            limestone,
            0.075,
        )
        for course_index, course_z in enumerate((1.35, 3.75, 6.3)):
            cylinder_instance(
                modules,
                "curtain-turret-course",
                f"{label} turret course {course_index + 1}",
                (tower_x, tower_y, course_z),
                1.72,
                0.13,
                10,
                limestone_light,
                0.025,
            )
        cone_instance(
            modules,
            "curtain-turret-roof",
            f"{label} turret spire",
            (tower_x, tower_y, 9.25),
            2.05,
            3.5,
            10,
            roof,
            0.06,
        )
        cylinder_instance(
            modules,
            "curtain-turret-finial",
            f"{label} turret finial",
            (tower_x, tower_y, 11.28),
            0.085,
            0.72,
            8,
            brass,
            0.012,
        )
        cone_instance(
            modules,
            "curtain-turret-finial-cap",
            f"{label} turret finial cap",
            (tower_x, tower_y, 11.82),
            0.22,
            0.48,
            8,
            brass,
            0.018,
        )
        window_radius = tower_radius + 1.68
        add_lancet_window(
            modules,
            "curtain-turret-window",
            "curtain-turret-window-frame",
            f"{label} turret lancet",
            (math.cos(angle) * window_radius, math.sin(angle) * window_radius, 4.7),
            angle - math.pi / 2,
            0.56,
            1.68,
            0.11,
            window if turret_index < 2 else timber,
            limestone_light,
            brass,
        )
        wedge_instance(
            modules,
            "turret-buttress",
            f"{label} turret outer buttress",
            (math.cos(angle) * 15.72, math.sin(angle) * 15.72, 0.0),
            0.5,
            0.7,
            6.25,
            limestone_light,
            angle - math.pi / 2,
        )

    for side in (-1, 1):
        label = "L" if side < 0 else "R"
        tower_x = side * 5.1
        cylinder(f"Gate tower {label}", (tower_x, -13.4, 4.35), 2.3, 8.7, 12, limestone, 0.095)
        cylinder_instance(
            modules,
            "gate-tower-eave",
            f"Gate tower eave {label}",
            (tower_x, -13.4, 8.58),
            2.48,
            0.18,
            12,
            limestone_light,
            0.025,
        )
        cone(f"Gate tower roof {label}", (tower_x, -13.4, 10.35), 2.78, 3.65, 12, roof, 0.07)
        for course_index, course_z in enumerate((1.35, 3.25, 5.2, 7.2)):
            cylinder_instance(
                modules,
                "gate-tower-course",
                f"Gate tower course {label}-{course_index + 1}",
                (tower_x, -13.4, course_z),
                2.36,
                0.13,
                12,
                limestone_light,
                0.025,
            )
        cylinder_instance(
            modules,
            "gate-tower-finial",
            f"Gate tower finial {label}",
            (tower_x, -13.4, 12.5),
            0.09,
            0.72,
            8,
            brass,
            0.012,
        )
        cone_instance(
            modules,
            "gate-tower-finial-cap",
            f"Gate tower finial cap {label}",
            (tower_x, -13.4, 13.0),
            0.24,
            0.42,
            8,
            brass,
            0.018,
        )
        add_lancet_window(
            modules,
            "gate-tower-window",
            "gate-tower-window-frame",
            f"Tower window {label}",
            (tower_x, -15.73, 4.45),
            math.pi,
            0.65,
            1.74,
            0.12,
            window,
            limestone_light,
            brass,
        )
        add_lancet_window(
            modules,
            "gate-tower-slit",
            "gate-tower-slit-frame",
            f"Tower slit {label}",
            (tower_x + side * 0.88, -15.57, 6.68),
            math.pi,
            0.3,
            1.08,
            0.1,
            window,
            limestone_light,
            brass,
            include_tracery=False,
        )
        cube(f"Gate brass line {label}", (side * 3.33, -15.76, 4.25), (0.11, 0.1, 6.75), brass, bevel=0.02)
        add_bear_relief(
            modules,
            "guardian-bear",
            f"Guardian bear {label}",
            (tower_x, -15.86, 6.72),
            0.47,
            limestone_light,
            brass,
            timber,
        )

    cube("Gate left pier", (-3.16, -14.15, 3.6), (1.55, 3.15, 7.2), limestone_light, bevel=0.085)
    cube("Gate right pier", (3.16, -14.15, 3.6), (1.55, 3.15, 7.2), limestone_light, bevel=0.085)
    for side in (-1, 1):
        for course_index, course_z in enumerate((1.25, 2.75, 4.25, 5.75)):
            cube_instance(
                modules,
                "gate-pier-course",
                f"Gate pier course {'L' if side < 0 else 'R'}-{course_index + 1}",
                (side * 3.16, -15.77, course_z),
                (1.68, 0.18, 0.11),
                limestone,
                bevel=0.018,
            )
        for joint_index, joint_z in enumerate((0.62, 1.98, 3.5, 5.0, 6.52)):
            joint_offset = -0.24 if joint_index % 2 == 0 else 0.22
            cube_instance(
                modules,
                "gate-pier-mortar-joint",
                f"Gate pier mortar joint {'L' if side < 0 else 'R'}-{joint_index + 1}",
                (side * 3.16 + joint_offset, -15.79, joint_z),
                (0.045, 0.045, 0.64),
                limestone,
                bevel=0.008,
            )
        wedge_instance(
            modules,
            "gate-pier-buttress",
            f"Gate pier buttress {'L' if side < 0 else 'R'}",
            (side * 3.55, -15.45, 0.0),
            0.56,
            1.02,
            7.15,
            limestone_light,
            math.pi,
        )
    pointed_arch_ring("Gate arch", -14.15, 5.02, 2.42, 3.43, 3.25, 3.72, 3.16, limestone_light)
    cube("Gate upper beam", (0, -14.15, 9.2), (7.78, 3.15, 1.48), plaster, bevel=0.08)
    cube("Gate shadow pocket", (0, -12.7, 4.25), (5.05, 0.32, 8.45), timber, bevel=0.04)

    portcullis_bottom = 4.18
    portcullis_height = 3.72
    for bar_index in range(7):
        bar_x = -1.95 + bar_index * 0.65
        cube_instance(
            modules,
            "raised-portcullis-bar",
            f"Portcullis bar {bar_index + 1}",
            (bar_x, -15.62, portcullis_bottom + portcullis_height / 2),
            (0.105, 0.14, portcullis_height),
            aged_iron,
            bevel=0.015,
        )
        cone_instance(
            modules,
            "raised-portcullis-tooth",
            f"Portcullis tooth {bar_index + 1}",
            (bar_x, -15.62, portcullis_bottom - 0.16),
            0.14,
            0.34,
            8,
            aged_iron,
            0.025,
            (math.pi, 0.0, 0.0),
        )
    for rail_index, rail_z in enumerate((5.72, 7.28)):
        cube_instance(
            modules,
            "raised-portcullis-rail",
            f"Portcullis cross rail {rail_index + 1}",
            (0.0, -15.64, rail_z),
            (4.15, 0.16, 0.13),
            aged_iron,
            bevel=0.018,
        )

    gable_roof("Gatehouse steep roof", (0, -14.12, 9.82), 7.9, 3.72, 3.72, roof)
    gate_gable_points = [(-3.88, -1.84), (3.88, -1.84), (0.0, 1.84)]
    profile_prism(
        "Gatehouse front gable",
        gate_gable_points,
        0.2,
        plaster,
        (0.0, -15.91, 11.66),
        bevel=0.025,
    )
    for side, label in ((-1, "left"), (1, "right")):
        facade_beam(
            modules,
            "gate-gable-roof-edge",
            f"Gate gable {label} roof edge",
            (0.0, -15.94, 11.66),
            0.0,
            (side * 3.88, -1.84),
            (0.0, 1.84),
            0.16,
            0.18,
            roof,
            -0.08,
        )
        add_lancet_window(
            modules,
            "gate-clerestory-window",
            "gate-clerestory-frame",
            f"Gate clerestory {label}",
            (side * 2.22, -16.05, 10.52),
            math.pi,
            0.44,
            1.48,
            0.1,
            window,
            limestone_light,
            brass,
        )
    add_bear_relief(
        modules,
        "central-bear-seal",
        "Citadel bear seal",
        (0.0, -16.06, 10.95),
        0.92,
        limestone_light,
        brass,
        timber,
    )
    cube("Gatehouse ridge cap", (0.0, -14.12, 13.5), (0.14, 3.85, 0.14), roof, bevel=0.025)
    cube("Weather vane stem", (0.0, -14.12, 14.08), (0.055, 0.055, 1.22), brass, bevel=0.01)
    bat_points = [
        (-0.72, 0.0), (-0.45, 0.23), (-0.2, 0.08), (0.0, 0.26),
        (0.2, 0.08), (0.45, 0.23), (0.72, 0.0), (0.43, -0.19),
        (0.18, -0.06), (0.0, -0.25), (-0.18, -0.06), (-0.43, -0.19),
    ]
    profile_prism("Bat weather vane", bat_points, 0.075, brass, (0.0, -14.12, 14.68), bevel=0.012)
    bat_flight = (
        ("Bat flight 1", (-7.8, 7.4, 12.8), 0.62, 0.9),
        ("Bat flight 2", (6.4, 9.2, 14.0), 0.52, 1.12),
        ("Bat flight 3", (11.2, 11.4, 12.4), 0.72, 0.82),
        ("Bat flight 4", (14.0, 14.2, 10.8), 0.46, 1.04),
    )
    for name, location, scale, wing_lift in bat_flight:
        flight_points = [(x * scale, z * scale * wing_lift) for x, z in bat_points]
        profile_prism(name, flight_points, 0.055, aged_iron, location, bevel=0.006)

    cube("Workshop body", (0, 3.2, 2.5), (9.4, 7.2, 5.0), plaster, bevel=0.11)
    gable_roof("Workshop roof", (0, 3.2, 4.95), 10.15, 7.85, 3.62, roof)
    profile_prism(
        "Workshop front gable",
        [(-4.7, -1.77), (4.7, -1.77), (0.0, 1.77)],
        0.18,
        plaster,
        (0.0, -0.7, 6.75),
        bevel=0.025,
    )
    for side in (-1, 1):
        wedge_instance(
            modules,
            "workshop-corner-buttress",
            f"Workshop corner buttress {'L' if side < 0 else 'R'}",
            (side * 4.36, -0.42, 0.0),
            0.52,
            0.76,
            4.92,
            limestone_light,
            math.pi,
        )
    cube("Workshop chimney", (2.82, 4.35, 7.3), (0.86, 0.86, 3.45), limestone, bevel=0.055)
    cube("Workshop chimney cap", (2.82, 4.35, 9.08), (1.12, 1.12, 0.22), limestone_light, bevel=0.045)
    cylinder("Workshop chimney pot", (2.82, 4.35, 9.48), 0.27, 0.72, 10, roof, bevel=0.025)
    add_lancet_window(
        modules,
        "workshop-door",
        "workshop-door-frame",
        "Workshop door",
        (0.0, -0.52, 1.46),
        math.pi,
        1.28,
        2.78,
        0.18,
        timber,
        limestone_light,
        brass,
        include_tracery=False,
    )

    for post_index in range(8):
        post_x = -4.025 + post_index * 1.15
        cube_instance(
            modules,
            "workshop-bay-pier",
            f"Workshop bay pier {post_index + 1}",
            (post_x, -0.54, 2.48),
            (0.15, 0.22, 4.45),
            limestone_light,
            bevel=0.025,
        )
    cube("Workshop bay plinth", (0.0, -0.55, 0.38), (8.45, 0.28, 0.55), limestone, bevel=0.04)
    cube("Workshop brass conduit", (0.0, -0.7, 2.62), (7.35, 0.07, 0.055), brass, bevel=0.012)

    for index in range(7):
        x = -3.45 + index * 1.15
        add_lancet_window(
            modules,
            "workshop-response-panel",
            "workshop-response-frame",
            f"Workshop response {index + 1}",
            (x, -0.64, 3.58),
            math.pi,
            0.56,
            1.38,
            0.12,
            window,
            limestone_light,
            brass,
        )
        cylinder_instance(
            modules,
            "workshop-response-anchor",
            f"Response anchor {index + 1}",
            (x, -0.76, 4.5),
            0.095,
            0.13,
            10,
            cyan,
            0.012,
            (math.pi / 2, 0.0, 0.0),
        )
        cube_instance(
            modules,
            "workshop-bay-sill",
            f"Workshop bay sill {index + 1}",
            (x, -0.69, 2.79),
            (0.82, 0.3, 0.14),
            timber,
            bevel=0.025,
        )
        cube_instance(
            modules,
            "workshop-bay-conduit",
            f"Workshop bay conduit {index + 1}",
            (x, -0.73, 2.96),
            (0.045, 0.075, 0.32),
            brass,
            bevel=0.01,
        )
    add_lancet_window(
        modules,
        "workshop-gable-light",
        "workshop-gable-light-frame",
        "Workshop gable light",
        (0.0, -0.82, 6.42),
        math.pi,
        0.92,
        1.82,
        0.11,
        window,
        limestone_light,
        brass,
    )
    cylinder(
        "Workshop forge wheel",
        (3.62, -0.76, 1.6),
        0.48,
        0.14,
        12,
        brass,
        bevel=0.018,
        rotation=(math.pi / 2, 0.0, 0.0),
    )
    cylinder(
        "Workshop forge wheel hub",
        (3.62, -0.85, 1.6),
        0.15,
        0.12,
        10,
        timber,
        bevel=0.015,
        rotation=(math.pi / 2, 0.0, 0.0),
    )

    for index, y in enumerate((-18.5, -14.6, -10.5, -6.2, -1.8)):
        width = 5.2 - index * 0.35
        cube(f"Approach stone {index + 1}", (0, y, 0.06), (width, 3.4, 0.16), path, bevel=0.06)

    for paw_index, (paw_x, paw_y) in enumerate(((-0.62, -18.6), (0.54, -14.7), (-0.42, -10.55))):
        cylinder_instance(
            modules,
            "approach-bear-paw-pad",
            f"Approach bear paw {paw_index + 1} pad",
            (paw_x, paw_y, 0.17),
            0.23,
            0.025,
            12,
            brass,
            0.008,
        )
        for toe_index, (toe_x, toe_y) in enumerate(((-0.24, 0.18), (-0.08, 0.27), (0.08, 0.27), (0.24, 0.18))):
            cylinder_instance(
                modules,
                "approach-bear-paw-toe",
                f"Approach bear paw {paw_index + 1} toe {toe_index + 1}",
                (paw_x + toe_x, paw_y + toe_y, 0.17),
                0.085,
                0.025,
                10,
                brass,
                0.006,
            )

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

    triangulate_textured_meshes()

    # Metadata keeps the legacy runtime-facing representatives from being
    # absorbed into broader material joins during glTF optimization.
    for contract_index, node_name in enumerate((
        "Approach stone 1",
        "Far Carpathians",
        "Gate arch",
        "Gate brass line L",
        "Gate left pier",
        "Gate shadow pocket",
        "Gate tower L",
        "Gate tower roof L",
        "Gate upper beam",
        "Inhabited ring 00",
        "Inhabited ring 01",
        "Near ridge",
        "Response anchor 1",
        "Ring roof 00",
        "Terrain",
        "Tower slit L",
    )):
        obj = bpy.data.objects.get(node_name)
        if obj:
            obj.data = obj.data.copy()
            obj.data.attributes.new(
                name=f"_CONTRACT_{contract_index:02d}",
                type="FLOAT",
                domain="POINT",
            )
            obj["asset_contract"] = node_name


def setup_lighting_and_camera() -> None:
    world = bpy.context.scene.world or bpy.data.worlds.new("Blue hour")
    bpy.context.scene.world = world
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    if background:
        background.inputs["Color"].default_value = hex_color("#081012")
        background.inputs["Strength"].default_value = 0.42

    sun_data = bpy.data.lights.new(name="Cold blue-hour sun", type="SUN")
    sun_data.color = hex_color("#b8cbc9")[:3]
    sun_data.energy = 2.65
    sun_data.angle = math.radians(18)
    sun = bpy.data.objects.new("Cold blue-hour sun", sun_data)
    sun.rotation_euler = (math.radians(38), math.radians(-24), math.radians(-28))
    bpy.context.collection.objects.link(sun)

    area_data = bpy.data.lights.new(name="Warm gate wash", type="AREA")
    area_data.color = hex_color("#d6ba80")[:3]
    area_data.energy = 1650
    area_data.shape = "DISK"
    area_data.size = 10
    area = bpy.data.objects.new("Warm gate wash", area_data)
    area.location = (-6.5, -21.0, 13.0)
    look_at(area, (0, -8, 3.8))
    bpy.context.collection.objects.link(area)

    point_light("Workshop occupation", (0, 0.2, 4.0), "#e5bb6f", 950, 4.0)
    point_light("Gate signal", (0, -15.0, 5.0), "#69d9d5", 620, 2.0)

    fill_data = bpy.data.lights.new(name="Camera-side mineral fill", type="AREA")
    fill_data.color = hex_color("#9bc4c1")[:3]
    fill_data.energy = 1150
    fill_data.shape = "DISK"
    fill_data.size = 15
    fill = bpy.data.objects.new("Camera-side mineral fill", fill_data)
    fill.location = (20.0, -19.0, 15.0)
    look_at(fill, (5.5, -1.0, 4.0))
    bpy.context.collection.objects.link(fill)

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
    scene.view_settings.exposure = 0.62


def export_and_render() -> None:
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_FILE))
    bpy.ops.export_scene.gltf(
        filepath=str(RAW_GLB),
        export_format="GLB",
        export_yup=True,
        export_apply=True,
        export_attributes=True,
        export_tangents=True,
        export_materials="EXPORT",
        export_extras=True,
        export_cameras=False,
        export_lights=False,
        export_animations=False,
    )
    bpy.ops.render.render(write_still=True)


def main() -> None:
    clear_scene()
    build_world()
    add_box_uvs()
    setup_lighting_and_camera()
    configure_output()
    export_and_render()
    print(f"Built {RAW_GLB}")
    print(f"Rendered {POSTER}")


if __name__ == "__main__":
    main()
