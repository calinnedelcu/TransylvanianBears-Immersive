"""Build the Transylvanian Bears citadel from the shared parametric definition.

Run with:
  blender --background --python-exit-code 1 --python scripts/blender/build_citadel.py

Every dimension comes from shared/citadel.json, the same file the SVG plan reads.
The plan and the model cannot drift apart: when the plan tilts, it tilts into this
geometry.

Architecture follows docs/greenfield/18-first-light-production-brief.md:
Prejmer gives the inhabited ring around a visible common core, Viscri gives mineral
plaster, dark timber and human scale, Biertan gives the threshold sequence. There is
no lancet, no pointed arch and no spire here; that vocabulary is what made the
previous opening read as a generic castle.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import bmesh
import bpy

ROOT = Path(__file__).resolve().parents[2]
DEF_FILE = ROOT / "shared" / "citadel.json"
WORLD_DIR = ROOT / "public" / "assets" / "world"
RAW_GLB = WORLD_DIR / "citadel.raw.glb"
POSTER = WORLD_DIR / "citadel-poster.png"

WORLD_DIR.mkdir(parents=True, exist_ok=True)
DEF = json.loads(DEF_FILE.read_text())


# --------------------------------------------------------------------------- utils

def srgb_to_linear(value: float) -> float:
    return value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4


def linear_rgb(hex_value: str) -> tuple[float, float, float]:
    raw = hex_value.lstrip("#")
    return tuple(srgb_to_linear(int(raw[i : i + 2], 16) / 255) for i in (0, 2, 4))


def rad(deg: float) -> float:
    return math.radians(deg)


def polar(radius: float, deg: float) -> tuple[float, float]:
    return radius * math.cos(rad(deg)), radius * math.sin(rad(deg))


def clear_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)


def material(
    name: str,
    color: str,
    roughness: float,
    metallic: float = 0.0,
    emission: str | None = None,
    emission_strength: float = 0.0,
) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*linear_rgb(color), 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if emission:
        bsdf.inputs["Emission Color"].default_value = (*linear_rgb(emission), 1.0)
        bsdf.inputs["Emission Strength"].default_value = emission_strength
    return mat


def finish(obj: bpy.types.Object, mat: bpy.types.Material, bevel: float = 0.045) -> bpy.types.Object:
    obj.data.materials.append(mat)
    if bevel > 0:
        modifier = obj.modifiers.new("Soft mineral edge", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
        modifier.limit_method = "ANGLE"
        modifier.angle_limit = rad(38)
    return obj


def mesh_from(name: str, verts, faces) -> bpy.types.Object:
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.validate()
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return obj


def box(name: str, center, size, yaw: float = 0.0) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=center)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = size
    obj.rotation_euler = (0.0, 0.0, yaw)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    return obj


def prism(name: str, center, radius: float, height: float, sides: int, yaw: float = 0.0):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=sides, radius=radius, depth=height, location=center
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.rotation_euler = (0.0, 0.0, yaw)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    return obj


def annulus(name: str, inner: float, outer: float, deg_from: float, deg_to: float,
            base_z: float, height: float, steps: int) -> bpy.types.Object:
    """Wall band between two radii. The ring is built from these, gate gap included."""
    verts, faces = [], []
    for index in range(steps + 1):
        t = index / steps
        angle = deg_from + (deg_to - deg_from) * t
        ix, iy = polar(inner, angle)
        ox, oy = polar(outer, angle)
        verts.extend([
            (ix, iy, base_z), (ox, oy, base_z),
            (ix, iy, base_z + height), (ox, oy, base_z + height),
        ])
    for index in range(steps):
        a = index * 4
        b = a + 4
        faces.extend([
            (a, a + 1, b + 1, b),          # bottom
            (a + 2, b + 2, b + 3, a + 3),  # top
            (a, b, b + 2, a + 2),          # inner
            (a + 1, a + 3, b + 3, b + 1),  # outer
        ])
    cap_a = 0
    cap_b = steps * 4
    faces.append((cap_a, cap_a + 2, cap_a + 3, cap_a + 1))
    faces.append((cap_b + 1, cap_b + 3, cap_b + 2, cap_b))
    return mesh_from(name, verts, faces)



# ------------------------------------------------------------------- materials

def _fade(t: float) -> float:
    return t * t * t * (t * (t * 6 - 15) + 10)


def _lattice(ix: int, iy: int, seed: int) -> float:
    h = (ix * 374761393 + iy * 668265263 + seed * 1442695040888963407) & 0xFFFFFFFF
    h = (h ^ (h >> 13)) * 1274126177 & 0xFFFFFFFF
    return ((h ^ (h >> 16)) & 0xFFFF) / 0xFFFF


def tileable_noise(u: float, v: float, cells: int, seed: int) -> float:
    """Value noise that wraps, so a texture can tile without a visible seam."""
    x, y = u * cells, v * cells
    ix, iy = int(math.floor(x)), int(math.floor(y))
    fx, fy = _fade(x - ix), _fade(y - iy)
    c00 = _lattice(ix % cells, iy % cells, seed)
    c10 = _lattice((ix + 1) % cells, iy % cells, seed)
    c01 = _lattice(ix % cells, (iy + 1) % cells, seed)
    c11 = _lattice((ix + 1) % cells, (iy + 1) % cells, seed)
    return (c00 * (1 - fx) + c10 * fx) * (1 - fy) + (c01 * (1 - fx) + c11 * fx) * fy


def surface_texture(name: str, base_hex: str, grain: float, seed: int, size: int = 256):
    """Bake a small colour/roughness pair.

    Procedural shader nodes do not survive the glTF round trip, so the breakup has
    to exist as pixels. Without it every mineral surface renders as one flat value
    and the whole citadel reads as grey blocks.
    """
    base = linear_rgb(base_hex)
    colour = bpy.data.images.new(f"{name} colour", size, size, alpha=False)
    rough = bpy.data.images.new(f"{name} roughness", size, size, alpha=False, is_data=True)
    c_px = [0.0] * (size * size * 4)
    r_px = [0.0] * (size * size * 4)

    for y in range(size):
        v = y / size
        for x in range(size):
            u = x / size
            coarse = tileable_noise(u, v, 8, seed)
            fine = tileable_noise(u, v, 32, seed + 7)
            speck = tileable_noise(u, v, 96, seed + 19)
            n = coarse * 0.55 + fine * 0.3 + speck * 0.15
            shade = 1.0 + (n - 0.5) * grain
            i = (y * size + x) * 4
            c_px[i] = max(0.0, base[0] * shade)
            c_px[i + 1] = max(0.0, base[1] * shade)
            c_px[i + 2] = max(0.0, base[2] * shade)
            c_px[i + 3] = 1.0
            r = min(1.0, max(0.05, 0.5 + (0.5 - n) * 0.55))
            r_px[i] = r_px[i + 1] = r_px[i + 2] = r
            r_px[i + 3] = 1.0

    colour.pixels = c_px
    rough.pixels = r_px
    for image in (colour, rough):
        image.pack()
    return colour, rough


def textured_material(
    name: str, color: str, roughness: float, grain: float, seed: int, metallic: float = 0.0
) -> bpy.types.Material:
    mat = material(name, color, roughness, metallic)
    colour_img, rough_img = surface_texture(name, color, grain, seed)
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes["Principled BSDF"]

    tex_coord = nodes.new("ShaderNodeTexCoord")
    mapping = nodes.new("ShaderNodeMapping")
    mapping.inputs["Scale"].default_value = (3.0, 3.0, 3.0)
    links.new(tex_coord.outputs["UV"], mapping.inputs["Vector"])

    colour_node = nodes.new("ShaderNodeTexImage")
    colour_node.image = colour_img
    links.new(mapping.outputs["Vector"], colour_node.inputs["Vector"])
    links.new(colour_node.outputs["Color"], bsdf.inputs["Base Color"])

    rough_node = nodes.new("ShaderNodeTexImage")
    rough_node.image = rough_img
    rough_node.image.colorspace_settings.name = "Non-Color"
    links.new(mapping.outputs["Vector"], rough_node.inputs["Vector"])
    links.new(rough_node.outputs["Color"], bsdf.inputs["Roughness"])
    return mat


def unwrap_all() -> None:
    """glTF needs real UVs for the baked maps to land anywhere sensible."""
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH" and o.data.uv_layers.active is None]
    if not meshes:
        return
    bpy.ops.object.select_all(action="DESELECT")
    for obj in meshes:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.cube_project(cube_size=4.0)
    bpy.ops.object.mode_set(mode="OBJECT")
    bpy.ops.object.select_all(action="DESELECT")


# ------------------------------------------------------------------------- geometry

def build_terrain(mat: bpy.types.Material) -> None:
    cfg = DEF["terrain"]
    radius = cfg["radius"]
    segments = 96
    rings = 24
    verts, faces = [(0.0, 0.0, 0.0)], []
    for ring_index in range(1, rings + 1):
        r = radius * (ring_index / rings)
        # Gentle bowl so the citadel sits on a shoulder instead of a flat pad.
        drop = -((r / radius) ** 1.7) * cfg["falloff"]
        for seg in range(segments):
            angle = seg / segments * 360.0
            wobble = 1.0 + 0.035 * math.sin(rad(angle) * 3.0) + 0.02 * math.sin(rad(angle) * 5.0 + 1.1)
            x, y = polar(r * wobble, angle)
            verts.append((x, y, drop))
    for seg in range(segments):
        faces.append((0, 1 + seg, 1 + (seg + 1) % segments))
    for ring_index in range(rings - 1):
        base = 1 + ring_index * segments
        nxt = base + segments
        for seg in range(segments):
            s2 = (seg + 1) % segments
            faces.append((base + seg, nxt + seg, nxt + s2, base + s2))
    obj = mesh_from("Terrain", verts, faces)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    finish(obj, mat, bevel=0)


def build_ring(limestone, plaster, roof_mat, timber, brass, glass) -> None:
    ring = DEF["ring"]
    gate = DEF["gate"]
    bays = DEF["bays"]

    gate_from = gate["centerDeg"] + gate["halfWidthDeg"]
    gate_to = gate["centerDeg"] - gate["halfWidthDeg"] + 360.0

    wall = annulus(
        "Ring wall", ring["innerRadius"], ring["outerRadius"],
        gate_from, gate_to, 0.0, ring["height"], ring["segments"],
    )
    finish(wall, limestone)

    parapet = annulus(
        "Ring parapet", ring["outerRadius"] - 0.55, ring["outerRadius"] + 0.16,
        gate_from, gate_to, ring["height"], ring["parapetHeight"], ring["segments"],
    )
    finish(parapet, limestone)

    # Six inhabited bays pushed OUTWARD so they read from the aerial hero frame.
    for index in range(bays["count"]):
        angle = bays["startDeg"] + index * bays["stepDeg"]
        half = bays["widthDeg"] / 2
        outer = ring["outerRadius"] + bays["projection"]

        body = annulus(
            f"Bay {index:02d}", ring["outerRadius"] - 0.4, outer,
            angle - half, angle + half, 0.0, bays["height"], 10,
        )
        finish(body, plaster if index % 2 else limestone)

        cap = annulus(
            f"Bay roof {index:02d}", ring["outerRadius"] - 0.62, outer + 0.34,
            angle - half - 0.7, angle + half + 0.7,
            bays["height"], bays["roofHeight"], 10,
        )
        finish(cap, roof_mat, bevel=0.03)

        # Opening: brass frame, smoked glass. This is the response anchor.
        ox, oy = polar(outer + 0.04, angle)
        yaw = rad(angle) + math.pi / 2
        frame = box(
            f"Bay frame {index:02d}",
            (ox, oy, bays["openingBaseZ"] + bays["openingHeight"] / 2),
            (bays["openingWidth"] + 0.26, 0.16, bays["openingHeight"] + 0.26),
            yaw,
        )
        finish(frame, brass, bevel=0.02)

        gx, gy = polar(outer - 0.06, angle)
        pane = box(
            f"Bay light {index:02d}",
            (gx, gy, bays["openingBaseZ"] + bays["openingHeight"] / 2),
            (bays["openingWidth"], 0.1, bays["openingHeight"]),
            yaw,
        )
        finish(pane, glass, bevel=0.015)

        lamp = bpy.data.lights.new(f"Bay light {index:02d}", "POINT")
        lamp.energy = 90
        lamp.color = linear_rgb("#f0c67e")
        lamp.shadow_soft_size = 0.9
        lamp_obj = bpy.data.objects.new(f"Bay lamp {index:02d}", lamp)
        lx2, ly2 = polar(outer + 1.5, angle)
        lamp_obj.location = (lx2, ly2, bays["openingBaseZ"] + 1.0)
        bpy.context.collection.objects.link(lamp_obj)

        # Timber gallery beam under each bay: the Viscri note.
        bx, by = polar(outer + 0.1, angle)
        beam = box(
            f"Bay beam {index:02d}", (bx, by, bays["height"] - 0.28),
            (2 * outer * math.sin(rad(bays["widthDeg"] / 2)) * 0.92, 0.24, 0.2), yaw,
        )
        finish(beam, timber, bevel=0.02)

    # Two compact towers. Flat caps, not spires.
    towers = DEF["towers"]
    for index, angle in enumerate(towers["angles"]):
        tx, ty = polar(ring["outerRadius"] - 0.5, angle)
        shaft = prism(
            f"Tower {index:02d}", (tx, ty, towers["height"] / 2),
            towers["radius"], towers["height"], 8, rad(angle),
        )
        finish(shaft, limestone)
        cap = prism(
            f"Tower cap {index:02d}",
            (tx, ty, towers["height"] + towers["capHeight"] / 2),
            towers["radius"] + 0.42, towers["capHeight"], 8, rad(angle),
        )
        finish(cap, roof_mat, bevel=0.03)


def build_gate(limestone, brass, timber) -> None:
    ring = DEF["ring"]
    gate = DEF["gate"]
    half = gate["halfWidthDeg"]
    centre = gate["centerDeg"]

    # Two jambs framing the opening, taller than the wall: the threshold reads.
    #
    # Their offset is solved from their own width, not picked. It used to be
    # `half + 2.6` degrees, which for a 2.15 radius tower on a ring of 13.7 put
    # each jamb's inner face at 0.47 from the centre line: the two towers stood
    # inside a 3.82m doorway and choked it to a 0.95m slot. Everything downstream
    # inherited that - the doors opened behind the towers where nothing could see
    # them, and the way in read as a crack in a wall rather than a gate.
    jamb_radius = 2.15
    mid = (ring["innerRadius"] + ring["outerRadius"]) / 2
    opening = ring["outerRadius"] * math.sin(rad(half))
    # A hexagon's flat side sits closer than its radius; that flat is what faces in.
    jamb_inset = jamb_radius * math.cos(math.pi / 6)
    jamb_offset = math.degrees(math.asin(min(0.9, (opening + jamb_inset + 0.14) / mid)))
    for sign in (-1, 1):
        angle = centre + sign * jamb_offset
        jx, jy = polar(mid, angle)
        jamb = prism(
            f"Gate jamb {'L' if sign < 0 else 'R'}",
            (jx, jy, gate["towerHeight"] / 2),
            jamb_radius, gate["towerHeight"], 6, rad(angle),
        )
        finish(jamb, limestone)

    # Lintel across the opening, flat. A pointed arch here is the gothic tell. It
    # has to reach the jambs wherever they ended up, so it spans to their centres.
    lx, ly = polar(mid, centre)
    lintel = box(
        "Gate lintel", (lx, ly, gate["archHeight"] + 0.55),
        (2 * (mid * math.sin(rad(jamb_offset)) + jamb_inset), ring["outerRadius"] - ring["innerRadius"] + 0.6, 1.1),
        rad(centre) + math.pi / 2,
    )
    finish(lintel, limestone)

    # Two leaves, hung on the jambs.
    #
    # This was six thin slats of timber and brass folding back into the wall like
    # a camera aperture. That is a mechanism from a different century and a
    # different material: a limestone gatehouse with a flat lintel gets doors.
    #
    # The origin of each leaf is moved onto its hinge, because a door turns about
    # its edge and a box turns about its middle. Without that they would pivot
    # through their own centres and pass through the jambs on the way open.
    mid_radius = (ring["innerRadius"] + ring["outerRadius"]) / 2
    opening = ring["outerRadius"] * math.sin(rad(half))
    leaf_w = opening - 0.06
    leaf_h = gate["archHeight"] - 0.18
    leaf_t = 0.26

    for index in range(2):
        side = -1 if index == 0 else 1
        # Centre of the leaf: half its width out from the middle of the opening.
        angle = centre + side * math.degrees(math.asin((leaf_w / 2) / mid_radius))
        cx, cy = polar(mid_radius, angle)
        leaf = box(
            f"Gate leaf {index:02d}", (cx, cy, leaf_h / 2 + 0.09),
            (leaf_w, leaf_t, leaf_h),
            rad(centre) + math.pi / 2,
        )
        finish(leaf, timber, bevel=0.03)

        # Origin onto the hinge, at the jamb end of the leaf.
        hinge_angle = centre + side * math.degrees(math.asin(leaf_w / mid_radius))
        hx, hy = polar(mid_radius, hinge_angle)
        bpy.context.scene.cursor.location = (hx, hy, leaf_h / 2 + 0.09)
        bpy.context.view_layer.objects.active = leaf
        leaf.select_set(True)
        bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
        leaf.select_set(False)
        bpy.context.scene.cursor.location = (0.0, 0.0, 0.0)

        # Two brass straps per leaf, which is what actually holds a door this size
        # together and the only ornament it needs.
        for band in range(2):
            bz = leaf_h * (0.28 + band * 0.42) + 0.09
            strap = box(
                f"Gate strap {index:02d}{band}", (cx, cy, bz),
                (leaf_w * 0.92, leaf_t + 0.05, 0.16),
                rad(centre) + math.pi / 2,
            )
            finish(strap, brass, bevel=0.02)
            strap.parent = leaf
            strap.matrix_parent_inverse = leaf.matrix_world.inverted()

    # No centre post. The leaves meet each other.
    #
    # There was one, and it was the reason the gate never read as opening: a column
    # standing floor to lintel down the middle of the arch stays exactly where it is
    # while the doors swing away from it, so the frame the reader walks into is a
    # pillar with light either side of it. A pair of leaves that close against each
    # other leaves the opening clear, which is the whole point of opening it.


def build_core(limestone, plaster, timber, roof_mat, brass, pivot_mat) -> None:
    core = DEF["core"]
    facets = core["facets"]

    plinth = prism("Core plinth", (0, 0, core["plinthHeight"] / 2),
                   core["plinthRadius"], core["plinthHeight"], facets)
    finish(plinth, limestone)

    body_z = core["plinthHeight"] + core["bodyHeight"] / 2
    body = prism("Core body", (0, 0, body_z), core["radius"], core["bodyHeight"], facets)
    finish(body, plaster)

    gallery = prism("Core gallery", (0, 0, core["galleryZ"]),
                    core["radius"] + core["galleryDepth"], 0.3, facets)
    finish(gallery, timber, bevel=0.02)

    roof_z = core["plinthHeight"] + core["bodyHeight"] + core["roofHeight"] / 2
    roof = prism("Core roof", (0, 0, roof_z),
                 core["radius"] + core["roofOverhang"], core["roofHeight"], facets)
    roof.scale = (1.0, 1.0, 1.0)
    # Taper the cap into a low pyramid instead of a spire.
    mesh = roof.data
    top_z = roof_z + core["roofHeight"] / 2
    for vertex in mesh.vertices:
        if vertex.co.z > 0:
            vertex.co.x *= 0.16
            vertex.co.y *= 0.16
    finish(roof, roof_mat, bevel=0.03)

    apex = prism("Core pivot", (0, 0, top_z + core["pivotHeight"] / 2),
                 0.17, core["pivotHeight"], 6)
    finish(apex, pivot_mat, bevel=0.02)

    # One recessed opening per facet, facing outward. Facet centres sit at 30+k*60,
    # so one of them looks straight down the gate axis at -90.
    inradius = core["radius"] * math.cos(math.pi / facets)
    for index in range(facets):
        angle = 30 + index * (360 / facets)
        fx, fy = polar(inradius + 0.05, angle)
        yaw = rad(angle) + math.pi / 2
        frame = box(f"Core opening {index:02d}", (fx, fy, 3.4),
                    (1.5, 0.18, 2.6), yaw)
        finish(frame, brass, bevel=0.02)


def build_nodes(brass, signal) -> None:
    marker = DEF["nodeMarker"]
    for node in DEF["nodes"]:
        x, y = polar(marker["radius"], node["deg"])
        base = box(
            f"Node {node['id']}", (x, y, DEF["ring"]["height"] + DEF["ring"]["parapetHeight"] + marker["height"] / 2),
            (marker["size"], marker["size"], marker["height"]), rad(node["deg"]) + math.pi / 4,
        )
        finish(base, brass, bevel=0.02)
        tip = prism(
            f"Node signal {node['id']}",
            (x, y, DEF["ring"]["height"] + DEF["ring"]["parapetHeight"] + marker["height"] + 0.16),
            0.13, 0.3, 6,
        )
        finish(tip, signal, bevel=0.015)


def build_route(brass) -> None:
    route = DEF["route"]
    span = route["endDeg"] - route["startDeg"]
    steps = 96
    verts, faces = [], []
    for index in range(steps + 1):
        angle = route["startDeg"] + span * (index / steps)
        inner = route["radius"] - route["width"] / 2
        outer = route["radius"] + route["width"] / 2
        ix, iy = polar(inner, angle)
        ox, oy = polar(outer, angle)
        verts.extend([(ix, iy, 0.06), (ox, oy, 0.06)])
    for index in range(steps):
        a = index * 2
        faces.append((a, a + 1, a + 3, a + 2))
    obj = mesh_from("Route", verts, faces)
    finish(obj, brass, bevel=0)


# ------------------------------------------------------------------- scene assembly

def build_distance(ridge_mat: bpy.types.Material, pine_mat: bpy.types.Material) -> None:
    """Ridges and forest. Without them the citadel reads as an object on a table.

    Everything here is deterministic and low poly: the horizon is depth, not detail,
    and the brief keeps mountains quieter than the architecture.
    """
    cfg = DEF["terrain"]

    # Three belts of ridges at increasing distance, each lower in contrast.
    for belt, (radius, height, count) in enumerate(((96, 15.0, 13), (132, 21.0, 11), (172, 27.0, 9))):
        for index in range(count):
            angle = index / count * 360.0 + belt * 11.0
            jitter = math.sin(rad(angle) * 2.7 + belt) * 0.5 + math.sin(rad(angle) * 5.3) * 0.3
            r = radius * (1.0 + jitter * 0.06)
            x, y = polar(r, angle)
            peak = height * (0.72 + 0.42 * (0.5 + 0.5 * math.sin(rad(angle) * 3.1 + belt * 2.0)))
            ridge = prism(
                f"Ridge {belt}-{index:02d}", (x, y, peak / 2 - 6.0),
                radius * 0.30, peak, 5, rad(angle) + jitter,
            )
            mesh = ridge.data
            for vertex in mesh.vertices:
                if vertex.co.z > 0:
                    vertex.co.x *= 0.42
                    vertex.co.y *= 0.42
            finish(ridge, ridge_mat, bevel=0)

    # Forest cover on the near shoulder, cleared around the citadel and the gate path.
    pine_count = 260
    for index in range(pine_count):
        # Deterministic spiral scatter, no random seed to drift between builds.
        t = index / pine_count
        angle = t * 360.0 * 7.3
        r = 22.0 + t * (cfg["radius"] - 30.0)
        wobble = math.sin(rad(angle) * 1.7) * 2.4 + math.sin(rad(angle) * 3.9) * 1.3
        r += wobble
        if r < 21.0:
            continue
        gate_gap = abs(math.atan2(math.sin(rad(angle - DEF["gate"]["centerDeg"])),
                                  math.cos(rad(angle - DEF["gate"]["centerDeg"]))))
        if gate_gap < rad(13) and r < 44.0:
            continue  # keep the approach to the gate open
        x, y = polar(r, angle)
        drop = -((r / cfg["radius"]) ** 1.7) * cfg["falloff"]
        height = 3.1 + (index % 5) * 0.42
        tree = prism(f"Pine {index:03d}", (x, y, drop + height / 2), 0.78, height, 5, rad(angle))
        mesh = tree.data
        for vertex in mesh.vertices:
            if vertex.co.z > 0:
                vertex.co.x *= 0.06
                vertex.co.y *= 0.06
        finish(tree, pine_mat, bevel=0)


def build_wall_detail(limestone, brass, timber, glass) -> None:
    """Articulation on the enclosure.

    In a luminous drawing every edge is a line, so detail is not decoration: it is
    what gives the wall something to be read by. A smooth prism draws four lines.
    """
    ring = DEF["ring"]
    gate = DEF["gate"]
    bays = DEF["bays"]
    gate_from = gate["centerDeg"] + gate["halfWidthDeg"]
    gate_to = gate["centerDeg"] - gate["halfWidthDeg"] + 360.0

    # String course: a band that runs the whole enclosure and ties the bays together.
    course = annulus(
        "Ring course", ring["outerRadius"] - 0.12, ring["outerRadius"] + 0.28,
        gate_from, gate_to, ring["height"] * 0.52, 0.34, ring["segments"],
    )
    finish(course, limestone, bevel=0.02)

    # Merlons along the parapet, skipping the bays so the rhythm stays legible.
    bay_centres = [bays["startDeg"] + i * bays["stepDeg"] for i in range(bays["count"])]
    top = ring["height"] + ring["parapetHeight"]
    for step in range(60):
        angle = gate_from + (gate_to - gate_from) * (step / 60)
        norm = ((angle % 360) + 360) % 360
        if any(abs((norm - ((c % 360) + 360) % 360 + 180) % 360 - 180) < bays["widthDeg"] * 0.75
               for c in bay_centres):
            continue
        mx, my = polar(ring["outerRadius"] - 0.2, angle)
        merlon = box(f"Ring merlon {step:02d}", (mx, my, top + 0.34),
                     (0.62, 0.5, 0.68), rad(angle) + math.pi / 2)
        finish(merlon, limestone, bevel=0.02)

    # Buttresses: vertical accents that break the drum reading of a round wall.
    for index in range(12):
        angle = 15 + index * 30
        norm = ((angle % 360) + 360) % 360
        if abs((norm - 270 + 180) % 360 - 180) < gate["halfWidthDeg"] + 4:
            continue
        bx, by = polar(ring["outerRadius"] + 0.22, angle)
        buttress = box(f"Ring buttress {index:02d}", (bx, by, ring["height"] * 0.46),
                       (0.86, 0.92, ring["height"] * 0.92), rad(angle) + math.pi / 2)
        finish(buttress, limestone, bevel=0.03)

    # Narrow lights between the bays: the wall is inhabited, not blind.
    for index in range(12):
        angle = 30 + index * 30
        norm = ((angle % 360) + 360) % 360
        if abs((norm - 270 + 180) % 360 - 180) < gate["halfWidthDeg"] + 6:
            continue
        if any(abs((norm - ((c % 360) + 360) % 360 + 180) % 360 - 180) < bays["widthDeg"] for c in bay_centres):
            continue
        sx, sy = polar(ring["outerRadius"] + 0.05, angle)
        slot = box(f"Ring slot {index:02d}", (sx, sy, ring["height"] * 0.62),
                   (0.3, 0.16, 1.15), rad(angle) + math.pi / 2)
        finish(slot, glass, bevel=0.01)

    # Timber gallery inside the wall head, on posts.
    gallery = annulus(
        "Ring gallery", ring["innerRadius"] - 0.85, ring["innerRadius"] + 0.05,
        gate_from, gate_to, ring["height"] * 0.74, 0.22, ring["segments"],
    )
    finish(gallery, timber, bevel=0.02)
    for index in range(24):
        angle = gate_from + (gate_to - gate_from) * (index / 24)
        px, py = polar(ring["innerRadius"] - 0.45, angle)
        post = box(f"Gallery post {index:02d}", (px, py, ring["height"] * 0.37),
                   (0.16, 0.16, ring["height"] * 0.74), rad(angle) + math.pi / 2)
        finish(post, timber, bevel=0.01)

    # Steps up to the gate: scale, and a reason the threshold reads as an event.
    for index in range(4):
        depth = 1.1
        sx, sy = polar(ring["outerRadius"] + 1.0 + index * depth, gate["centerDeg"])
        step_obj = box(f"Gate step {index:02d}", (sx, sy, 0.42 - index * 0.13),
                       (6.4 + index * 0.7, depth, 0.26 + index * 0.02),
                       rad(gate["centerDeg"]) + math.pi / 2)
        finish(step_obj, limestone, bevel=0.02)

    # Brass rail on the approach.
    for side in (-1, 1):
        angle = gate["centerDeg"] + side * 5.6
        rx, ry = polar(ring["outerRadius"] + 3.0, angle)
        rail = box(f"Gate rail {'L' if side < 0 else 'R'}", (rx, ry, 0.85),
                   (0.1, 5.0, 0.1), rad(angle) + math.pi / 2)
        finish(rail, brass, bevel=0.01)


def build_core_detail(limestone, timber, brass) -> None:
    """Pilasters, ridge beams and gallery posts on the central tower."""
    core = DEF["core"]
    facets = core["facets"]
    inradius = core["radius"] * math.cos(math.pi / facets)
    top = core["plinthHeight"] + core["bodyHeight"]

    for index in range(facets):
        angle = 30 + index * (360 / facets)
        # Pilaster on each facet edge: the tower gains verticals to be read by.
        edge_angle = angle + (360 / facets) / 2
        px, py = polar(core["radius"] * 0.99, edge_angle)
        pilaster = box(f"Core pilaster {index:02d}", (px, py, core["plinthHeight"] + core["bodyHeight"] / 2),
                       (0.42, 0.42, core["bodyHeight"]), rad(edge_angle) + math.pi / 2)
        finish(pilaster, limestone, bevel=0.02)

        # No ridge beams: the pyramid already contributes six strong edges, and a
        # compound rotation here put them through the roof instead of on it.

        # Gallery post under the walkway ring.
        gx, gy = polar(core["radius"] + core["galleryDepth"] * 0.6, angle)
        gpost = box(f"Core gallery post {index:02d}", (gx, gy, core["galleryZ"] - 0.9),
                    (0.14, 0.14, 1.8), rad(angle) + math.pi / 2)
        finish(gpost, timber, bevel=0.01)

        # Brass tie at the eave.
        tx, ty = polar(inradius + 0.06, angle)
        tie = box(f"Core tie {index:02d}", (tx, ty, top - 0.35), (1.9, 0.12, 0.12),
                  rad(angle) + math.pi / 2)
        finish(tie, brass, bevel=0.01)


def join_by_prefix(prefix: str, name: str) -> None:
    """Merge repeated scatter meshes. They never animate apart, so paying a draw
    call each is waste; the brief budgets fewer than seventy on desktop."""
    parts = [o for o in bpy.context.scene.objects if o.type == "MESH" and o.name.startswith(prefix)]
    if len(parts) < 2:
        return
    bpy.ops.object.select_all(action="DESELECT")
    for obj in parts:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    bpy.context.active_object.name = name
    bpy.ops.object.select_all(action="DESELECT")


def group_scene() -> None:
    """Split the export into Citadel and Landscape.

    The opening needs the citadel to grow out of its own plan: the runtime scales
    the Citadel group from zero height to full while the camera tilts. Terrain,
    ridges and forest must not squash with it, so they live under their own root
    and fade in as the world forms.
    """
    join_by_prefix("Pine ", "Forest")
    join_by_prefix("Ridge ", "Ridges")

    citadel = bpy.data.objects.new("Citadel", None)
    landscape = bpy.data.objects.new("Landscape", None)
    scatter = bpy.data.objects.new("Scatter", None)
    for root in (citadel, landscape, scatter):
        bpy.context.collection.objects.link(root)

    # Timing groups, each an empty at the origin. The runtime raises a whole group
    # by scaling it, which is ground anchored for free: no per object position
    # compensation, so nothing can drift out of alignment. It also lets the edge
    # overlays merge per group instead of one pair per mesh.
    stages = [
        ("Stage ring", ("Ring ",)),
        ("Stage bays", ("Bay ",)),
        ("Stage gate", ("Gate ", "Gallery post")),
        ("Stage towers", ("Tower ",)),
        ("Stage core", ("Core ",)),
        ("Stage nodes", ("Node ",)),
    ]
    stage_objects = {}
    for name, _ in stages:
        empty = bpy.data.objects.new(name, None)
        bpy.context.collection.objects.link(empty)
        empty.parent = citadel
        stage_objects[name] = empty

    # Ground is separate from what stands on it. The terrain has to be there as the
    # citadel rises, or the building reads as a disc floating in the dark; ridges
    # and forest arrive later, once the camera is high enough to take them in.
    for obj in list(bpy.context.scene.objects):
        if obj.type != "MESH":
            continue
        # Match the joined names too: joining renames the merged mesh, so testing
        # only the original prefixes dropped the whole forest into the citadel,
        # where it appeared in one pop instead of arriving with the world.
        if obj.name in {"Forest", "Ridges"} or obj.name.startswith(("Ridge ", "Pine ")):
            target = scatter
        elif obj.name.startswith("Terrain") or obj.name == "Route":
            target = landscape
        else:
            target = citadel
            for name, prefixes in stages:
                if obj.name.startswith(prefixes):
                    target = stage_objects[name]
                    break
        matrix = obj.matrix_world.copy()
        obj.parent = target
        obj.matrix_world = matrix


def setup_stage() -> None:
    """Blue hour: cool sky key, low warm fill, readable shadow detail."""
    world = bpy.data.worlds.new("Blue hour")
    bpy.context.scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (*linear_rgb("#26364a"), 1.0)
    bg.inputs[1].default_value = 2.4

    key = bpy.data.lights.new("Key", "SUN")
    key.energy = 5.2
    key.color = linear_rgb("#c9d8e6")
    key.angle = rad(2.4)
    key_obj = bpy.data.objects.new("Key", key)
    key_obj.location = (-34, -26, 40)
    key_obj.rotation_euler = (rad(52), 0.0, rad(-38))
    bpy.context.collection.objects.link(key_obj)

    fill = bpy.data.lights.new("Occupancy fill", "POINT")
    fill.energy = 1600
    fill.color = linear_rgb("#e8bd74")
    fill.shadow_soft_size = 3.0
    fill_obj = bpy.data.objects.new("Occupancy fill", fill)
    fill_obj.location = (0, 1.5, 6.5)
    bpy.context.collection.objects.link(fill_obj)

    target = bpy.data.objects.new("Hero target", None)
    target.location = (0.0, 1.5, 4.2)
    bpy.context.collection.objects.link(target)

    camera = bpy.data.cameras.new("Hero")
    camera.lens = 46
    cam_obj = bpy.data.objects.new("Hero", camera)
    # Outside and above the ring, looking across the gate toward the core,
    # exactly the hero composition the production brief specifies.
    cam_obj.location = (30.0, -62.0, 34.0)
    bpy.context.collection.objects.link(cam_obj)
    track = cam_obj.constraints.new("TRACK_TO")
    track.target = target
    track.track_axis = "TRACK_NEGATIVE_Z"
    track.up_axis = "UP_Y"
    bpy.context.scene.camera = cam_obj


def configure_output() -> None:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1600
    scene.render.resolution_y = 900
    scene.render.film_transparent = False
    scene.render.filepath = str(POSTER)
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Base Contrast"


def main() -> None:
    clear_scene()
    palette = DEF["palette"]

    limestone = material("Limestone", palette["limestone"], 0.9)
    limestone_light = material("Limestone light", palette["limestoneLight"], 0.86)
    plaster = material("Mineral plaster", palette["plaster"], 0.92)
    timber = material("Blackened timber", palette["timber"], 0.7)
    roof_mat = material("Compact roof", palette["roof"], 0.74, metallic=0.04)
    brass = material("Oxidized brass", palette["brass"], 0.4, metallic=0.75)
    glass = material("Occupied light", palette["glass"], 0.3,
                     emission="#f0c67e", emission_strength=9.0)
    signal = material("Signal anchor", palette["signal"], 0.26,
                      emission=palette["signal"], emission_strength=4.0)
    pivot_mat = material("Pivot", palette["pivot"], 0.34, metallic=0.2,
                         emission=palette["pivot"], emission_strength=0.18)
    earth = material("Night earth", palette["earth"], 0.98)
    ridge_mat = material("Far ridge", "#232c33", 1.0)
    pine_mat = material("Country pine", "#161f19", 0.99)

    build_terrain(earth)
    build_distance(ridge_mat, pine_mat)
    build_route(limestone_light)
    build_ring(limestone, plaster, roof_mat, timber, brass, glass)
    build_gate(limestone, brass, timber)
    build_core(limestone, plaster, timber, roof_mat, brass, pivot_mat)
    build_wall_detail(limestone, brass, timber, glass)
    build_core_detail(limestone, timber, brass)
    build_nodes(brass, signal)

    group_scene()
    setup_stage()
    configure_output()

    bpy.ops.export_scene.gltf(
        filepath=str(RAW_GLB),
        export_format="GLB",
        export_apply=True,
        export_yup=True,
    )
    bpy.ops.render.render(write_still=True)
    print(f"Built {RAW_GLB}")
    print(f"Rendered {POSTER}")


main()
