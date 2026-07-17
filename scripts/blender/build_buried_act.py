"""Build the Qin-inspired Buried act mausoleum for chapters 08-10.

Run with Blender 5.2.0:
  blender --background --python-exit-code 1 --python scripts/blender/build_buried_act.py

The scene is authored in Three.js coordinates and converted to Blender's Z-up
space at construction time. The builder exports a transient raw GLB, optimizes
the public artifact with gltf-transform Meshopt, validates the runtime contract,
and removes the raw file before exiting.
"""

from __future__ import annotations

from collections import Counter
import json
import math
from pathlib import Path
import struct
import subprocess

import bmesh
import bpy
from mathutils import Matrix, Quaternion, Vector


ROOT = Path(__file__).resolve().parents[2]
PUBLIC_DIR = ROOT / "public" / "assets" / "world" / "buried-act"
RAW_GLB = PUBLIC_DIR / "buried-mausoleum.raw.glb"
OUTPUT_GLB = PUBLIC_DIR / "buried-mausoleum.glb"
GLTF_TRANSFORM = ROOT / "node_modules" / ".bin" / "gltf-transform"

REQUIRED_NODES = (
    "VS08_10_Buried_ROOT",
    "ENV_Buried_SchoolFold",
    "ENV_Buried_Descent",
    "ENV_Buried_LampChamber",
    "ENV_Buried_EvidenceGallery",
    "ENV_Buried_RoyalHall",
    "ENV_Buried_PixelGate",
    "PRP_Buried_LampRig",
    "PRP_Buried_LampIris",
    "PRP_Buried_Mechanism",
    "PRP_Buried_MechanismWheel",
    "PRP_Buried_Counterweight",
    "PRP_Buried_OilReservoir",
    "PRP_Buried_MercuryBasin",
    "PRP_Buried_GuardPair",
    "PRP_Buried_PixelCore",
    "SCR_Buried_Mechanism",
    "SCR_Buried_Guards",
    "SCR_Buried_Mercury",
    "SCR_Buried_RoyalHall",
    "FX_Buried_SchoolResidue",
    "FX_Buried_MercuryChannels",
    "FX_Buried_VapourVolume",
    "FX_Buried_LampCone",
    "FX_Buried_PixelCompression",
    "ANC_Buried_Entry",
    "ANC_Buried_OilFocus",
    "ANC_Buried_MechanismFocus",
    "ANC_Buried_MercuryFocus",
    "ANC_Buried_GuardsEvidence",
    "ANC_Buried_MercuryEvidence",
    "ANC_Buried_RoyalHallEvidence",
    "ANC_Buried_PixelHandoff",
)

MEDIA_SPECS = {
    "SCR_Buried_Mechanism": {
        "aperture": "APT_Buried_Mechanism",
        "position": (7.12, -0.65, -160.45),
        "camera": (0.0, -0.65, -160.45),
        "width": 3.56,
        "height": 2.0,
        "slot": "buried-mechanism",
    },
    "SCR_Buried_Guards": {
        "aperture": "APT_Buried_Guards",
        "position": (-5.28, -0.75, -169.65),
        "camera": (0.0, -0.75, -169.65),
        "width": 3.56,
        "height": 2.0,
        "slot": "buried-guards",
    },
    "SCR_Buried_Mercury": {
        "aperture": "APT_Buried_Mercury",
        "position": (5.28, -0.75, -177.75),
        "camera": (0.0, -0.75, -177.75),
        "width": 3.56,
        "height": 2.0,
        "slot": "buried-mercury",
    },
    "SCR_Buried_RoyalHall": {
        "aperture": "APT_Buried_RoyalHall",
        "position": (-7.38, -0.55, -188.15),
        "camera": (0.0, -0.55, -188.15),
        "width": 4.0,
        "height": 2.25,
        "slot": "buried-royal-hall",
    },
}

PUBLIC_DIR.mkdir(parents=True, exist_ok=True)


def three_position(value: tuple[float, float, float]) -> tuple[float, float, float]:
    """Three.js (x, y, z) -> Blender (x, -z, y)."""
    x, y, z = value
    return (x, -z, y)


def blender_position(value: Vector) -> Vector:
    """Blender (x, y, z) -> Three.js (x, z, -y)."""
    return Vector((value.x, value.z, -value.y))


def three_dimensions(value: tuple[float, float, float]) -> tuple[float, float, float]:
    x, y, z = value
    return (x, z, y)


THREE_TO_BLENDER = Matrix(((1.0, 0.0, 0.0), (0.0, 0.0, -1.0), (0.0, 1.0, 0.0)))


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.materials,
        bpy.data.images,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for item in list(collection):
            collection.remove(item)


def hex_color(value: str, alpha: float = 1.0) -> tuple[float, float, float, float]:
    value = value.lstrip("#")
    return tuple(int(value[index:index + 2], 16) / 255 for index in (0, 2, 4)) + (alpha,)


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
        value = math.sin(wrapped_x * 127.1 + wrapped_y * 311.7 + seed * 73.9) * 43758.5453
        return value - math.floor(value)

    a = sample(x0, y0)
    b = sample(x0 + 1, y0)
    c = sample(x0, y0 + 1)
    d = sample(x0 + 1, y0 + 1)
    return (a * (1.0 - tx) + b * tx) * (1.0 - ty) + (c * (1.0 - tx) + d * tx) * ty


def surface_height(profile: str, u: float, v: float) -> float:
    broad = tiled_noise(u, v, 3, 1.3)
    medium = tiled_noise(u, v, 9, 4.7)
    fine = tiled_noise(u, v, 21, 8.9)
    if profile == "earth":
        course = 0.5 + 0.5 * math.sin(math.tau * (v * 5.0 + medium * 0.12))
        ram = abs(math.sin(math.tau * (u * 2.0 + v * 0.7 + broad * 0.22)))
        return broad * 0.34 + medium * 0.25 + fine * 0.09 + course * 0.2 + ram * 0.12
    if profile == "stone":
        vein = 0.5 + 0.5 * math.sin(math.tau * (u * 1.5 + v * 2.7 + medium * 0.24))
        return broad * 0.42 + medium * 0.28 + fine * 0.1 + vein * 0.2
    if profile == "timber":
        warp = tiled_noise(u, v, 4, 12.1) * 0.2
        grain = 0.5 + 0.5 * math.sin(math.tau * (u * 13.0 + warp + v * 0.3))
        return broad * 0.22 + medium * 0.19 + fine * 0.08 + grain * 0.51
    if profile == "terracotta":
        scrape = abs(math.sin(math.tau * (u * 4.0 + v * 1.4 + medium * 0.15)))
        return broad * 0.36 + medium * 0.3 + fine * 0.16 + scrape * 0.18
    tarnish = tiled_noise(u, v, 6, 19.7)
    scratches = 0.5 + 0.5 * math.sin(math.tau * (u * 18.0 + v * 2.0))
    return broad * 0.28 + medium * 0.23 + tarnish * 0.37 + scratches * 0.12


def make_generated_image(name: str, size: int, pixels: list[float], color_space: str) -> bpy.types.Image:
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
    size: int = 64,
) -> tuple[list[float], bpy.types.Image, bpy.types.Image]:
    heights = [surface_height(profile, x / size, y / size) for y in range(size) for x in range(size)]
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
            length = math.sqrt(nx * nx + ny * ny + 1.0)
            normal_pixels.extend((nx / length * 0.5 + 0.5, ny / length * 0.5 + 0.5, 1.0 / length * 0.5 + 0.5, 1.0))
            local_roughness = max(0.05, min(1.0, roughness + (height - 0.5) * 0.12))
            occlusion = max(0.7, min(1.0, 0.92 + (height - 0.5) * 0.15))
            local_metallic = max(0.0, min(1.0, metallic - max(0.0, 0.5 - height) * 0.26))
            orm_pixels.extend((occlusion, local_roughness, local_metallic, 1.0))
    return (
        heights,
        make_generated_image(f"{name} Normal", size, normal_pixels, "Non-Color"),
        make_generated_image(f"{name} ORM", size, orm_pixels, "Non-Color"),
    )


def make_base_color_image(
    name: str,
    heights: list[float],
    low_color: str,
    high_color: str,
    size: int = 64,
) -> bpy.types.Image:
    low = hex_color(low_color)[:3]
    high = hex_color(high_color)[:3]
    pixels: list[float] = []
    for index, height in enumerate(heights):
        u = (index % size) / size
        v = (index // size) / size
        stain = tiled_noise(u, v, 5, 31.4)
        blend = max(0.0, min(1.0, height * 0.78 + stain * 0.22))
        channels = [low[channel] * (1.0 - blend) + high[channel] * blend for channel in range(3)]
        pixels.extend((*channels, 1.0))
    return make_generated_image(f"{name} BaseColor", size, pixels, "sRGB")


def build_texture_library() -> dict[str, dict[str, bpy.types.Image | float]]:
    profile_specs = {
        "earth": (0.95, 0.0, 4.3),
        "stone": (0.9, 0.0, 3.8),
        "timber": (0.78, 0.02, 4.5),
        "terracotta": (0.88, 0.0, 3.5),
        "metal": (0.4, 0.78, 3.0),
    }
    profiles = {
        profile: make_surface_maps(f"Buried {profile.title()}", profile, roughness, metallic, strength)
        for profile, (roughness, metallic, strength) in profile_specs.items()
    }
    variants = {
        "earth": ("earth", "#262721", "#4b473b", 0.42),
        "earth_alt": ("earth", "#303027", "#595244", 0.38),
        "stone_dark": ("stone", "#252927", "#4d514c", 0.38),
        "stone": ("stone", "#4b4d46", "#777467", 0.4),
        "stone_light": ("stone", "#69695f", "#999181", 0.35),
        "timber": ("timber", "#151512", "#353128", 0.48),
        "terracotta": ("terracotta", "#6b392c", "#a35d42", 0.4),
        "terracotta_dark": ("terracotta", "#492a24", "#784334", 0.36),
        "bronze": ("metal", "#34413a", "#756c46", 0.46),
        "iron": ("metal", "#111614", "#343b36", 0.4),
    }
    library: dict[str, dict[str, bpy.types.Image | float]] = {}
    for key, (profile, low, high, strength) in variants.items():
        heights, normal, orm = profiles[profile]
        library[key] = {
            "base": make_base_color_image(f"Buried {key.title()}", heights, low, high),
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
    material.metallic = metallic
    material.roughness = roughness
    material.use_backface_culling = True
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
            base_texture.image = textures["base"]
            base_texture.extension = "REPEAT"
            base_texture.location = (-620, 150)
            links.new(base_texture.outputs["Color"], node.inputs["Base Color"])

            normal_texture = nodes.new("ShaderNodeTexImage")
            normal_texture.image = textures["normal"]
            normal_texture.image.colorspace_settings.name = "Non-Color"
            normal_texture.extension = "REPEAT"
            normal_texture.location = (-620, -120)
            normal_map = nodes.new("ShaderNodeNormalMap")
            normal_map.inputs["Strength"].default_value = float(textures["normal_strength"])
            normal_map.location = (-350, -100)
            links.new(normal_texture.outputs["Color"], normal_map.inputs["Color"])
            links.new(normal_map.outputs["Normal"], node.inputs["Normal"])

            orm_texture = nodes.new("ShaderNodeTexImage")
            orm_texture.image = textures["orm"]
            orm_texture.image.colorspace_settings.name = "Non-Color"
            orm_texture.extension = "REPEAT"
            orm_texture.location = (-620, -400)
            separate = nodes.new("ShaderNodeSeparateColor")
            separate.mode = "RGB"
            separate.location = (-350, -380)
            links.new(orm_texture.outputs["Color"], separate.inputs["Color"])
            links.new(separate.outputs["Green"], node.inputs["Roughness"])
            links.new(separate.outputs["Blue"], node.inputs["Metallic"])
            occlusion = nodes.new("ShaderNodeGroup")
            occlusion.node_tree = gltf_occlusion_group()
            occlusion.location = (-80, -450)
            links.new(separate.outputs["Red"], occlusion.inputs["Occlusion"])
            material["pbr_textured"] = True
    return material


def make_materials() -> dict[str, bpy.types.Material]:
    textures = build_texture_library()
    return {
        "earth": make_material("Rammed earth charcoal", "#3d3b32", 0.95, textures=textures["earth"]),
        "earth_alt": make_material("Rammed earth warm course", "#49453a", 0.94, textures=textures["earth_alt"]),
        "stone_dark": make_material("Mausoleum stone shadow", "#353a37", 0.92, textures=textures["stone_dark"]),
        "stone": make_material("Hand cut limestone", "#66665d", 0.9, textures=textures["stone"]),
        "stone_light": make_material("Worn limestone edge", "#8d8778", 0.84, textures=textures["stone_light"]),
        "timber": make_material("Carbonized timber", "#24221c", 0.8, 0.02, textures=textures["timber"]),
        "timber_mark": make_material("Timber beam impression", "#191a17", 0.94),
        "terracotta": make_material("Muted Qin terracotta", "#8c4f3c", 0.89, textures=textures["terracotta"]),
        "terracotta_dark": make_material("Terracotta recess", "#5c342b", 0.92, textures=textures["terracotta_dark"]),
        "bronze": make_material("Aged burial bronze", "#5e6549", 0.43, 0.72, textures=textures["bronze"]),
        "bronze_edge": make_material("Handled bronze edge", "#9a8754", 0.3, 0.82),
        "iron": make_material("Blackened mechanism iron", "#202724", 0.44, 0.76, textures=textures["iron"]),
        "mercury": make_material("Restrained mercury", "#9cb4b2", 0.11, 0.94, "#b9d9d5", 0.28),
        "lamp": make_material("Lamp amber practical", "#d19a4b", 0.26, 0.12, "#ffb74f", 5.5),
        "oil": make_material("Lamp oil", "#3f321d", 0.2, 0.04),
        "soot": make_material("Sooted recess", "#0e1110", 0.97),
    }


def assign_material(obj: bpy.types.Object, material: bpy.types.Material) -> None:
    obj.data.materials.append(material)


def create_empty(
    name: str,
    parent: bpy.types.Object | None = None,
    position: tuple[float, float, float] = (0.0, 0.0, 0.0),
    display_size: float = 0.35,
) -> bpy.types.Object:
    obj = bpy.data.objects.new(name, None)
    obj.empty_display_type = "PLAIN_AXES"
    obj.empty_display_size = display_size
    obj.location = three_position(position)
    if parent:
        obj.parent = parent
    bpy.context.collection.objects.link(obj)
    return obj


def create_decoration_group(name: str, parent: bpy.types.Object) -> bpy.types.Object:
    group = create_empty(name, parent)
    group["mobileOptional"] = True
    group["runtime_role"] = "dense-decoration"
    return group


def orient_empty_to_camera(
    obj: bpy.types.Object,
    position: tuple[float, float, float],
    camera: tuple[float, float, float],
) -> None:
    normal = (Vector(camera) - Vector(position)).normalized()
    up = Vector((0.0, 1.0, 0.0))
    x_axis = up.cross(normal).normalized()
    y_axis = normal.cross(x_axis).normalized()
    gltf_rotation = Matrix((
        (x_axis.x, y_axis.x, normal.x),
        (x_axis.y, y_axis.y, normal.y),
        (x_axis.z, y_axis.z, normal.z),
    ))
    blender_rotation = THREE_TO_BLENDER @ gltf_rotation @ THREE_TO_BLENDER.transposed()
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = blender_rotation.to_quaternion()


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
    bevel: float = 0.04,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=three_position(position))
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = three_dimensions(dimensions)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.parent = parent
    assign_material(obj, material)
    apply_bevel(obj, min(bevel, min(dimensions) * 0.22), 1)
    return obj


def linked_copy(
    source: bpy.types.Object,
    name: str,
    position: tuple[float, float, float],
    parent: bpy.types.Object,
    scale: tuple[float, float, float] = (1.0, 1.0, 1.0),
) -> bpy.types.Object:
    obj = source.copy()
    obj.data = source.data
    obj.name = name
    obj.location = three_position(position)
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
    apply_bevel(obj, min(bevel, radius * 0.25, depth * 0.2), 1)
    return obj


def cone(
    name: str,
    position: tuple[float, float, float],
    radius1: float,
    radius2: float,
    depth: float,
    material: bpy.types.Material,
    parent: bpy.types.Object,
    vertices: int = 12,
    bevel: float = 0.02,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius1,
        radius2=radius2,
        depth=depth,
        location=three_position(position),
    )
    obj = bpy.context.object
    obj.name = name
    obj.parent = parent
    assign_material(obj, material)
    apply_bevel(obj, min(bevel, radius1 * 0.2, depth * 0.16), 1)
    return obj


def sphere(
    name: str,
    position: tuple[float, float, float],
    radius: float,
    material: bpy.types.Material,
    parent: bpy.types.Object,
    scale: tuple[float, float, float] = (1.0, 1.0, 1.0),
    subdivisions: int = 1,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions, radius=radius, location=three_position(position))
    obj = bpy.context.object
    obj.name = name
    obj.scale = three_dimensions(scale)
    obj.parent = parent
    assign_material(obj, material)
    return obj


def torus(
    name: str,
    position: tuple[float, float, float],
    major_radius: float,
    minor_radius: float,
    material: bpy.types.Material,
    parent: bpy.types.Object,
    major_segments: int = 16,
    minor_segments: int = 6,
    axis: str = "y",
) -> bpy.types.Object:
    rotation = (0.0, 0.0, 0.0)
    if axis == "z":
        rotation = (math.pi / 2, 0.0, 0.0)
    elif axis == "x":
        rotation = (0.0, math.pi / 2, 0.0)
    bpy.ops.mesh.primitive_torus_add(
        major_segments=major_segments,
        minor_segments=minor_segments,
        major_radius=major_radius,
        minor_radius=minor_radius,
        location=three_position(position),
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
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
    resolution: int = 1,
) -> bpy.types.Object:
    curve = bpy.data.curves.new(f"{name}Mesh", "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 1
    curve.bevel_depth = radius
    curve.bevel_resolution = resolution
    curve.resolution_u = 1
    spline = curve.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for point, coordinate in zip(spline.points, points):
        point.co = (*three_position(coordinate), 1.0)
    spline.use_cyclic_u = cyclic
    obj = bpy.data.objects.new(name, curve)
    obj.parent = parent
    assign_material(obj, material)
    bpy.context.collection.objects.link(obj)
    return obj


def beam_between(
    name: str,
    start: tuple[float, float, float],
    end: tuple[float, float, float],
    radius: float,
    material: bpy.types.Material,
    parent: bpy.types.Object,
    vertices: int = 10,
) -> bpy.types.Object:
    start_blender = Vector(three_position(start))
    end_blender = Vector(three_position(end))
    direction = end_blender - start_blender
    midpoint = (start_blender + end_blender) * 0.5
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=direction.length, location=midpoint)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = Vector((0.0, 0.0, 1.0)).rotation_difference(direction.normalized())
    obj.parent = parent
    assign_material(obj, material)
    apply_bevel(obj, min(radius * 0.2, 0.018), 1)
    return obj


def profile_prism(
    name: str,
    points_xy: list[tuple[float, float]],
    center_z: float,
    depth: float,
    material: bpy.types.Material,
    parent: bpy.types.Object,
    bevel: float = 0.02,
) -> bpy.types.Object:
    """Extrude an x/y silhouette through local Three.js z."""
    count = len(points_xy)
    vertices_three = [(x, y, center_z - depth / 2) for x, y in points_xy]
    vertices_three += [(x, y, center_z + depth / 2) for x, y in points_xy]
    vertices = [three_position(vertex) for vertex in vertices_three]
    faces: list[tuple[int, ...]] = [tuple(reversed(range(count))), tuple(range(count, count * 2))]
    for index in range(count):
        nxt = (index + 1) % count
        faces.append((index, nxt, count + nxt, count + index))
    mesh = bpy.data.meshes.new(f"{name}Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    obj.parent = parent
    bpy.context.collection.objects.link(obj)
    assign_material(obj, material)
    apply_bevel(obj, bevel, 1)
    return obj


def annular_wedge_y(
    name: str,
    center_y: float,
    inner_radius: float,
    outer_radius: float,
    start_angle: float,
    end_angle: float,
    depth: float,
    material: bpy.types.Material,
    parent: bpy.types.Object,
    steps: int = 4,
) -> bpy.types.Object:
    points_xz: list[tuple[float, float]] = []
    for index in range(steps + 1):
        angle = start_angle + (end_angle - start_angle) * index / steps
        points_xz.append((math.cos(angle) * outer_radius, math.sin(angle) * outer_radius))
    for index in range(steps, -1, -1):
        angle = start_angle + (end_angle - start_angle) * index / steps
        points_xz.append((math.cos(angle) * inner_radius, math.sin(angle) * inner_radius))
    count = len(points_xz)
    vertices_three = [(x, center_y - depth / 2, z) for x, z in points_xz]
    vertices_three += [(x, center_y + depth / 2, z) for x, z in points_xz]
    vertices = [three_position(vertex) for vertex in vertices_three]
    faces: list[tuple[int, ...]] = [tuple(reversed(range(count))), tuple(range(count, count * 2))]
    for index in range(count):
        nxt = (index + 1) % count
        faces.append((index, nxt, count + nxt, count + index))
    mesh = bpy.data.meshes.new(f"{name}Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    obj.parent = parent
    bpy.context.collection.objects.link(obj)
    assign_material(obj, material)
    apply_bevel(obj, min(depth * 0.18, 0.012), 1)
    return obj


def add_rectangular_gateway(
    name: str,
    z: float,
    floor_y: float,
    half_width: float,
    ceiling_y: float,
    materials: dict[str, bpy.types.Material],
    parent: bpy.types.Object,
) -> None:
    post_height = ceiling_y - floor_y - 0.55
    for side, label in ((-1, "left"), (1, "right")):
        box(
            f"{name} {label} stone post",
            (side * half_width, floor_y + post_height / 2, z),
            (0.72, post_height, 0.78),
            materials["stone"],
            parent,
            0.08,
        )
        box(
            f"{name} {label} worn arris",
            (side * (half_width - 0.37), floor_y + post_height / 2, z - 0.02),
            (0.08, post_height - 0.3, 0.86),
            materials["stone_light"],
            parent,
            0.018,
        )
    box(
        f"{name} stone lintel",
        (0.0, ceiling_y - 0.48, z),
        (half_width * 2 + 0.7, 0.68, 0.92),
        materials["stone"],
        parent,
        0.08,
    )
    box(
        f"{name} timber pressure beam",
        (0.0, ceiling_y - 0.98, z + 0.04),
        (half_width * 2 - 0.45, 0.3, 0.5),
        materials["timber"],
        parent,
        0.045,
    )


def add_axial_shell(
    label: str,
    z_start: float,
    z_end: float,
    half_width: float,
    floor_y: float,
    ceiling_y: float,
    materials: dict[str, bpy.types.Material],
    parent: bpy.types.Object,
    frame_spacing: float = 5.2,
) -> None:
    length = abs(z_end - z_start)
    center_z = (z_start + z_end) * 0.5
    wall_height = ceiling_y - floor_y
    lower_height = min(2.05, wall_height * 0.34)
    upper_height = wall_height - lower_height

    box(
        f"{label} continuous floor bed",
        (0.0, floor_y - 0.19, center_z),
        (half_width * 2, 0.38, length + 0.22),
        materials["stone_dark"],
        parent,
        0.035,
    )
    box(
        f"{label} compressed earth ceiling",
        (0.0, ceiling_y + 0.25, center_z),
        (half_width * 2 + 0.65, 0.5, length + 0.35),
        materials["earth"],
        parent,
        0.055,
    )
    for side, side_label in ((-1, "left"), (1, "right")):
        box(
            f"{label} {side_label} stone lower wall",
            (side * half_width, floor_y + lower_height / 2, center_z),
            (0.7, lower_height, length + 0.2),
            materials["stone"],
            parent,
            0.07,
        )
        box(
            f"{label} {side_label} rammed earth wall",
            (side * half_width, floor_y + lower_height + upper_height / 2, center_z),
            (0.82, upper_height, length + 0.28),
            materials["earth_alt" if side > 0 else "earth"],
            parent,
            0.06,
        )
        box(
            f"{label} {side_label} floor curb",
            (side * (half_width - 0.62), floor_y + 0.15, center_z),
            (0.58, 0.3, length),
            materials["stone_light"],
            parent,
            0.045,
        )

    courses = create_decoration_group(f"DEC_{label}_EarthCourses", parent)
    stone_seams = create_decoration_group(f"DEC_{label}_StoneSeams", parent)
    impressions = create_decoration_group(f"DEC_{label}_TimberImpressions", parent)
    course_count = max(4, int(upper_height / 0.5))
    for side, side_label in ((-1, "L"), (1, "R")):
        inner_x = side * (half_width - 0.425)
        for course in range(course_count):
            y = floor_y + lower_height + (course + 1) * upper_height / (course_count + 1)
            box(
                f"{label} earth course {side_label}-{course + 1:02d}",
                (inner_x, y, center_z),
                (0.035, 0.065, length - 0.14),
                materials["timber_mark" if course % 3 == 1 else "earth"],
                courses,
                0.008,
            )
        for seam_index, seam_z in enumerate((min(z_start, z_end) + 1.4 + index * 2.65 for index in range(max(1, int(length / 2.65))))):
            if seam_z <= min(z_start, z_end) or seam_z >= max(z_start, z_end):
                continue
            box(
                f"{label} lower block joint {side_label}-{seam_index + 1:02d}",
                (inner_x, floor_y + lower_height * 0.5, seam_z),
                (0.04, lower_height - 0.16, 0.055),
                materials["stone_dark"],
                stone_seams,
                0.006,
            )
        box(
            f"{label} horizontal stone bed {side_label}",
            (inner_x, floor_y + lower_height * 0.52, center_z),
            (0.04, 0.055, length - 0.12),
            materials["stone_dark"],
            stone_seams,
            0.006,
        )
        impression_count = max(2, int(length / 3.3))
        for index in range(impression_count):
            z = min(z_start, z_end) + 1.2 + index * (length - 2.4) / max(1, impression_count - 1)
            box(
                f"{label} beam pocket {side_label}-{index + 1:02d}",
                (inner_x, floor_y + lower_height + upper_height * 0.54, z),
                (0.035, min(1.35, upper_height * 0.42), 0.28),
                materials["timber_mark"],
                impressions,
                0.012,
            )

    frame_count = max(1, int(length / frame_spacing))
    for index in range(frame_count + 1):
        z = min(z_start, z_end) + min(length - 0.55, 0.55 + index * length / max(1, frame_count))
        box(
            f"{label} ceiling beam {index + 1:02d}",
            (0.0, ceiling_y - 0.16, z),
            (half_width * 2 - 0.82, 0.36, 0.44),
            materials["timber"],
            parent,
            0.045,
        )
        for side, side_label in ((-1, "L"), (1, "R")):
            box(
                f"{label} timber wall post {side_label}-{index + 1:02d}",
                (side * (half_width - 0.62), floor_y + wall_height * 0.61, z),
                (0.32, wall_height * 0.68, 0.36),
                materials["timber"],
                parent,
                0.045,
            )

    slab_count = max(2, int(length / 2.25))
    slab_length = length / slab_count
    slab_source: bpy.types.Object | None = None
    for index in range(slab_count):
        z = min(z_start, z_end) + slab_length * (index + 0.5)
        if slab_source is None:
            slab_source = box(
                f"{label} floor slab 01",
                (0.0, floor_y + 0.025, z),
                (half_width * 1.35, 0.05, slab_length - 0.08),
                materials["stone"],
                parent,
                0.012,
            )
        else:
            linked_copy(slab_source, f"{label} floor slab {index + 1:02d}", (0.0, floor_y + 0.025, z), parent)


def clear_aperture_blockers(
    environment: bpy.types.Object,
    position: tuple[float, float, float],
    outer_width: float,
) -> None:
    blocker_terms = (
        "timber wall post",
        "acoustic rib",
        "rib bronze datum",
        "mass pier",
        "pier foot",
        "pier collar",
        "earth buttress",
        "dressed stone shoe",
        "timber bearing block",
    )
    side = -1 if position[0] < 0 else 1
    half_span = outer_width * 0.5 + 0.22
    for child in list(environment.children):
        if child.type != "MESH" or not any(term in child.name.lower() for term in blocker_terms):
            continue
        child_position = blender_position(child.location)
        if child_position.x * side <= 0 or abs(child_position.z - position[2]) > half_span:
            continue
        bpy.data.objects.remove(child, do_unlink=True)


def add_media_aperture(
    screen_name: str,
    materials: dict[str, bpy.types.Material],
    environment: bpy.types.Object,
) -> bpy.types.Object:
    spec = MEDIA_SPECS[screen_name]
    position = spec["position"]
    camera = spec["camera"]
    width = float(spec["width"])
    height = float(spec["height"])
    outer_width = width + 1.12
    clear_aperture_blockers(environment, position, outer_width)
    aperture = create_empty(str(spec["aperture"]), environment, position, 0.5)
    aperture["physicalAperture"] = True
    aperture["apertureId"] = str(spec["slot"])
    aperture["intendedCamera"] = list(camera)
    orient_empty_to_camera(aperture, position, camera)

    outer_height = height + 1.02
    for side, label in ((-1, "left"), (1, "right")):
        box(
            f"{screen_name} {label} outer reveal",
            (side * (width / 2 + 0.4), 0.0, -0.08),
            (0.56, outer_height, 0.72),
            materials["stone"],
            aperture,
            0.065,
        )
        box(
            f"{screen_name} {label} inner arris",
            (side * (width / 2 + 0.13), 0.0, 0.08),
            (0.16, height + 0.32, 0.38),
            materials["stone_light"],
            aperture,
            0.028,
        )
        box(
            f"{screen_name} parked {label} shutter",
            (side * (width / 2 + 0.67), 0.0, 0.32),
            (0.22, height * 0.92, 0.12),
            materials["iron"],
            aperture,
            0.025,
        )
        for rivet_index in range(4):
            cylinder(
                f"{screen_name} {label} shutter rivet {rivet_index + 1}",
                (side * (width / 2 + 0.67), -height * 0.34 + rivet_index * height * 0.225, 0.4),
                0.035,
                0.055,
                materials["bronze_edge"],
                aperture,
                8,
                "z",
                0.006,
            )
    for vertical, label in ((-1, "sill"), (1, "lintel")):
        box(
            f"{screen_name} stone {label}",
            (0.0, vertical * (height / 2 + 0.37), -0.08),
            (outer_width, 0.52, 0.72),
            materials["stone"],
            aperture,
            0.065,
        )
        box(
            f"{screen_name} inner {label} edge",
            (0.0, vertical * (height / 2 + 0.13), 0.08),
            (width + 0.32, 0.16, 0.38),
            materials["stone_light"],
            aperture,
            0.028,
        )
        box(
            f"{screen_name} bronze shutter rail {label}",
            (0.0, vertical * (height / 2 + 0.22), 0.34),
            (width + 0.92, 0.07, 0.08),
            materials["bronze"],
            aperture,
            0.014,
        )

    screen = create_empty(screen_name, aperture, (0.0, 0.0, 0.12), 0.28)
    screen["runtime_role"] = "external-media-anchor"
    screen["mediaSlot"] = str(spec["slot"])
    screen["mediaWidth"] = width
    screen["mediaHeight"] = height
    screen["plane"] = "local-xy-normal-plus-z"
    return aperture


def build_school_fold(
    root: bpy.types.Object,
    materials: dict[str, bpy.types.Material],
) -> bpy.types.Object:
    environment = create_empty("ENV_Buried_SchoolFold", root)
    environment["chapter"] = "08-rule-descent"
    environment["zoneBoundsZ"] = [-123.7, -130.2]
    add_axial_shell(
        "BuriedSchoolFold",
        -123.7,
        -130.2,
        4.8,
        0.0,
        6.15,
        materials,
        environment,
        3.0,
    )
    add_rectangular_gateway("School fold entry", -124.2, 0.0, 3.45, 6.15, materials, environment)
    add_rectangular_gateway("School fold mineral gate", -129.55, 0.0, 3.15, 5.85, materials, environment)

    residue = create_empty("FX_Buried_SchoolResidue", environment, (0.0, 0.0, -124.0))
    residue["runtime_role"] = "school-rail-fold"
    residue["oxidationProgress"] = 1.0
    curve_tube(
        "Inherited request rail",
        [(-3.2, 1.22, 0.15), (-2.25, 1.22, -0.45), (-1.45, 1.02, -1.25), (-0.72, 0.58, -2.3), (0.0, 0.11, -4.55)],
        0.095,
        materials["bronze"],
        residue,
        resolution=2,
    )
    curve_tube(
        "Handled edge on folding rail",
        [(-3.2, 1.25, 0.15), (-2.25, 1.25, -0.45), (-1.45, 1.05, -1.25)],
        0.026,
        materials["bronze_edge"],
        residue,
        resolution=1,
    )
    for index, (x, y, z, width) in enumerate((
        (-3.7, 1.8, -0.3, 1.25),
        (3.55, 1.45, -1.25, 1.0),
        (-3.3, 0.8, -2.35, 0.72),
        (3.05, 0.55, -3.25, 0.54),
    )):
        box(
            f"School plaster residue {index + 1}",
            (x, y, z),
            (0.08, 0.62 + index * 0.12, width),
            materials["stone_light"],
            residue,
            0.018,
        )
    return environment


def add_guard(
    name: str,
    x: float,
    materials: dict[str, bpy.types.Material],
    pair: bpy.types.Object,
) -> bpy.types.Object:
    guard = create_empty(name, pair, (x, 0.0, 0.0), 0.24)
    for side, label in ((-1, "left"), (1, "right")):
        box(
            f"{name} {label} foot",
            (side * 0.22, 0.12, 0.11),
            (0.34, 0.24, 0.62),
            materials["terracotta_dark"],
            guard,
            0.07,
        )
        box(
            f"{name} {label} leg",
            (side * 0.2, 0.69, 0.0),
            (0.34, 0.95, 0.42),
            materials["terracotta"],
            guard,
            0.09,
        )
    profile_prism(
        f"{name} armored skirt",
        [(-0.62, 0.86), (0.62, 0.86), (0.48, 1.82), (-0.42, 1.82)],
        0.0,
        0.62,
        materials["terracotta_dark"],
        guard,
        0.055,
    )
    profile_prism(
        f"{name} torso",
        [(-0.48, 1.68), (0.48, 1.68), (0.57, 2.52), (0.36, 2.92), (-0.36, 2.92), (-0.57, 2.52)],
        0.0,
        0.55,
        materials["terracotta"],
        guard,
        0.075,
    )
    for row in range(4):
        box(
            f"{name} lamellar course {row + 1}",
            (0.0, 1.94 + row * 0.2, 0.31),
            (0.8 - row * 0.04, 0.085, 0.06),
            materials["terracotta_dark"],
            guard,
            0.014,
        )
    beam_between(
        f"{name} left folded arm",
        (-0.45, 2.62, 0.0),
        (-0.18, 1.92, 0.38),
        0.17,
        materials["terracotta"],
        guard,
        8,
    )
    beam_between(
        f"{name} right folded arm",
        (0.45, 2.62, 0.0),
        (0.18, 1.92, 0.38),
        0.17,
        materials["terracotta"],
        guard,
        8,
    )
    sphere(f"{name} head", (0.0, 3.37, 0.02), 0.43, materials["terracotta"], guard, (0.82, 1.04, 0.78), 1)
    box(f"{name} cap", (0.0, 3.76, -0.02), (0.84, 0.18, 0.62), materials["terracotta_dark"], guard, 0.07)
    box(f"{name} nose plane", (0.0, 3.35, 0.36), (0.12, 0.22, 0.12), materials["terracotta_dark"], guard, 0.02)
    box(f"{name} brow plane", (0.0, 3.52, 0.34), (0.46, 0.08, 0.08), materials["terracotta_dark"], guard, 0.015)
    return guard


def build_guard_pair(
    root: bpy.types.Object,
    materials: dict[str, bpy.types.Material],
) -> bpy.types.Object:
    pair = create_empty("PRP_Buried_GuardPair", root, (0.0, -2.25, -141.05), 0.5)
    pair["runtime_role"] = "terracotta-sentries"
    pair["guardCount"] = 2
    pair["style"] = "restrained-low-poly"
    add_guard("Buried guard left", -2.52, materials, pair)
    add_guard("Buried guard right", 2.52, materials, pair)
    box("Guard pair shared stone plinth", (0.0, -0.08, 0.0), (6.25, 0.16, 1.35), materials["stone_dark"], pair, 0.045)
    return pair


def build_descent(
    root: bpy.types.Object,
    materials: dict[str, bpy.types.Material],
) -> bpy.types.Object:
    environment = create_empty("ENV_Buried_Descent", root)
    environment["chapter"] = "08-rule-descent"
    environment["zoneBoundsZ"] = [-130.0, -146.0]
    courses = create_decoration_group("DEC_BuriedDescent_EarthCourses", environment)
    impressions = create_decoration_group("DEC_BuriedDescent_TimberImpressions", environment)
    step_depth = 1.32
    step_count = 12
    for index in range(step_count):
        z = -130.0 - step_depth * (index + 0.5)
        floor_y = -0.25 * (index + 1)
        ceiling_y = 5.72 - index * 0.055
        box(
            f"Mineral descent tread {index + 1:02d}",
            (0.0, floor_y - 0.15, z),
            (7.7, 0.3, step_depth + 0.05),
            materials["stone" if index % 3 else "stone_light"],
            environment,
            0.035,
        )
        for side, label in ((-1, "L"), (1, "R")):
            box(
                f"Descent lower wall {label}-{index + 1:02d}",
                (side * 4.22, floor_y + 0.86, z),
                (0.68, 1.72, step_depth + 0.08),
                materials["stone"],
                environment,
                0.06,
            )
            upper_height = ceiling_y - (floor_y + 1.72)
            box(
                f"Descent earth wall {label}-{index + 1:02d}",
                (side * 4.22, floor_y + 1.72 + upper_height / 2, z),
                (0.8, upper_height, step_depth + 0.1),
                materials["earth_alt" if (index + (side > 0)) % 2 else "earth"],
                environment,
                0.055,
            )
            inner_x = side * 3.805
            for course in range(5):
                box(
                    f"Descent course {label}-{index + 1:02d}-{course + 1}",
                    (inner_x, floor_y + 2.05 + course * 0.58, z),
                    (0.035, 0.055, step_depth - 0.08),
                    materials["timber_mark"],
                    courses,
                    0.006,
                )
            if index % 2 == 0:
                box(
                    f"Descent beam imprint {label}-{index + 1:02d}",
                    (inner_x, floor_y + 3.65, z),
                    (0.035, 1.25, 0.3),
                    materials["timber_mark"],
                    impressions,
                    0.012,
                )
        box(
            f"Descent overhead compression slab {index + 1:02d}",
            (0.0, ceiling_y + 0.2, z),
            (8.7, 0.4, step_depth + 0.08),
            materials["earth"],
            environment,
            0.05,
        )
        if index in {1, 4, 7, 10}:
            add_rectangular_gateway(
                f"Descent pressure frame {index + 1:02d}",
                z,
                floor_y,
                3.48,
                ceiling_y,
                materials,
                environment,
            )
    build_guard_pair(root, materials)
    return environment


def build_lamp_rig(
    root: bpy.types.Object,
    materials: dict[str, bpy.types.Material],
) -> bpy.types.Object:
    lamp = create_empty("PRP_Buried_LampRig", root, (0.0, -3.0, -154.15), 0.5)
    lamp["runtime_role"] = "raiseable-lamp"
    lamp["runtime_animation"] = "position.y"
    lamp["restY"] = 0.0
    lamp["raisedY"] = 2.15
    lamp["canonicalState"] = "raised-after-command-or-scroll"

    cylinder("Lamp stone foot", (0.0, 0.12, 0.0), 0.72, 0.24, materials["stone_dark"], lamp, 16, "y", 0.045)
    cylinder("Lamp bronze foot ring", (0.0, 0.29, 0.0), 0.54, 0.14, materials["bronze"], lamp, 18, "y", 0.025)
    cylinder("Lamp central stem", (0.0, 1.03, 0.0), 0.12, 1.46, materials["bronze"], lamp, 12, "y", 0.018)
    cone("Lamp oil cup", (0.0, 1.66, 0.0), 0.61, 0.42, 0.38, materials["bronze"], lamp, 18, 0.025)
    cylinder("Lamp visible oil surface", (0.0, 1.875, 0.0), 0.39, 0.035, materials["oil"], lamp, 18, "y", 0.006)
    torus("Lamp bowl handled rim", (0.0, 1.86, 0.0), 0.48, 0.055, materials["bronze_edge"], lamp, 20, 6, "y")
    for side, label in ((-1, "left"), (1, "right")):
        beam_between(
            f"Lamp {label} cage strut",
            (side * 0.42, 1.78, 0.0),
            (side * 0.22, 2.42, 0.0),
            0.045,
            materials["bronze"],
            lamp,
            8,
        )
    curve_tube(
        "Lamp lifting handle",
        [(-0.5, 1.86, 0.0), (-0.57, 2.34, 0.0), (-0.32, 2.72, 0.0), (0.0, 2.84, 0.0), (0.32, 2.72, 0.0), (0.57, 2.34, 0.0), (0.5, 1.86, 0.0)],
        0.055,
        materials["bronze"],
        lamp,
        resolution=2,
    )
    sphere("Lamp flame", (0.0, 2.18, 0.0), 0.19, materials["lamp"], lamp, (0.72, 1.65, 0.72), 2)

    iris = create_empty("PRP_Buried_LampIris", lamp, (0.0, 2.03, 0.0), 0.3)
    iris["runtime_role"] = "lamp-iris"
    iris["runtime_animation"] = "rotation.y"
    iris["closedRotation"] = 0.46
    iris["openRotation"] = 0.0
    torus("Lamp iris housing", (0.0, 0.0, 0.0), 0.47, 0.07, materials["bronze"], iris, 20, 6, "y")
    blade_count = 7
    for index in range(blade_count):
        start = index / blade_count * math.tau + 0.08
        end = (index + 0.78) / blade_count * math.tau + 0.08
        annular_wedge_y(
            f"Lamp iris blade {index + 1}",
            0.0,
            0.15,
            0.43,
            start,
            end,
            0.055,
            materials["bronze_edge"],
            iris,
            3,
        )

    cone_fx = create_empty("FX_Buried_LampCone", lamp, (0.0, 2.2, 0.0), 0.4)
    cone_fx["runtime_role"] = "authored-practical-cone"
    cone_fx["coneAngle"] = 0.58
    cone_fx["coneRange"] = 12.0
    cone_fx["shadowCaster"] = True
    return lamp


def build_oil_reservoir(
    root: bpy.types.Object,
    materials: dict[str, bpy.types.Material],
) -> bpy.types.Object:
    reservoir = create_empty("PRP_Buried_OilReservoir", root, (-4.15, -3.0, -153.65), 0.42)
    reservoir["runtime_role"] = "oil-evidence"
    reservoir["oilState"] = "finite"
    cylinder("Oil reservoir stone cradle", (0.0, 0.12, 0.0), 0.9, 0.24, materials["stone_dark"], reservoir, 16, "y", 0.05)
    cone("Oil reservoir vessel", (0.0, 1.03, 0.0), 0.73, 0.48, 1.52, materials["terracotta_dark"], reservoir, 16, 0.045)
    torus("Oil reservoir lower bronze band", (0.0, 0.58, 0.0), 0.62, 0.055, materials["bronze"], reservoir, 18, 6, "y")
    torus("Oil reservoir upper bronze band", (0.0, 1.47, 0.0), 0.49, 0.05, materials["bronze"], reservoir, 18, 6, "y")
    cylinder("Oil reservoir neck", (0.0, 1.75, 0.0), 0.3, 0.36, materials["terracotta"], reservoir, 14, "y", 0.025)
    torus("Oil reservoir lip", (0.0, 1.95, 0.0), 0.33, 0.055, materials["bronze_edge"], reservoir, 16, 5, "y")
    cylinder("Oil level sight housing", (0.66, 1.15, 0.16), 0.09, 1.05, materials["bronze"], reservoir, 10, "y", 0.012)
    cylinder("Oil level sight", (0.66, 1.08, 0.17), 0.047, 0.7, materials["oil"], reservoir, 10, "y", 0.006)
    curve_tube(
        "Oil feed capillary",
        [(0.64, 0.55, 0.0), (1.35, 0.34, 0.0), (2.6, 0.28, -0.18), (4.15, 0.44, -0.5)],
        0.045,
        materials["bronze"],
        reservoir,
        resolution=1,
    )
    return reservoir


def build_mechanism(
    root: bpy.types.Object,
    materials: dict[str, bpy.types.Material],
) -> bpy.types.Object:
    mechanism = create_empty("PRP_Buried_Mechanism", root, (3.15, -3.0, -153.55), 0.6)
    mechanism["runtime_role"] = "lamp-pulley-system"
    mechanism["mechanicalOrder"] = "wheel-counterweight-lamp"
    for side, label in ((-1, "left"), (1, "right")):
        box(
            f"Mechanism {label} timber upright",
            (side * 2.05, 2.65, 0.0),
            (0.42, 5.3, 0.55),
            materials["timber"],
            mechanism,
            0.055,
        )
        cylinder(
            f"Mechanism {label} stone socket",
            (side * 2.05, 0.18, 0.0),
            0.5,
            0.36,
            materials["stone"],
            mechanism,
            12,
            "y",
            0.045,
        )
    box("Mechanism timber crown beam", (0.0, 5.25, 0.0), (4.75, 0.48, 0.68), materials["timber"], mechanism, 0.065)
    beam_between("Mechanism left brace", (-2.0, 3.95, 0.0), (-1.08, 5.15, 0.0), 0.16, materials["timber"], mechanism, 10)
    beam_between("Mechanism right brace", (2.0, 3.95, 0.0), (1.08, 5.15, 0.0), 0.16, materials["timber"], mechanism, 10)

    wheel = create_empty("PRP_Buried_MechanismWheel", mechanism, (-0.72, 4.48, 0.0), 0.44)
    wheel["runtime_role"] = "pulley-wheel"
    wheel["runtime_animation"] = "rotation.z"
    wheel["turnsOnRaise"] = 1.25
    torus("Main pulley bronze tyre", (0.0, 0.0, 0.0), 0.76, 0.11, materials["bronze"], wheel, 22, 7, "z")
    torus("Main pulley rope groove", (0.0, 0.0, 0.04), 0.61, 0.035, materials["iron"], wheel, 20, 5, "z")
    cylinder("Main pulley axle", (0.0, 0.0, 0.0), 0.18, 0.86, materials["bronze_edge"], wheel, 14, "z", 0.025)
    for index in range(8):
        angle = index / 8 * math.tau
        beam_between(
            f"Main pulley spoke {index + 1}",
            (0.0, 0.0, 0.0),
            (math.cos(angle) * 0.63, math.sin(angle) * 0.63, 0.0),
            0.055,
            materials["bronze"],
            wheel,
            8,
        )

    torus("Secondary pulley wheel", (1.25, 4.48, 0.0), 0.46, 0.085, materials["bronze"], mechanism, 18, 6, "z")
    cylinder("Secondary pulley axle", (1.25, 4.48, 0.0), 0.13, 0.74, materials["bronze_edge"], mechanism, 12, "z", 0.02)
    for index in range(6):
        angle = index / 6 * math.tau
        beam_between(
            f"Secondary pulley spoke {index + 1}",
            (1.25, 4.48, 0.0),
            (1.25 + math.cos(angle) * 0.36, 4.48 + math.sin(angle) * 0.36, 0.0),
            0.04,
            materials["bronze"],
            mechanism,
            8,
        )

    counterweight = create_empty("PRP_Buried_Counterweight", mechanism, (1.32, 1.55, 0.0), 0.36)
    counterweight["runtime_role"] = "counterweight"
    counterweight["runtime_animation"] = "position.y"
    counterweight["travel"] = 2.15
    profile_prism(
        "Counterweight dressed stone",
        [(-0.5, -0.9), (0.5, -0.9), (0.64, 0.55), (0.34, 0.88), (-0.34, 0.88), (-0.64, 0.55)],
        0.0,
        0.72,
        materials["stone_dark"],
        counterweight,
        0.065,
    )
    box("Counterweight lower bronze strap", (0.0, -0.5, 0.0), (1.05, 0.14, 0.82), materials["bronze"], counterweight, 0.025)
    box("Counterweight upper bronze strap", (0.0, 0.43, 0.0), (1.12, 0.14, 0.82), materials["bronze"], counterweight, 0.025)
    torus("Counterweight lifting eye", (0.0, 1.03, 0.0), 0.2, 0.05, materials["bronze_edge"], counterweight, 14, 5, "z")

    curve_tube(
        "Mechanism load rope",
        [(-3.2, 2.66, 0.0), (-1.35, 4.52, 0.0), (-0.72, 5.19, 0.0), (1.25, 4.98, 0.0), (1.32, 3.05, 0.0)],
        0.065,
        materials["iron"],
        mechanism,
        resolution=2,
    )
    chain = create_decoration_group("DEC_Buried_MechanismChain", mechanism)
    for index in range(14):
        torus(
            f"Counterweight chain link {index + 1:02d}",
            (1.32, 3.55 - index * 0.18, 0.0),
            0.105,
            0.025,
            materials["iron"],
            chain,
            10,
            4,
            "z" if index % 2 == 0 else "x",
        )
    return mechanism


def build_mercury_basin(
    root: bpy.types.Object,
    materials: dict[str, bpy.types.Material],
) -> bpy.types.Object:
    basin = create_empty("PRP_Buried_MercuryBasin", root, (3.75, -3.0, -158.7), 0.5)
    basin["runtime_role"] = "mercury-evidence"
    basin["hazard"] = "mercury-vapour"
    box("Mercury basin stone bed", (0.0, 0.14, 0.0), (4.4, 0.28, 2.75), materials["stone_dark"], basin, 0.055)
    box("Mercury basin mirrored surface", (0.0, 0.305, 0.0), (3.55, 0.045, 1.92), materials["mercury"], basin, 0.006)
    for x, z, width, depth, label in (
        (-2.0, 0.0, 0.42, 2.76, "left"),
        (2.0, 0.0, 0.42, 2.76, "right"),
        (0.0, -1.17, 4.4, 0.42, "front"),
        (0.0, 1.17, 4.4, 0.42, "rear"),
    ):
        box(f"Mercury basin {label} curb", (x, 0.45, z), (width, 0.62, depth), materials["stone_light"], basin, 0.055)
    box("Mercury basin measuring bridge", (0.0, 0.78, 0.0), (0.32, 0.18, 2.45), materials["bronze"], basin, 0.03)
    for index, z in enumerate((-0.72, 0.0, 0.72)):
        cylinder(
            f"Mercury depth needle {index + 1}",
            (0.0, 0.48, z),
            0.035,
            0.72,
            materials["bronze_edge"],
            basin,
            8,
            "y",
            0.006,
        )
    vapour = create_empty("FX_Buried_VapourVolume", basin, (0.0, 1.35, 0.0), 0.7)
    vapour["runtime_role"] = "procedural-vapour-volume"
    vapour["volumeWidth"] = 3.6
    vapour["volumeHeight"] = 2.3
    vapour["volumeDepth"] = 2.0
    vapour["reducedMotion"] = "static"
    return basin


def build_lamp_chamber(
    root: bpy.types.Object,
    materials: dict[str, bpy.types.Material],
) -> bpy.types.Object:
    environment = create_empty("ENV_Buried_LampChamber", root)
    environment["chapter"] = "09-lamp-chamber"
    environment["zoneBoundsZ"] = [-145.7, -165.25]
    add_axial_shell("BuriedLampChamber", -145.7, -165.25, 7.5, -3.0, 5.45, materials, environment, 4.6)
    add_rectangular_gateway("Lamp chamber threshold", -146.2, -3.0, 4.7, 5.45, materials, environment)
    add_rectangular_gateway("Lamp chamber gallery gate", -164.72, -3.0, 4.85, 5.25, materials, environment)

    for side, label in ((-1, "left"), (1, "right")):
        for index, z in enumerate((-149.1, -155.2, -161.35)):
            box(
                f"Lamp chamber {label} mass pier {index + 1}",
                (side * 6.28, 0.45, z),
                (1.1, 6.9, 1.22),
                materials["stone"],
                environment,
                0.1,
            )
            box(
                f"Lamp chamber {label} pier foot {index + 1}",
                (side * 6.28, -2.68, z),
                (1.42, 0.64, 1.52),
                materials["stone_light"],
                environment,
                0.07,
            )
            box(
                f"Lamp chamber {label} bronze pier collar {index + 1}",
                (side * 6.28, 2.7, z),
                (1.2, 0.18, 1.3),
                materials["bronze"],
                environment,
                0.03,
            )
    box("Lamp chamber central stone dais", (0.0, -2.78, -154.15), (5.0, 0.44, 5.25), materials["stone_dark"], environment, 0.09)
    box("Lamp chamber dais inset", (0.0, -2.53, -154.15), (3.7, 0.12, 3.9), materials["stone"], environment, 0.035)
    coffer_group = create_decoration_group("DEC_Buried_LampCoffers", environment)
    for row, z in enumerate((-149.3, -152.8, -156.3, -159.8)):
        for side, x in enumerate((-3.4, 0.0, 3.4)):
            box(
                f"Lamp ceiling coffer {row + 1}-{side + 1}",
                (x, 5.13, z),
                (2.5, 0.08, 2.35),
                materials["timber_mark"],
                coffer_group,
                0.018,
            )

    add_media_aperture("SCR_Buried_Mechanism", materials, environment)
    build_lamp_rig(root, materials)
    build_oil_reservoir(root, materials)
    build_mechanism(root, materials)
    build_mercury_basin(root, materials)
    return environment


def build_evidence_gallery(
    root: bpy.types.Object,
    materials: dict[str, bpy.types.Material],
) -> bpy.types.Object:
    environment = create_empty("ENV_Buried_EvidenceGallery", root)
    environment["chapter"] = "10-build-proof"
    environment["zoneBoundsZ"] = [-164.95, -183.55]
    add_axial_shell("BuriedEvidenceGallery", -164.95, -183.55, 5.65, -3.0, 4.5, materials, environment, 4.2)
    add_rectangular_gateway("Evidence gallery entry", -165.25, -3.0, 4.35, 4.5, materials, environment)
    add_rectangular_gateway("Evidence gallery middle seal", -174.05, -3.0, 4.25, 4.5, materials, environment)
    add_rectangular_gateway("Evidence gallery royal seal", -183.2, -3.0, 4.4, 4.5, materials, environment)

    for side, label in ((-1, "left"), (1, "right")):
        for index, z in enumerate((-167.0, -172.5, -178.7, -182.0)):
            box(
                f"Gallery {label} acoustic rib {index + 1}",
                (side * 4.78, 0.05, z),
                (0.72, 5.65, 0.48),
                materials["stone_dark"],
                environment,
                0.065,
            )
            box(
                f"Gallery {label} rib bronze datum {index + 1}",
                (side * 4.37, -0.1, z),
                (0.08, 0.12, 0.56),
                materials["bronze"],
                environment,
                0.012,
            )

    reliefs = create_decoration_group("DEC_Buried_GalleryReliefs", environment)
    for index, (side, z) in enumerate(((1, -168.2), (-1, -173.9), (1, -181.0))):
        x = side * 5.18
        box(
            f"Gallery tool relief backing {index + 1}",
            (x, 1.52, z),
            (0.055, 1.65, 2.25),
            materials["terracotta_dark"],
            reliefs,
            0.018,
        )
        for bar in range(3):
            box(
                f"Gallery tool relief stroke {index + 1}-{bar + 1}",
                (x - side * 0.045, 1.18 + bar * 0.34, z - 0.5 + bar * 0.5),
                (0.045, 0.12, 0.82),
                materials["terracotta"],
                reliefs,
                0.018,
            )
        cylinder(
            f"Gallery tool relief socket {index + 1}",
            (x - side * 0.06, 1.98, z),
            0.28,
            0.07,
            materials["terracotta"],
            reliefs,
            12,
            "x",
            0.018,
        )

    add_media_aperture("SCR_Buried_Guards", materials, environment)
    add_media_aperture("SCR_Buried_Mercury", materials, environment)
    return environment


def build_royal_hall(
    root: bpy.types.Object,
    materials: dict[str, bpy.types.Material],
) -> bpy.types.Object:
    environment = create_empty("ENV_Buried_RoyalHall", root)
    environment["chapter"] = "10-royal-hall-proof"
    environment["zoneBoundsZ"] = [-183.3, -193.15]
    add_axial_shell("BuriedRoyalHall", -183.3, -193.15, 7.75, -3.0, 5.3, materials, environment, 3.8)
    add_rectangular_gateway("Royal hall compressed entry", -183.62, -3.0, 4.85, 5.3, materials, environment)
    add_rectangular_gateway("Royal hall inner seal", -192.65, -3.0, 4.25, 5.1, materials, environment)

    box("Royal hall axial stone platform", (0.0, -2.72, -188.25), (4.65, 0.56, 7.35), materials["stone_dark"], environment, 0.09)
    box("Royal hall platform dressed top", (0.0, -2.4, -188.25), (3.55, 0.12, 6.25), materials["stone"], environment, 0.04)
    for side, label in ((-1, "left"), (1, "right")):
        for index, z in enumerate((-185.15, -189.0, -191.35)):
            box(
                f"Royal hall {label} earth buttress {index + 1}",
                (side * 6.46, 0.35, z),
                (1.38, 6.7, 1.35),
                materials["earth_alt"],
                environment,
                0.11,
            )
            box(
                f"Royal hall {label} dressed stone shoe {index + 1}",
                (side * 6.46, -2.42, z),
                (1.62, 1.16, 1.58),
                materials["stone_light"],
                environment,
                0.08,
            )
            box(
                f"Royal hall {label} timber bearing block {index + 1}",
                (side * 6.46, 3.45, z),
                (1.56, 0.48, 1.48),
                materials["timber"],
                environment,
                0.055,
            )
    box("Royal hall sealed craft coffer", (0.0, -1.42, -188.55), (2.45, 1.85, 4.0), materials["stone"], environment, 0.11)
    box("Royal hall coffer lid", (0.0, -0.42, -188.55), (2.75, 0.28, 4.28), materials["stone_light"], environment, 0.07)
    for z in (-187.35, -189.75):
        box("Royal coffer bronze restraint " + str(abs(int(z * 10))), (0.0, -1.28, z), (2.58, 0.24, 0.18), materials["bronze"], environment, 0.035)

    coffers = create_decoration_group("DEC_Buried_RoyalCeilingCoffers", environment)
    for row, z in enumerate((-185.1, -188.15, -191.2)):
        for column, x in enumerate((-4.2, -1.4, 1.4, 4.2)):
            box(
                f"Royal ceiling pressure panel {row + 1}-{column + 1}",
                (x, 4.98, z),
                (2.15, 0.08, 2.25),
                materials["timber_mark"],
                coffers,
                0.016,
            )
    add_media_aperture("SCR_Buried_RoyalHall", materials, environment)
    return environment


def build_pixel_gate(
    root: bpy.types.Object,
    materials: dict[str, bpy.types.Material],
) -> bpy.types.Object:
    environment = create_empty("ENV_Buried_PixelGate", root)
    environment["chapter"] = "10-pixel-handoff"
    environment["zoneBoundsZ"] = [-192.65, -196.25]
    add_axial_shell("BuriedPixelGate", -192.65, -196.25, 4.35, -3.0, 4.65, materials, environment, 2.4)
    for index, (z, half_width, ceiling) in enumerate((
        (-193.05, 3.55, 4.65),
        (-193.85, 2.95, 4.28),
        (-194.62, 2.35, 3.88),
        (-195.3, 1.72, 3.42),
    )):
        add_rectangular_gateway(f"Pixel compression frame {index + 1}", z, -3.0, half_width, ceiling, materials, environment)
    box("Pixel gate terminal packed earth seal", (0.0, 0.6, -196.0), (8.2, 7.2, 0.42), materials["earth"], environment, 0.07)

    compression = create_empty("FX_Buried_PixelCompression", root, (0.0, -0.52, -195.62), 0.42)
    compression["runtime_role"] = "circle-to-square-compression"
    compression["runtime_animation"] = "shutter-offset"
    compression["closedAperture"] = 0.48
    compression["openAperture"] = 2.2
    for side, label in ((-1, "left"), (1, "right")):
        box(
            f"Pixel compression {label} shutter",
            (side * 0.92, 0.0, 0.0),
            (1.1, 2.9, 0.28),
            materials["iron"],
            compression,
            0.06,
        )
    for vertical, label in ((-1, "lower"), (1, "upper")):
        box(
            f"Pixel compression {label} shutter",
            (0.0, vertical * 0.92, 0.03),
            (2.9, 1.1, 0.28),
            materials["bronze"],
            compression,
            0.06,
        )
    torus("Pixel compression circular iris trace", (0.0, 0.0, 0.18), 0.84, 0.055, materials["bronze_edge"], compression, 20, 6, "z")

    core = create_empty("PRP_Buried_PixelCore", compression, (0.0, 0.0, 0.24), 0.24)
    core["runtime_role"] = "infect-pixel-handoff"
    core["pixelSize"] = 0.52
    profile_prism(
        "First live infect pixel",
        [(-0.26, -0.26), (0.26, -0.26), (0.26, 0.26), (-0.26, 0.26)],
        0.0,
        0.09,
        materials["lamp"],
        core,
        0.015,
    )
    box("Pixel core black socket", (0.0, 0.0, -0.12), (0.78, 0.78, 0.16), materials["soot"], core, 0.025)
    return environment


def build_mercury_channels(
    root: bpy.types.Object,
    materials: dict[str, bpy.types.Material],
) -> bpy.types.Object:
    channels = create_empty("FX_Buried_MercuryChannels", root)
    channels["runtime_role"] = "continuous-floor-capillary"
    channels["materialState"] = "restrained-mirrored"

    def lower(points: list[tuple[float, float, float]], amount: float) -> list[tuple[float, float, float]]:
        return [(x, y - amount, z) for x, y, z in points]

    descent_points: list[tuple[float, float, float]] = [(0.0, -0.03, -128.45), (0.0, -0.03, -129.95)]
    for index in range(12):
        descent_points.append((0.0, -0.25 * (index + 1) - 0.03, -130.0 - 1.32 * (index + 1)))
    descent_points.append((0.0, -3.03, -146.2))
    curve_tube("Descent mercury channel cut", lower(descent_points, 0.055), 0.11, materials["soot"], channels, resolution=1)
    curve_tube("Descent mercury capillary", descent_points, 0.05, materials["mercury"], channels, resolution=1)

    chamber_points = [
        (0.0, -3.03, -146.2),
        (0.0, -3.03, -150.2),
        (-1.25, -3.03, -151.8),
        (-1.25, -3.03, -156.1),
        (0.75, -3.03, -158.15),
        (3.75, -3.03, -158.7),
    ]
    curve_tube("Lamp chamber mercury channel cut", lower(chamber_points, 0.06), 0.125, materials["soot"], channels, resolution=1)
    curve_tube("Lamp chamber mercury capillary", chamber_points, 0.055, materials["mercury"], channels, resolution=1)

    evidence_points = [
        (3.75, -3.03, -158.7),
        (2.75, -3.03, -162.8),
        (0.0, -3.03, -165.2),
        (0.0, -3.03, -181.8),
        (-0.85, -3.03, -184.0),
        (-0.85, -3.03, -191.4),
        (0.0, -3.03, -193.0),
        (0.0, -3.03, -195.3),
    ]
    curve_tube("Evidence mercury channel cut", lower(evidence_points, 0.055), 0.115, materials["soot"], channels, resolution=1)
    curve_tube("Evidence mercury capillary", evidence_points, 0.052, materials["mercury"], channels, resolution=1)

    for index, points in enumerate((
        [(0.0, -3.03, -168.0), (-2.8, -3.03, -169.6), (-4.35, -3.03, -169.6)],
        [(0.0, -3.03, -176.1), (2.8, -3.03, -177.75), (4.35, -3.03, -177.75)],
        [(-0.85, -3.03, -187.2), (-3.8, -3.03, -188.15), (-6.2, -3.03, -188.15)],
    )):
        curve_tube(f"Evidence mercury branch cut {index + 1}", lower(points, 0.05), 0.1, materials["soot"], channels, resolution=1)
        curve_tube(f"Evidence mercury branch {index + 1}", points, 0.045, materials["mercury"], channels, resolution=1)
    return channels


def add_anchors(root: bpy.types.Object) -> None:
    anchors = {
        "ANC_Buried_Entry": (0.0, 1.1, -124.35),
        "ANC_Buried_OilFocus": (-4.15, -1.55, -153.65),
        "ANC_Buried_MechanismFocus": (3.15, 0.85, -153.55),
        "ANC_Buried_MercuryFocus": (3.75, -2.35, -158.7),
        "ANC_Buried_GuardsEvidence": (0.0, -0.72, -169.3),
        "ANC_Buried_MercuryEvidence": (0.0, -0.72, -177.35),
        "ANC_Buried_RoyalHallEvidence": (0.0, -0.55, -187.8),
        "ANC_Buried_PixelHandoff": (0.0, -0.52, -195.35),
    }
    for index, (name, position) in enumerate(anchors.items()):
        anchor = create_empty(name, root, position, 0.32)
        anchor["interaction_anchor"] = True
        anchor["sequenceIndex"] = index


def convert_curves_to_meshes() -> None:
    for obj in list(bpy.context.scene.objects):
        if obj.type != "CURVE":
            continue
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.convert(target="MESH")


def join_direct_meshes_by_material(parent: bpy.types.Object) -> None:
    buckets: dict[str, list[bpy.types.Object]] = {}
    for child in list(parent.children):
        if child.type != "MESH" or len(child.data.materials) != 1:
            continue
        material = child.data.materials[0]
        if material:
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
        safe_material = "".join(character if character.isalnum() else "_" for character in material_name)
        active.name = f"EXPORT_{parent.name}_{safe_material}"[:63]


def object_depth(obj: bpy.types.Object) -> int:
    depth = 0
    parent = obj.parent
    while parent:
        depth += 1
        parent = parent.parent
    return depth


def add_projected_uvs() -> None:
    density_by_material = {
        "Rammed earth charcoal": 0.36,
        "Rammed earth warm course": 0.36,
        "Mausoleum stone shadow": 0.48,
        "Hand cut limestone": 0.5,
        "Worn limestone edge": 0.52,
        "Carbonized timber": 0.72,
        "Muted Qin terracotta": 0.62,
        "Terracotta recess": 0.62,
        "Aged burial bronze": 0.7,
        "Blackened mechanism iron": 0.72,
    }
    for mesh in bpy.data.meshes:
        textured = [material for material in mesh.materials if material and material.get("pbr_textured")]
        if not textured or not mesh.vertices:
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
        density = density_by_material.get(textured[0].name, 0.54)
        for polygon in mesh.polygons:
            dominant = max(range(3), key=lambda axis: abs(polygon.normal[axis]))
            plane_axes = tuple(axis for axis in range(3) if axis != dominant)
            if longest_axis in plane_axes:
                v_axis = longest_axis
                u_axis = plane_axes[0] if plane_axes[1] == v_axis else plane_axes[1]
            else:
                u_axis, v_axis = plane_axes
            for loop_index in polygon.loop_indices:
                coordinate = mesh.vertices[mesh.loops[loop_index].vertex_index].co
                uv_layer.data[loop_index].uv = (coordinate[u_axis] * density, coordinate[v_axis] * density)


def triangulate_meshes() -> None:
    for mesh in bpy.data.meshes:
        if not mesh.polygons:
            continue
        editable = bmesh.new()
        editable.from_mesh(mesh)
        bmesh.ops.triangulate(editable, faces=list(editable.faces), quad_method="BEAUTY", ngon_method="BEAUTY")
        editable.to_mesh(mesh)
        editable.free()
        mesh.update()


def prepare_runtime_export() -> None:
    convert_curves_to_meshes()
    empty_groups = sorted(
        (obj for obj in bpy.context.scene.objects if obj.type == "EMPTY"),
        key=object_depth,
        reverse=True,
    )
    for group in empty_groups:
        join_direct_meshes_by_material(group)
    add_projected_uvs()
    triangulate_meshes()


def screen_facing_dot(screen: bpy.types.Object, camera: tuple[float, float, float]) -> float:
    local_plus_z_blender = Vector((0.0, -1.0, 0.0))
    normal_blender = screen.matrix_world.to_3x3() @ local_plus_z_blender
    normal_three = blender_position(normal_blender).normalized()
    position_three = blender_position(screen.matrix_world.translation)
    camera_direction = (Vector(camera) - position_three).normalized()
    return normal_three.dot(camera_direction)


def validate_required_nodes_blender() -> float:
    bpy.context.view_layer.update()
    for name in REQUIRED_NODES:
        matches = [obj for obj in bpy.data.objects if obj.name == name]
        if len(matches) != 1:
            raise RuntimeError(f"Required node {name!r} exists {len(matches)} times")
        if matches[0].type != "EMPTY":
            raise RuntimeError(f"Required node {name!r} must be an empty runtime group")

    root = bpy.data.objects["VS08_10_Buried_ROOT"]
    if tuple(round(value, 6) for value in root.location) != (0.0, 0.0, 0.0):
        raise RuntimeError("VS08_10_Buried_ROOT must keep an identity translation")
    if tuple(round(value, 6) for value in root.rotation_euler) != (0.0, 0.0, 0.0):
        raise RuntimeError("VS08_10_Buried_ROOT must keep an identity rotation")
    if tuple(round(value, 6) for value in root.scale) != (1.0, 1.0, 1.0):
        raise RuntimeError("VS08_10_Buried_ROOT must keep an identity scale")

    facing_dots: list[float] = []
    for screen_name, spec in MEDIA_SPECS.items():
        screen = bpy.data.objects[screen_name]
        parent = screen.parent
        if not parent or parent.name != spec["aperture"] or not parent.get("physicalAperture"):
            raise RuntimeError(f"{screen_name} must be a direct child of its physical stone aperture")
        if screen.type != "EMPTY" or screen.data is not None:
            raise RuntimeError(f"{screen_name} must remain an empty external-media anchor")
        if abs(float(screen.get("mediaWidth", 0.0)) - float(spec["width"])) > 1e-6:
            raise RuntimeError(f"{screen_name} mediaWidth does not match its aperture")
        if abs(float(screen.get("mediaHeight", 0.0)) - float(spec["height"])) > 1e-6:
            raise RuntimeError(f"{screen_name} mediaHeight does not match its aperture")
        dot = screen_facing_dot(screen, spec["camera"])
        if dot < 0.999:
            raise RuntimeError(f"{screen_name} local +Z misses its intended camera (dot={dot:.6f})")
        facing_dots.append(dot)

    for obj in bpy.data.objects:
        if obj.name in REQUIRED_NODES and "mobileOptional" in obj:
            raise RuntimeError(f"Required node {obj.name} cannot be mobileOptional")
        if obj.get("mobileOptional") and not obj.name.startswith("DEC_"):
            raise RuntimeError(f"mobileOptional is reserved for DEC_ groups, found on {obj.name}")
    return min(facing_dots)


def mesh_statistics() -> tuple[int, int, int]:
    mesh_objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    unique_meshes = {obj.data for obj in mesh_objects}
    triangles = sum(len(obj.data.polygons) for obj in mesh_objects)
    return len(mesh_objects), len(unique_meshes), triangles


def scene_bounds_three() -> tuple[Vector, Vector]:
    minimum = Vector((math.inf, math.inf, math.inf))
    maximum = Vector((-math.inf, -math.inf, -math.inf))
    for obj in bpy.context.scene.objects:
        if obj.type != "MESH":
            continue
        for corner in obj.bound_box:
            world = obj.matrix_world @ Vector(corner)
            point = blender_position(world)
            for axis in range(3):
                minimum[axis] = min(minimum[axis], point[axis])
                maximum[axis] = max(maximum[axis], point[axis])
    return minimum, maximum


def configure_scene() -> None:
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.render.engine = "BLENDER_EEVEE"
    world = scene.world or bpy.data.worlds.new("Buried charcoal world")
    scene.world = world
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    if background:
        background.inputs["Color"].default_value = hex_color("#080a09")
        background.inputs["Strength"].default_value = 0.08


def export_raw_glb() -> None:
    validate_required_nodes_blender()
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


def read_glb_json(path: Path) -> dict:
    with path.open("rb") as handle:
        header = handle.read(12)
        magic, version, total_length = struct.unpack("<4sII", header)
        if magic != b"glTF" or version != 2 or total_length != path.stat().st_size:
            raise RuntimeError(f"Invalid GLB header for {path}")
        chunk_length, chunk_type = struct.unpack("<II", handle.read(8))
        if chunk_type != 0x4E4F534A:
            raise RuntimeError(f"First GLB chunk is not JSON for {path}")
        return json.loads(handle.read(chunk_length).decode("utf-8").rstrip(" \t\r\n\0"))


def gltf_local_matrix(node: dict) -> Matrix:
    if "matrix" in node:
        values = node["matrix"]
        return Matrix(tuple(tuple(values[column * 4 + row] for column in range(4)) for row in range(4)))
    translation = Vector(node.get("translation", (0.0, 0.0, 0.0)))
    rotation = node.get("rotation", (0.0, 0.0, 0.0, 1.0))
    scale = node.get("scale", (1.0, 1.0, 1.0))
    rotation_matrix = Quaternion((rotation[3], rotation[0], rotation[1], rotation[2])).to_matrix().to_4x4()
    scale_matrix = Matrix.Diagonal((scale[0], scale[1], scale[2], 1.0))
    return Matrix.Translation(translation) @ rotation_matrix @ scale_matrix


def gltf_world_matrices(document: dict) -> tuple[list[Matrix], dict[int, int]]:
    nodes = document.get("nodes", [])
    parents: dict[int, int] = {}
    for parent_index, node in enumerate(nodes):
        for child_index in node.get("children", []):
            parents[child_index] = parent_index
    cache: dict[int, Matrix] = {}

    def world(index: int) -> Matrix:
        if index in cache:
            return cache[index]
        local = gltf_local_matrix(nodes[index])
        cache[index] = world(parents[index]) @ local if index in parents else local
        return cache[index]

    return [world(index) for index in range(len(nodes))], parents


def gltf_triangle_count(document: dict) -> int:
    accessors = document.get("accessors", [])
    meshes = document.get("meshes", [])
    triangles = 0
    for node in document.get("nodes", []):
        mesh_index = node.get("mesh")
        if mesh_index is None:
            continue
        for primitive in meshes[mesh_index].get("primitives", []):
            if "indices" in primitive:
                count = int(accessors[primitive["indices"]]["count"])
            else:
                count = int(accessors[primitive["attributes"]["POSITION"]]["count"])
            mode = int(primitive.get("mode", 4))
            if mode == 4:
                triangles += count // 3
            elif mode in {5, 6}:
                triangles += max(0, count - 2)
    return triangles


def validate_final_glb(path: Path) -> dict[str, int | float | str]:
    document = read_glb_json(path)
    nodes = document.get("nodes", [])
    names = [node.get("name", "") for node in nodes]
    counts = Counter(names)
    for name in REQUIRED_NODES:
        if counts[name] != 1:
            raise RuntimeError(f"Optimized GLB required node {name!r} exists {counts[name]} times")

    worlds, parents = gltf_world_matrices(document)
    name_to_index = {node.get("name", ""): index for index, node in enumerate(nodes)}
    root_world = worlds[name_to_index["VS08_10_Buried_ROOT"]]
    if any(abs(root_world[row][column] - (1.0 if row == column else 0.0)) > 1e-5 for row in range(4) for column in range(4)):
        raise RuntimeError("Optimized GLB root transform is not identity")

    facing_dots: list[float] = []
    for screen_name, spec in MEDIA_SPECS.items():
        index = name_to_index[screen_name]
        node = nodes[index]
        if "mesh" in node:
            raise RuntimeError(f"{screen_name} gained embedded media geometry")
        parent_index = parents.get(index)
        if parent_index is None or nodes[parent_index].get("name") != spec["aperture"]:
            raise RuntimeError(f"{screen_name} lost its physical aperture parent")
        parent_extras = nodes[parent_index].get("extras", {})
        if not parent_extras.get("physicalAperture"):
            raise RuntimeError(f"{screen_name} parent is not marked as a physical aperture")
        extras = node.get("extras", {})
        if abs(float(extras.get("mediaWidth", 0.0)) - float(spec["width"])) > 1e-6:
            raise RuntimeError(f"{screen_name} lost mediaWidth")
        if abs(float(extras.get("mediaHeight", 0.0)) - float(spec["height"])) > 1e-6:
            raise RuntimeError(f"{screen_name} lost mediaHeight")
        world = worlds[index]
        normal = (world.to_3x3() @ Vector((0.0, 0.0, 1.0))).normalized()
        position = world.translation
        direction = (Vector(spec["camera"]) - position).normalized()
        dot = normal.dot(direction)
        if dot < 0.999:
            raise RuntimeError(f"Optimized {screen_name} local +Z misses camera (dot={dot:.6f})")
        facing_dots.append(dot)

    for required_name in REQUIRED_NODES:
        extras = nodes[name_to_index[required_name]].get("extras", {})
        if extras.get("mobileOptional"):
            raise RuntimeError(f"Required node {required_name} is mobileOptional in optimized GLB")
    for node in nodes:
        extras = node.get("extras", {})
        if extras.get("mobileOptional") and not node.get("name", "").startswith("DEC_"):
            raise RuntimeError(f"mobileOptional appears on non-decoration node {node.get('name', '')}")

    triangles = gltf_triangle_count(document)
    if triangles >= 90_000:
        raise RuntimeError(f"Triangle budget exceeded: {triangles:,} >= 90,000")
    file_size = path.stat().st_size
    hard_limit = int(2.8 * 1024 * 1024)
    if file_size >= hard_limit:
        raise RuntimeError(f"GLB hard size limit exceeded: {file_size:,} >= {hard_limit:,}")
    extensions = document.get("extensionsUsed", [])
    if "EXT_meshopt_compression" not in extensions:
        raise RuntimeError("Optimized GLB does not declare EXT_meshopt_compression")
    return {
        "nodes": len(nodes),
        "required": len(REQUIRED_NODES),
        "triangles": triangles,
        "bytes": file_size,
        "meshes": len(document.get("meshes", [])),
        "materials": len(document.get("materials", [])),
        "images": len(document.get("images", [])),
        "minimumFacingDot": min(facing_dots),
        "compression": "EXT_meshopt_compression",
    }


def optimize_and_validate() -> dict[str, int | float | str]:
    if not GLTF_TRANSFORM.exists():
        raise RuntimeError(f"Missing gltf-transform CLI at {GLTF_TRANSFORM}")
    temporary_output = PUBLIC_DIR / "buried-mausoleum.optimized.glb"
    temporary_output.unlink(missing_ok=True)
    try:
        result = subprocess.run(
            [
                str(GLTF_TRANSFORM),
                "optimize",
                str(RAW_GLB),
                str(temporary_output),
                "--compress",
                "meshopt",
                "--flatten",
                "false",
                "--instance",
                "false",
                "--join",
                "false",
                "--prune",
                "false",
                "--palette",
                "false",
                "--texture-compress",
                "false",
            ],
            cwd=ROOT,
            check=True,
            capture_output=True,
            text=True,
        )
        if result.stdout.strip():
            print(result.stdout.strip())
        if result.stderr.strip():
            print(result.stderr.strip())
        statistics = validate_final_glb(temporary_output)
        temporary_output.replace(OUTPUT_GLB)
        return statistics
    finally:
        RAW_GLB.unlink(missing_ok=True)
        temporary_output.unlink(missing_ok=True)


def main() -> None:
    expected_blender = (5, 2, 0)
    if tuple(bpy.app.version) != expected_blender:
        raise RuntimeError(
            f"Buried act output is pinned to Blender {'.'.join(map(str, expected_blender))}; "
            f"received {bpy.app.version_string}"
        )
    clear_scene()
    materials = make_materials()
    root = create_empty("VS08_10_Buried_ROOT")
    root["asset_contract"] = "08-10-v1"
    root["runtime_coordinates"] = "threejs-x-y-z"
    root["route"] = "canonical-ordered"
    root["evidenceMedia"] = "external-webp"

    build_school_fold(root, materials)
    build_descent(root, materials)
    build_lamp_chamber(root, materials)
    build_evidence_gallery(root, materials)
    build_royal_hall(root, materials)
    build_pixel_gate(root, materials)
    build_mercury_channels(root, materials)
    add_anchors(root)
    configure_scene()

    minimum_facing_dot = validate_required_nodes_blender()
    prepare_runtime_export()
    minimum_facing_dot = min(minimum_facing_dot, validate_required_nodes_blender())
    objects, unique_meshes, triangles = mesh_statistics()
    minimum, maximum = scene_bounds_three()
    if triangles >= 90_000:
        raise RuntimeError(f"Authored triangle budget exceeded before export: {triangles:,}")
    if maximum.z < -124.2 or minimum.z > -196.0:
        raise RuntimeError(f"Mausoleum does not span the required axial range: z={minimum.z:.2f}..{maximum.z:.2f}")
    export_raw_glb()
    statistics = optimize_and_validate()

    print(f"Built {OUTPUT_GLB}")
    print(f"Required nodes: {statistics['required']}/{len(REQUIRED_NODES)}")
    print(f"Optimized nodes: {statistics['nodes']}; meshes: {statistics['meshes']}; materials: {statistics['materials']}; images: {statistics['images']}")
    print(f"Triangles: {statistics['triangles']:,} (authored mesh instances: {triangles:,})")
    print(f"File size: {statistics['bytes']:,} bytes ({statistics['bytes'] / (1024 * 1024):.3f} MiB)")
    print(f"Compression: {statistics['compression']}")
    print(f"Three.js bounds: x={minimum.x:.2f}..{maximum.x:.2f}, y={minimum.y:.2f}..{maximum.y:.2f}, z={minimum.z:.2f}..{maximum.z:.2f}")
    print(f"SCR local +Z minimum camera dot: {min(minimum_facing_dot, float(statistics['minimumFacingDot'])):.6f}")
    print(f"Transient raw retained: {RAW_GLB.exists()}")


if __name__ == "__main__":
    main()
