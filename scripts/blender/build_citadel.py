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
        # No flat cap. build_towers gives this a corbelled crown, a parapet with
        # merlons and a roof that comes to a point; a slab on top of a prism was
        # exactly what made these read as pillars rather than towers.


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
    # Turn the whole tower half a facet.
    #
    # A hexagonal prism built with no yaw puts a vertex on every 30 + k*60, which
    # means the gate axis at -90 ran into a corner of the keep rather than a face
    # of it. Everything hung off that angle inherited the error: the openings sat
    # folded over an edge, the pilasters meant for the corners lay flat on the
    # faces, and the reader walked through the gate towards a keep with a spine
    # down the middle of the frame instead of a wall to put a door in.
    yaw = rad(30)

    plinth = prism("Core plinth", (0, 0, core["plinthHeight"] / 2),
                   core["plinthRadius"], core["plinthHeight"], facets, yaw)
    finish(plinth, limestone)

    body_z = core["plinthHeight"] + core["bodyHeight"] / 2
    body = prism("Core body", (0, 0, body_z), core["radius"], core["bodyHeight"], facets, yaw)
    finish(body, plaster)

    gallery = prism("Core gallery", (0, 0, core["galleryZ"]),
                    core["radius"] + core["galleryDepth"], 0.3, facets, yaw)
    finish(gallery, timber, bevel=0.02)

    roof_z = core["plinthHeight"] + core["bodyHeight"] + core["roofHeight"] / 2
    roof = prism("Core roof", (0, 0, roof_z),
                 core["radius"] + core["roofOverhang"], core["roofHeight"], facets, yaw)
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
                 0.17, core["pivotHeight"], 6, yaw)
    finish(apex, pivot_mat, bevel=0.02)

    # One recessed opening per facet, facing outward. With the tower turned half a
    # facet the face centres sit at 30 + k*60, so one of them looks straight down
    # the gate axis at -90 - which is where the courtyard portal goes instead.
    inradius = core["radius"] * math.cos(math.pi / facets)
    for index in range(facets):
        angle = 30 + index * (360 / facets)
        # Except on the facet that faces the gate. A real portal goes there, and
        # this panel sat two centimetres in front of it: from the courtyard the
        # doorway read as two thin slots with a brass plate down the middle.
        if abs((angle - (DEF["gate"]["centerDeg"] % 360) + 180) % 360 - 180) < 1:
            continue
        fx, fy = polar(inradius + 0.05, angle)
        yaw = rad(angle) + math.pi / 2
        frame = box(f"Core opening {index:02d}", (fx, fy, 3.4),
                    (1.5, 0.18, 2.6), yaw)
        finish(frame, brass, bevel=0.02)


def build_court(limestone, limestone_light, plaster, timber, roof_mat, brass, glass) -> None:
    """The courtyard, and the way into the keep.

    Everything from the gate to the keep used to be bare ground: seven and a half
    metres of nothing, ending on one blank plaster facet. That is the frame the
    opening walks the reader into and hands the story over on, so it was the worst
    empty space in the model. It gets a paved approach, a lit portal on the facet
    that looks straight down the gate axis, lamps to break the floor up, and stores
    leaning on the inside of the wall so the ring reads as inhabited.
    """
    core = DEF["core"]
    ring = DEF["ring"]
    centre = DEF["gate"]["centerDeg"]
    facets = core["facets"]
    inradius = core["radius"] * math.cos(math.pi / facets)
    plinth_r = core["plinthRadius"]
    plinth_h = core["plinthHeight"]
    # Facets sit at 30 + k*60, so one of them looks straight down the gate axis.
    facing = rad(centre) + math.pi / 2

    # --- the floor ------------------------------------------------------------
    # The courtyard was standing on the terrain, which is near black by design: the
    # ground outside has to read as night. Inside the walls that made everything
    # anybody put in the yard - barrels, a cart, a well - disappear into a void, and
    # the lamps had nothing to fall on. Paved, the yard reads and the clutter on it
    # reads with it.
    yard = annulus("Court paving", plinth_r + 0.15, ring["innerRadius"] - 0.05,
                   0, 360, 0.0, 0.09, ring["segments"])
    finish(yard, limestone_light, bevel=0)

    # Radial joints, so it is paving and not a disc.
    for index in range(16):
        deg = index * 22.5
        jx, jy = polar((plinth_r + ring["innerRadius"]) / 2, deg)
        joint = box(f"Court joint {index:02d}", (jx, jy, 0.1),
                    (0.09, ring["innerRadius"] - plinth_r - 0.4, 0.03), rad(deg) + math.pi / 2)
        finish(joint, limestone, bevel=0)

    # --- the approach ---------------------------------------------------------
    # One slab from the inside of the gate to the foot of the keep steps, so the
    # walk has a floor under it instead of open ground.
    run_from, run_to = ring["innerRadius"] + 0.2, plinth_r + 1.9
    ax, ay = polar((run_from + run_to) / 2, centre)
    apron = box("Court apron", (ax, ay, 0.06), (5.2, run_from - run_to, 0.12), facing)
    finish(apron, limestone_light, bevel=0.03)

    # --- steps up onto the plinth ---------------------------------------------
    for index in range(3):
        depth, rise = 0.62, plinth_h / 3
        r = plinth_r + 3.1 - index * depth
        sx, sy = polar(r, centre)
        step = box(f"Court step {index:02d}", (sx, sy, rise * (index + 0.5)),
                   (4.4 - index * 0.3, depth, rise), facing)
        finish(step, limestone, bevel=0.02)

    # --- the portal, as a porch with a light at the back of it -----------------
    #
    # Not a recess in the keep. The keep is a solid hexagonal prism and a tunnel cut
    # into it is a boolean, which this build does not do - the first attempt built
    # one anyway and it came out entirely inside the masonry, invisible from the
    # courtyard, leaving a flat pale panel where a doorway should be.
    #
    # So the passage projects outward instead. Dark cheeks and a dark soffit run two
    # and a half metres out from the keep face to a stone mouth, with a lit opening
    # at the far end. From across the courtyard it reads as a way in with something
    # on the other side; walking at it, the light grows because it is nearer, which
    # is the whole reason the white-out at the crossing means anything.
    opening_w, opening_h = 2.6, 3.8
    jamb_w, head_h = 0.34, 0.4
    porch = 2.5
    mouth = inradius + porch
    sill_z = plinth_h

    for name, radius, size, height in (
        ("floor", inradius + porch / 2, (opening_w + 0.5, porch, 0.12), sill_z + 0.06),
        ("soffit", inradius + porch / 2, (opening_w + 0.5, porch, 0.24), sill_z + opening_h + 0.12),
    ):
        cx, cy = polar(radius, centre)
        finish(box(f"Court portal {name}", (cx, cy, height), size, facing), limestone, bevel=0.02)

    for side in (-1, 1):
        off = side * (opening_w / 2 + 0.12)
        cx, cy = polar(inradius + porch / 2, centre)
        cheek = box(f"Court portal cheek {side + 1}",
                    (cx + off * math.cos(facing), cy + off * math.sin(facing),
                     sill_z + opening_h / 2),
                    (0.24, porch, opening_h), facing)
        finish(cheek, timber, bevel=0.02)

    # The light at the end. Narrower than the mouth, so it reads as a way on.
    lx, ly = polar(inradius + 0.08, centre)
    beacon = box("Court portal beacon", (lx, ly, sill_z + opening_h * 0.46),
                 (opening_w * 0.62, 0.12, opening_h * 0.56), facing)
    finish(beacon, glass)
    # A dark surround, so the lit part is an opening and not a lit wall.
    back = box("Court portal back", (lx, ly, sill_z + opening_h / 2),
               (opening_w, 0.06, opening_h), facing)
    finish(back, timber)

    # Stone mouth at the outer end: jambs, head, and a brass lintel under it.
    mx, my = polar(mouth, centre)
    for side in (-1, 1):
        ox = side * (opening_w + jamb_w) / 2
        jamb = box(f"Court portal jamb {'L' if side < 0 else 'R'}",
                   (mx + ox * math.cos(facing), my + ox * math.sin(facing),
                    sill_z + opening_h / 2),
                   (jamb_w, 0.46, opening_h + head_h), facing)
        finish(jamb, limestone, bevel=0.02)

    head = box("Court portal head", (mx, my, sill_z + opening_h + head_h / 2),
               (opening_w + jamb_w * 2, 0.5, head_h), facing)
    finish(head, limestone, bevel=0.02)
    lintel = box("Court portal lintel", (mx, my, sill_z + opening_h + 0.04),
                 (opening_w, 0.54, 0.1), facing)
    finish(lintel, brass, bevel=0.01)

    # One leaf standing open against the mouth.
    leaf_x = -(opening_w / 2 + 0.26)
    dx, dy = polar(mouth + 0.42, centre)
    leaf = box("Court portal leaf",
               (dx + leaf_x * math.cos(facing), dy + leaf_x * math.sin(facing),
                sill_z + opening_h / 2),
               (0.22, opening_w * 0.8, opening_h - 0.2), facing)
    finish(leaf, timber, bevel=0.02)

    # --- lamps ----------------------------------------------------------------
    # Off the gate axis, so they light the court without standing in the shot.
    for index, offset in enumerate((-62, -128, 62, 128)):
        angle = centre + offset
        r = ring["innerRadius"] - 2.6
        px, py = polar(r, angle)
        post = box(f"Court lamp post {index:02d}", (px, py, 1.5), (0.16, 0.16, 3.0),
                   rad(angle) + math.pi / 2)
        finish(post, timber, bevel=0.01)
        head_lamp = box(f"Court lamp head {index:02d}", (px, py, 3.14), (0.42, 0.42, 0.28),
                        rad(angle) + math.pi / 2)
        finish(head_lamp, brass, bevel=0.02)
        flame = box(f"Court lamp glass {index:02d}", (px, py, 2.86), (0.26, 0.26, 0.34),
                    rad(angle) + math.pi / 2)
        finish(flame, glass)

    # --- stores against the inside of the wall --------------------------------
    for index, angle in enumerate((centre + 46, centre + 92, centre + 152,
                                   centre - 46, centre - 92, centre - 152)):
        depth, width, height = 2.1, 3.4, 2.35
        r = ring["innerRadius"] - depth / 2
        sx, sy = polar(r, angle)
        yaw = rad(angle) + math.pi / 2
        shed = box(f"Court store {index:02d}", (sx, sy, height / 2), (width, depth, height), yaw)
        finish(shed, plaster, bevel=0.03)
        # A roof that slopes away from the wall, so the row is not six flat tops.
        rx, ry = polar(r - 0.12, angle)
        roof = box(f"Court store roof {index:02d}", (rx, ry, height + 0.12),
                   (width + 0.34, depth + 0.5, 0.24), yaw)
        roof.rotation_euler = (rad(-9), 0.0, yaw)
        finish(roof, roof_mat, bevel=0.02)
        # One lit opening each: the ring is occupied, not stored in.
        wx, wy = polar(r - depth / 2 - 0.02, angle)
        window = box(f"Court store light {index:02d}", (wx, wy, 1.32), (1.05, 0.1, 0.85), yaw)
        finish(window, glass)


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


def build_articulation(limestone, timber, roof_mat, brass) -> None:
    """The small tier of detail, and the reason the building stops reading as bricks.

    Everything here is under half a metre. That is the point: the model had one
    scale of detail - masses between one and ten metres - and a building with a
    single scale of detail is a toy however good its palette is. Real architecture
    steps down, mass to bay to moulding to joint, and the eye reads the steps.

    All of it merges per family before export. Three hundred separate blocks would
    be three hundred draw calls plus an outline pair each, which the brief does not
    have; merged, the whole tier costs about ten.
    """
    ring = DEF["ring"]
    gate = DEF["gate"]
    bays = DEF["bays"]
    towers = DEF["towers"]
    core = DEF["core"]
    gate_from = gate["centerDeg"] + gate["halfWidthDeg"]
    gate_to = gate["centerDeg"] - gate["halfWidthDeg"] + 360.0
    top = ring["height"] + ring["parapetHeight"]
    bay_centres = [bays["startDeg"] + i * bays["stepDeg"] for i in range(bays["count"])]

    def clear_of_bay(angle: float, margin: float) -> bool:
        norm = ((angle % 360) + 360) % 360
        return not any(
            abs((norm - ((c % 360) + 360) % 360 + 180) % 360 - 180) < margin
            for c in bay_centres
        )

    # A foot on the wall. A vertical plane meeting the ground at a hard line is the
    # single clearest tell that a thing was extruded rather than built.
    plinth = annulus("Trim plinth", ring["outerRadius"] - 0.1, ring["outerRadius"] + 0.44,
                     gate_from, gate_to, 0.0, 0.82, ring["segments"])
    finish(plinth, limestone, bevel=0.03)

    # Corbels under the parapet: the machicolation reading, and the thing that puts
    # a hard shadow line right where the wall meets its head.
    count = 72
    for step in range(count):
        angle = gate_from + (gate_to - gate_from) * (step / count)
        if not clear_of_bay(angle, bays["widthDeg"] * 0.62):
            continue
        cx, cy = polar(ring["outerRadius"] + 0.26, angle)
        corbel = box(f"Trim corbel {step:02d}", (cx, cy, ring["height"] - 0.42),
                     (0.3, 0.66, 0.44), rad(angle) + math.pi / 2)
        finish(corbel, limestone, bevel=0.02)

    # And a cornice over them, so the corbels carry something.
    cornice = annulus("Trim cornice", ring["outerRadius"] - 0.1, ring["outerRadius"] + 0.52,
                      gate_from, gate_to, ring["height"] - 0.14, 0.26, ring["segments"])
    finish(cornice, limestone, bevel=0.02)

    # Cap stones on the merlons. Same loop as the merlons themselves, or they land
    # on air: the parapet skips the bays and the caps have to skip them the same way.
    for step in range(60):
        angle = gate_from + (gate_to - gate_from) * (step / 60)
        if not clear_of_bay(angle, bays["widthDeg"] * 0.75):
            continue
        mx, my = polar(ring["outerRadius"] - 0.2, angle)
        cap = box(f"Trim cap {step:02d}", (mx, my, top + 0.74),
                  (0.78, 0.64, 0.14), rad(angle) + math.pi / 2)
        finish(cap, limestone, bevel=0.02)

    # Quoins on the bay corners: alternating blocks, which is how a corner is built
    # and how the eye knows two walls meet rather than one wall folding.
    for index in range(bays["count"]):
        angle = bays["startDeg"] + index * bays["stepDeg"]
        half = bays["widthDeg"] / 2
        for side in (-1, 1):
            for course in range(7):
                z = 0.55 + course * 0.82
                if z > bays["height"] - 0.4:
                    continue
                wide = course % 2 == 0
                qx, qy = polar(ring["outerRadius"] + bays["projection"] - 0.12,
                               angle + side * half)
                quoin = box(f"Trim quoin {index}{side + 1}{course}", (qx, qy, z),
                            (0.52 if wide else 0.34, 0.62, 0.62), rad(angle) + math.pi / 2)
                finish(quoin, limestone, bevel=0.02)

        # A sill under the opening and a hood over it, so the window sits in the
        # wall instead of being printed on it.
        outer = ring["outerRadius"] + bays["projection"]
        yaw = rad(angle) + math.pi / 2
        sx, sy = polar(outer + 0.12, angle)
        sill = box(f"Trim sill {index:02d}", (sx, sy, bays["openingBaseZ"] - 0.2),
                   (bays["openingWidth"] + 0.72, 0.42, 0.16), yaw)
        finish(sill, limestone, bevel=0.02)
        hood = box(f"Trim hood {index:02d}",
                   (sx, sy, bays["openingBaseZ"] + bays["openingHeight"] + 0.26),
                   (bays["openingWidth"] + 0.86, 0.5, 0.18), yaw)
        finish(hood, limestone, bevel=0.02)

        # Eaves board under the bay roof, and a ridge along its outer edge.
        ex, ey = polar(outer + 0.28, angle)
        eave = box(f"Trim eave {index:02d}", (ex, ey, bays["height"] - 0.09),
                   (bays["widthDeg"] * 0.32 + 3.3, 0.24, 0.2), yaw)
        finish(eave, timber, bevel=0.02)
        rx, ry = polar(outer + 0.3, angle)
        ridge = box(f"Trim ridge {index:02d}", (rx, ry, bays["height"] + bays["roofHeight"] + 0.03),
                    (bays["widthDeg"] * 0.32 + 3.6, 0.3, 0.16), yaw)
        finish(ridge, roof_mat, bevel=0.02)

    # Tower corbels and a cornice ring under each cap.
    for index, angle in enumerate(towers["angles"]):
        tx, ty = polar(ring["outerRadius"] - 0.6, angle)
        band = prism(f"Trim tower band {index:02d}",
                     (tx, ty, towers["height"] - 0.36), towers["radius"] + 0.22, 0.3, 8)
        finish(band, limestone, bevel=0.02)
        for step in range(10):
            a = step * 36
            cx = tx + math.cos(rad(a)) * (towers["radius"] + 0.12)
            cy = ty + math.sin(rad(a)) * (towers["radius"] + 0.12)
            corbel = box(f"Trim tower corbel {index}{step}", (cx, cy, towers["height"] - 0.74),
                         (0.28, 0.4, 0.34), rad(a) + math.pi / 2)
            finish(corbel, limestone, bevel=0.02)

    # Corbels under the keep's gallery, on the facet centres it already uses.
    inradius = core["radius"] * math.cos(math.pi / core["facets"])
    for index in range(core["facets"]):
        a = 30 + index * (360 / core["facets"])
        for offset in (-1.2, 0.0, 1.2):
            base_x, base_y = polar(inradius + 0.12, a)
            yaw = rad(a) + math.pi / 2
            cx = base_x + offset * math.cos(yaw)
            cy = base_y + offset * math.sin(yaw)
            corbel = box(f"Trim keep corbel {index}{offset > 0}{offset < 0}",
                         (cx, cy, core["galleryZ"] - 0.32), (0.26, 0.42, 0.34), yaw)
            finish(corbel, limestone, bevel=0.02)

    # Brass nosing on the gate steps: the tread edge is where a step reads from.
    for index in range(4):
        depth = 1.1
        nx, ny = polar(ring["outerRadius"] + 1.0 + index * depth - depth / 2 + 0.06,
                       gate["centerDeg"])
        nosing = box(f"Trim nosing {index:02d}", (nx, ny, 0.42 - index * 0.13 + 0.14),
                     (6.4 + index * 0.7, 0.12, 0.05), rad(gate["centerDeg"]) + math.pi / 2)
        finish(nosing, brass, bevel=0.01)

    # Merge per family. Three hundred blocks, about ten draw calls.
    join_by_prefix("Court joint ", "Court joints")

    for prefix, merged in (
        ("Trim corbel", "Trim corbels"),
        ("Trim cap", "Trim caps"),
        ("Trim quoin", "Trim quoins"),
        ("Trim sill", "Trim sills"),
        ("Trim hood", "Trim hoods"),
        ("Trim eave", "Trim eaves"),
        ("Trim ridge", "Trim ridges"),
        ("Trim tower corbel", "Trim tower corbels"),
        ("Trim tower band", "Trim tower bands"),
        ("Trim keep corbel", "Trim keep corbels"),
        ("Trim nosing", "Trim nosings"),
    ):
        join_by_prefix(prefix + " ", merged)


def build_occupation(limestone, limestone_light, plaster, timber, roof_mat, brass, glass) -> None:
    """What a working citadel has in it that an architectural model does not.

    Roof planes were the flattest thing left in the silhouette and the courtyard was
    a paved circle with a keep in it. Neither is wrong, both are empty: a building
    reads as inhabited from the things people leave lying about at their own scale,
    and roofs read as roofs from courses, ridges and the chimneys coming through
    them. Everything here is at or under a metre, and everything merges per family.
    """
    ring = DEF["ring"]
    bays = DEF["bays"]
    centre = DEF["gate"]["centerDeg"]
    inner = ring["innerRadius"]

    # --- tile courses on the bay roofs ---------------------------------------
    for index in range(bays["count"]):
        angle = bays["startDeg"] + index * bays["stepDeg"]
        half = bays["widthDeg"] / 2 + 0.7
        outer = ring["outerRadius"] + bays["projection"] + 0.34
        for course in range(4):
            r_in = ring["outerRadius"] - 0.62 + (outer - ring["outerRadius"] + 0.62) * (course / 4)
            band = annulus(f"Roof course {index}{course}", r_in, r_in + 0.1,
                           angle - half, angle + half,
                           bays["height"] + bays["roofHeight"] + 0.005, 0.07, 8)
            finish(band, timber, bevel=0.01)

        # Chimney through the roof, off centre, with a brass cap.
        cx, cy = polar(ring["outerRadius"] + 0.5, angle + half * 0.45)
        stack = box(f"Roof stack {index:02d}",
                    (cx, cy, bays["height"] + bays["roofHeight"] + 0.72),
                    (0.54, 0.54, 1.7), rad(angle) + math.pi / 2)
        finish(stack, limestone, bevel=0.02)
        cap = box(f"Roof cap {index:02d}",
                  (cx, cy, bays["height"] + bays["roofHeight"] + 1.62),
                  (0.72, 0.72, 0.12), rad(angle) + math.pi / 2)
        finish(cap, brass, bevel=0.02)

    # --- banners between the merlons -----------------------------------------
    # Cloth is the one soft thing on a building made of stone, and hanging it off
    # the wall head breaks a horizon that is otherwise all one line.
    # Hung clear of the cornice, not behind it. The first pass put them at the wall
    # face, which is half a metre inside the corbel course that runs over it: six
    # banners rendered, none of them visible from anywhere.
    hang_r = ring["outerRadius"] + 0.66
    for index, offset in enumerate((-118, -74, -34, 34, 74, 118)):
        angle = centre + offset
        bx, by = polar(hang_r, angle)
        banner = box(f"Banner {index:02d}", (bx, by, ring["height"] - 2.15),
                     (1.35, 0.07, 2.9), rad(angle) + math.pi / 2)
        finish(banner, plaster if index % 2 else timber, bevel=0.01)
        rail = box(f"Banner rail {index:02d}", (bx, by, ring["height"] - 0.62),
                   (1.6, 0.12, 0.12), rad(angle) + math.pi / 2)
        finish(rail, brass, bevel=0.01)

    # --- things left in the courtyard ----------------------------------------
    # Barrels, crates, stacked timber, a cart and a well. All of it at human scale,
    # which is the scale the model had nothing at.
    for index, (deg, radius) in enumerate((
        (centre + 26, inner - 3.4), (centre + 30, inner - 4.1), (centre - 24, inner - 3.6),
        (centre + 70, inner - 3.2), (centre - 70, inner - 3.9), (centre + 112, inner - 3.5),
        (centre - 112, inner - 3.3), (centre + 160, inner - 3.7),
    )):
        bx, by = polar(radius, deg)
        yaw = rad(deg) + math.pi / 2
        barrel = prism(f"Yard barrel {index:02d}", (bx, by, 0.44), 0.34, 0.88, 10, yaw)
        finish(barrel, timber, bevel=0.02)
        hoop = prism(f"Yard hoop {index:02d}", (bx, by, 0.62), 0.36, 0.07, 10, yaw)
        finish(hoop, brass, bevel=0.01)

    for index, (deg, radius, size, height) in enumerate((
        (centre + 40, inner - 2.8, 0.9, 0.62), (centre + 44, inner - 2.6, 0.7, 0.5),
        (centre - 38, inner - 2.9, 0.86, 0.66), (centre - 96, inner - 2.7, 0.8, 0.58),
        (centre + 134, inner - 2.8, 0.94, 0.7), (centre - 134, inner - 3.1, 0.72, 0.52),
    )):
        cx, cy = polar(radius, deg)
        crate = box(f"Yard crate {index:02d}", (cx, cy, height / 2), (size, size * 0.8, height),
                    rad(deg) + math.pi / 4)
        finish(crate, timber, bevel=0.02)

    # Stacked firewood against the stores.
    for index, deg in enumerate((centre + 60, centre - 60, centre + 178)):
        for row in range(3):
            wx, wy = polar(inner - 2.5, deg)
            log_row = box(f"Yard wood {index}{row}", (wx, wy, 0.16 + row * 0.3),
                          (2.2, 0.62, 0.28), rad(deg) + math.pi / 2)
            finish(log_row, timber, bevel=0.06)

    # A well, off the gate axis, with a brass winding beam.
    wx, wy = polar(inner - 5.4, centre + 52)
    curb = prism("Yard well curb", (wx, wy, 0.42), 1.0, 0.84, 12)
    finish(curb, limestone_light, bevel=0.03)
    for side in (-1, 1):
        post = box(f"Yard well post {side + 1}", (wx + side * 0.86, wy, 1.3),
                   (0.16, 0.16, 1.9), 0.0)
        finish(post, timber, bevel=0.02)
    beam = box("Yard well beam", (wx, wy, 2.22), (2.1, 0.18, 0.18), 0.0)
    finish(beam, brass, bevel=0.02)

    # A cart, parked, because a courtyard with nothing on wheels is a diagram.
    cx, cy = polar(inner - 4.6, centre - 44)
    yaw = rad(centre - 44) + math.pi / 2
    bed = box("Yard cart bed", (cx, cy, 0.78), (2.6, 1.3, 0.24), yaw)
    finish(bed, timber, bevel=0.02)
    for side in (-1, 1):
        for end in (-1, 1):
            ox = end * 0.85
            oy = side * 0.72
            wheel = prism(f"Yard cart wheel {side + 1}{end + 1}",
                          (cx + ox * math.cos(yaw) - oy * math.sin(yaw),
                           cy + ox * math.sin(yaw) + oy * math.cos(yaw), 0.62),
                          0.62, 0.14, 12, yaw + math.pi / 2)
            wheel.rotation_euler = (math.pi / 2, 0.0, yaw)
            finish(wheel, timber, bevel=0.02)
    shaft = box("Yard cart shaft", (cx, cy, 0.58), (3.6, 0.14, 0.14), yaw)
    finish(shaft, timber, bevel=0.02)

    # Braziers: light at ground level, which the courtyard had none of.
    for index, deg in enumerate((centre + 34, centre - 34)):
        bx, by = polar(inner - 6.2, deg)
        bowl = prism(f"Yard brazier {index:02d}", (bx, by, 0.95), 0.42, 0.34, 8)
        finish(bowl, brass, bevel=0.03)
        leg = box(f"Yard brazier leg {index:02d}", (bx, by, 0.4), (0.14, 0.14, 0.82), 0.0)
        finish(leg, timber, bevel=0.01)
        coals = prism(f"Yard coals {index:02d}", (bx, by, 1.08), 0.3, 0.12, 8)
        finish(coals, glass)

    for prefix, merged in (
        ("Court portal cheek", "Court portal cheeks"),
        ("Roof course", "Roof courses"),
        ("Roof stack", "Roof stacks"),
        ("Roof cap", "Roof caps"),
        ("Banner rail", "Banner rails"),
        ("Banner", "Banners"),
        ("Yard barrel", "Yard barrels"),
        ("Yard hoop", "Yard hoops"),
        ("Yard crate", "Yard crates"),
        ("Yard wood", "Yard woodpile"),
        ("Yard well post", "Yard well posts"),
        ("Yard cart wheel", "Yard cart wheels"),
        ("Yard brazier leg", "Yard brazier legs"),
        ("Yard brazier ", "Yard braziers"),
        ("Yard coals", "Yard coalbeds"),
    ):
        join_by_prefix(prefix + " " if not prefix.endswith(" ") else prefix, merged)


def taper_top(obj, factor: float = 0.14) -> None:
    """Pull a prism's top ring into a point, which is how the keep's roof is made."""
    for vertex in obj.data.vertices:
        if vertex.co.z > 0:
            vertex.co.x *= factor
            vertex.co.y *= factor


def build_towers(limestone, plaster, timber, roof_mat, brass, glass) -> None:
    """The four towers, which were four naked prisms.

    Two of them are the gate jambs - hexagonal shafts 11.4m tall, the tallest thing
    in the model, and they had no cap, no cornice, no opening and no course: they
    read as grey pillars parked next to the door. The other two carried a flat slab
    for a roof. Between them they are most of the citadel's skyline, so most of what
    the eye judges the building by was the part with nothing on it.

    Each gets the same anatomy, which is what a tower has: a battered foot, courses
    that break the shaft, a corbelled crown, a parapet, a roof that comes to a
    point, and lit windows so somebody is up there.
    """
    ring = DEF["ring"]
    gate = DEF["gate"]
    towers = DEF["towers"]
    core = DEF["core"]
    mid = (ring["innerRadius"] + ring["outerRadius"]) / 2

    def dress(tag, cx, cy, angle, radius, height, sides):
        yaw = rad(angle)
        inradius = radius * math.cos(math.pi / sides)
        step = 360.0 / sides

        # A battered foot: a tower that meets the ground on a line has no weight.
        foot = prism(f"{tag} foot", (cx, cy, 0.62), radius + 0.3, 1.24, sides, yaw)
        finish(foot, limestone, bevel=0.04)

        # Two courses, which is what stops a shaft reading as an extrusion.
        for level, z in enumerate((height * 0.36, height * 0.68)):
            course = prism(f"{tag} course {level}", (cx, cy, z), radius + 0.16, 0.28, sides, yaw)
            finish(course, limestone, bevel=0.02)

        # Corbelled crown, parapet, and merlons on top of it.
        corbel = prism(f"{tag} corbel", (cx, cy, height - 0.5), radius + 0.34, 0.42, sides, yaw)
        finish(corbel, limestone, bevel=0.02)
        parapet = prism(f"{tag} parapet", (cx, cy, height + 0.42), radius + 0.28, 0.9, sides, yaw)
        finish(parapet, limestone, bevel=0.02)
        for k in range(sides):
            a = angle + k * step
            mx, my = polar(1.0, a)
            merlon = box(f"{tag} merlon {k}", (cx + mx * (inradius + 0.16), cy + my * (inradius + 0.16),
                                               height + 1.12), (0.66, 0.34, 0.5), rad(a) + math.pi / 2)
            finish(merlon, limestone, bevel=0.02)

        # A roof that comes to a point. The flat slab was the tell.
        roof = prism(f"{tag} roof", (cx, cy, height + 2.55), radius + 0.5, 2.4, sides, yaw)
        taper_top(roof)
        finish(roof, roof_mat, bevel=0.03)
        spire = prism(f"{tag} spire", (cx, cy, height + 3.95), 0.14, 0.8, 6, yaw)
        finish(spire, brass, bevel=0.02)

        # Lit windows on the two faces that look outward, slits on the rest, so the
        # tower is occupied from the hero frame and defended from everywhere else.
        for k in range(sides):
            a = angle + k * step
            fx, fy = polar(1.0, a)
            face_yaw = rad(a) + math.pi / 2
            lit = k in (0, 1, sides - 1)
            for level, z in enumerate((height * 0.5, height * 0.82) if lit else (height * 0.6,)):
                w, h_ = (0.68, 1.15) if lit else (0.2, 1.0)
                surround = box(f"{tag} reveal {k}{level}",
                               (cx + fx * (inradius + 0.04), cy + fy * (inradius + 0.04), z),
                               (w + 0.34, 0.24, h_ + 0.34), face_yaw)
                finish(surround, limestone, bevel=0.02)
                pane = box(f"{tag} pane {k}{level}",
                           (cx + fx * (inradius + 0.14), cy + fy * (inradius + 0.14), z),
                           (w, 0.12, h_), face_yaw)
                finish(pane, glass if lit else timber)

    # The two gate towers, on the jamb geometry that is already solved.
    jamb_inset = 2.15 * math.cos(math.pi / 6)
    opening = ring["outerRadius"] * math.sin(rad(gate["halfWidthDeg"]))
    jamb_offset = math.degrees(math.asin(min(0.9, (opening + jamb_inset + 0.14) / mid)))
    for sign in (-1, 1):
        angle = gate["centerDeg"] + sign * jamb_offset
        jx, jy = polar(mid, angle)
        dress(f"Gatetower {'L' if sign < 0 else 'R'}", jx, jy, angle, 2.15, gate["towerHeight"], 6)

    # And the two wall towers.
    for index, angle in enumerate(towers["angles"]):
        tx, ty = polar(ring["outerRadius"] - 0.5, angle)
        dress(f"Walltower {index:02d}", tx, ty, angle, towers["radius"], towers["height"], 8)

    # The keep becomes a lantern.
    #
    # Its shaft was ten metres of blank plaster with a gallery stuck round it. A
    # glazed band above the gallery makes the middle of the citadel the thing that
    # glows, which is what the whole enclosure is arranged around.
    facets = core["facets"]
    inradius = core["radius"] * math.cos(math.pi / facets)
    top = core["plinthHeight"] + core["bodyHeight"]
    # Three narrow lights per facet, not one sheet.
    #
    # The first version glazed most of each facet, and six panels four metres wide
    # at the emissive intensity every lit surface in this model shares came out as
    # a white slab that took the whole hero frame. A lantern is a lot of small
    # lights behind a frame; the mullions are most of what makes it read as one.
    lantern_z = (core["galleryZ"] + top) / 2 + 0.45
    lantern_h = top - core["galleryZ"] - 2.1
    light_w = core["radius"] * 0.2
    for index in range(facets):
        a = 30 + index * (360.0 / facets)
        fx, fy = polar(1.0, a)
        yaw = rad(a) + math.pi / 2
        tangent = (-math.sin(yaw), math.cos(yaw))
        for slot in (-1, 0, 1):
            offset = slot * core["radius"] * 0.28
            pane = box(f"Lantern pane {index}{slot + 1}",
                       (fx * (inradius + 0.06) + tangent[0] * offset,
                        fy * (inradius + 0.06) + tangent[1] * offset, lantern_z),
                       (light_w, 0.12, lantern_h), yaw)
            finish(pane, glass)
        for slot in (-1.5, -0.5, 0.5, 1.5):
            offset = slot * core["radius"] * 0.28
            mullion = box(f"Lantern mullion {index}{slot > 0}{abs(slot) > 1}",
                          (fx * (inradius + 0.16) + tangent[0] * offset,
                           fy * (inradius + 0.16) + tangent[1] * offset, lantern_z),
                          (0.16, 0.2, lantern_h + 0.3), yaw)
            finish(mullion, timber, bevel=0.01)
        transom = box(f"Lantern transom {index:02d}",
                      (fx * (inradius + 0.16), fy * (inradius + 0.16), lantern_z),
                      (core["radius"] * 0.92, 0.2, 0.16), yaw)
        finish(transom, timber, bevel=0.01)

    for prefix, merged in (
        ("Gatetower L merlon", "Gatetower L merlons"),
        ("Gatetower R merlon", "Gatetower R merlons"),
        ("Walltower 00 merlon", "Walltower 00 merlons"),
        ("Walltower 01 merlon", "Walltower 01 merlons"),
        ("Gatetower L course", "Gatetower L courses"),
        ("Gatetower R course", "Gatetower R courses"),
        ("Walltower 00 course", "Walltower 00 courses"),
        ("Walltower 01 course", "Walltower 01 courses"),
        ("Gatetower L reveal", "Gatetower L reveals"),
        ("Gatetower R reveal", "Gatetower R reveals"),
        ("Walltower 00 reveal", "Walltower 00 reveals"),
        ("Walltower 01 reveal", "Walltower 01 reveals"),
        ("Gatetower L pane", "Gatetower L panes"),
        ("Gatetower R pane", "Gatetower R panes"),
        ("Walltower 00 pane", "Walltower 00 panes"),
        ("Walltower 01 pane", "Walltower 01 panes"),
        ("Lantern pane", "Lantern panes"),
        ("Lantern mullion", "Lantern mullions"),
        ("Lantern transom", "Lantern transoms"),
    ):
        join_by_prefix(prefix + " ", merged)


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
        ("Stage towers", ("Tower ", "Gatetower ", "Walltower ", "Lantern ")),
        ("Stage core", ("Core ",)),
        ("Stage court", ("Court ",)),
        ("Stage trim", ("Trim ",)),
        ("Stage life", ("Yard ", "Roof ", "Banner")),
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
    build_court(limestone, limestone_light, plaster, timber, roof_mat, brass, glass)
    build_articulation(limestone, timber, roof_mat, brass)
    build_occupation(limestone, limestone_light, plaster, timber, roof_mat, brass, glass)
    build_towers(limestone, plaster, timber, roof_mat, brass, glass)
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
