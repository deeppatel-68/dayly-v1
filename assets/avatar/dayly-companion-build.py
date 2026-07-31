"""Build Dayly's portable hero/lite companion assets and review renders."""

import bmesh
import bpy
import json
import math
import struct
from pathlib import Path


OUT_DIR = Path(__file__).resolve().parent
REVIEW_DIR = OUT_DIR / "review"
REVIEW_DIR.mkdir(parents=True, exist_ok=True)
FACE_VARIANT_DIR = OUT_DIR / "face-variants"
FACE_VARIANT_DIR.mkdir(parents=True, exist_ok=True)

HERO_BUDGET = {"bytes": 700_000, "triangles": 15_000}
LITE_BUDGET = {"bytes": 450_000, "triangles": 7_000}
FACE_GROUPS = ["Face_Classic", "Face_Eve", "Face_Screen", "Face_Kirby", "Face_Joy"]
REQUIRED_NAMES = [
    "Body", "Body_Charcoal", "FacePanel", "VisorRim", "LeftEye", "RightEye",
    "VisorLip", "HaloCharm", "EnergyCore", "LeftFlipper", "RightFlipper",
    *FACE_GROUPS,
]


# ---------- clean scene ----------
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete()
for block_list in (
    bpy.data.meshes,
    bpy.data.curves,
    bpy.data.materials,
    bpy.data.lights,
    bpy.data.cameras,
):
    for block in list(block_list):
        if block.users == 0:
            block_list.remove(block)

scene = bpy.context.scene


# ---------- materials ----------
def make_mat(name, color, roughness, metallic=0.0, emission=None,
             emission_strength=0.0, coat=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if emission:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1.0)
        bsdf.inputs["Emission Strength"].default_value = emission_strength
    if coat:
        try:
            bsdf.inputs["Coat Weight"].default_value = coat
        except KeyError:
            pass
    return mat


ORANGE = (1.0, 0.15, 0.035)
WARM_WHITE = (1.0, 0.86, 0.66)
mat_body = make_mat("Body_Charcoal", (0.052, 0.052, 0.06), 0.58)
mat_base = make_mat("Base_Black", (0.009, 0.009, 0.012), 0.16, metallic=0.12)
mat_eye = make_mat("Eye_White_Emission", WARM_WHITE, 0.38,
                   emission=WARM_WHITE, emission_strength=2.1)
mat_pupil = make_mat("Pupil_Dark", (0.012, 0.012, 0.018), 0.3)
mat_catch = make_mat("Catchlight_White", (1.0, 1.0, 1.0), 0.3,
                     emission=(1.0, 1.0, 1.0), emission_strength=2.0)
mat_blush = make_mat("Blush_Peach", (0.72, 0.22, 0.16), 0.72,
                     emission=(0.72, 0.22, 0.16), emission_strength=0.08)
mat_accent = make_mat("Accent_Orange_Emission", ORANGE, 0.42,
                      emission=ORANGE, emission_strength=3.5)
mat_core = make_mat("Core_Orange_Emission", ORANGE, 0.36,
                    emission=ORANGE, emission_strength=6.0)
mat_platform = make_mat("Platform_Dark", (0.018, 0.018, 0.022), 0.76)
mat_inner_glow = make_mat("Platform_Inner_Glow", ORANGE, 0.5,
                          emission=ORANGE, emission_strength=0.4)
mat_silhouette = make_mat("Review_Silhouette", (0.006, 0.006, 0.008), 1.0)


# ---------- geometry helpers ----------
def smooth(obj):
    if hasattr(obj.data, "polygons"):
        for polygon in obj.data.polygons:
            polygon.use_smooth = True


def link(obj):
    bpy.context.collection.objects.link(obj)


def parent_local(child, parent):
    bpy.context.view_layer.update()
    world_transform = child.matrix_world.copy()
    child.parent = parent
    child.matrix_world = world_transform


def new_empty(name):
    empty = bpy.data.objects.new(name, None)
    empty.empty_display_size = 0.04
    link(empty)
    return empty


def uv_sphere(name, location, radius, scale=(1, 1, 1), rotation=(0, 0, 0),
              segments=16, ring_count=10, mat=None):
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments,
        ring_count=ring_count,
        radius=radius,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    if mat:
        obj.data.materials.append(mat)
    smooth(obj)
    return obj


def rounded_box(name, location, dimensions, mat, bevel_segments=5,
                bevel_offset=0.18, rotation=(0, 0, 0)):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.bevel(
        bm,
        geom=list(bm.verts) + list(bm.edges) + list(bm.faces),
        offset=bevel_offset,
        segments=bevel_segments,
        affect="EDGES",
        profile=0.62,
    )
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    obj.location = location
    obj.scale = dimensions
    obj.rotation_euler = rotation
    mesh.materials.append(mat)
    smooth(obj)
    link(obj)
    return obj


def arc_curve(name, location, radius, start_angle, end_angle, bevel_depth, mat,
              points=40, rotation=(0, 0, 0)):
    curve = bpy.data.curves.new(name, type="CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 2
    curve.bevel_depth = bevel_depth
    curve.bevel_resolution = 2
    spline = curve.splines.new("POLY")
    spline.points.add(points - 1)
    for index, point in enumerate(spline.points):
        progress = index / (points - 1)
        angle = start_angle + (end_angle - start_angle) * progress
        point.co = (radius * math.cos(angle), radius * math.sin(angle), 0, 1)
    obj = bpy.data.objects.new(name, curve)
    obj.location = location
    obj.rotation_euler = rotation
    curve.materials.append(mat)
    link(obj)
    return obj


def smile_curve(name, center, half_width, depth, bevel_depth, mat, parent=None,
                points=12, inverted=False):
    curve = bpy.data.curves.new(name, type="CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 2
    curve.bevel_depth = bevel_depth
    curve.bevel_resolution = 2
    spline = curve.splines.new("POLY")
    spline.points.add(points - 1)
    for index, point in enumerate(spline.points):
        progress = index / (points - 1)
        arch = (1.0 - ((progress - 0.5) * 2.0) ** 2) * depth
        z = center[2] + (arch if inverted else -arch)
        point.co = (center[0] - half_width + 2 * half_width * progress, center[1], z, 1)
    obj = bpy.data.objects.new(name, curve)
    curve.materials.append(mat)
    link(obj)
    if parent:
        parent_local(obj, parent)
    return obj


def eye_with_details(prefix, parent, x, scale=(1.05, 0.32, 1.0),
                     primary=True, secondary=True, blush=True):
    side = "Left" if x < 0 else "Right"
    eye_name = f"{prefix}{side}Eye" if prefix else f"{side}Eye"
    eye = uv_sphere(eye_name, (x, -0.516, 0.835), 0.077, scale=scale,
                    segments=16, ring_count=10, mat=mat_eye)
    parent_local(eye, parent)
    pupil_name = f"{prefix}{side}Pupil" if prefix else f"{side}Pupil"
    pupil = uv_sphere(pupil_name, (x, -0.540, 0.828), 0.040,
                      scale=(0.92, 0.28, 1.0), segments=12, ring_count=8,
                      mat=mat_pupil)
    parent_local(pupil, eye)
    sign = -1 if x < 0 else 1
    if primary:
        catch_name = f"{prefix}{side}Catchlight" if prefix else f"{side}Catchlight"
        catch = uv_sphere(catch_name, (x - 0.018, -0.552, 0.858), 0.012,
                          segments=8, ring_count=6, mat=mat_catch)
        parent_local(catch, eye)
    if secondary:
        catch2_name = f"{prefix}{side}Catchlight2" if prefix else f"{side}Catchlight2"
        catch2 = uv_sphere(catch2_name, (x + 0.020, -0.552, 0.810), 0.005,
                           segments=8, ring_count=6, mat=mat_catch)
        parent_local(catch2, eye)
    if blush:
        blush_name = f"{prefix}{side}Blush" if prefix else f"{side}Blush"
        cheek = uv_sphere(blush_name, (sign * 0.285, -0.535, 0.750), 0.025,
                          scale=(1.0, 0.28, 0.65), segments=10, ring_count=6,
                          mat=mat_blush)
        parent_local(cheek, parent)
    return eye


# ================================================================= SHARED BODY
# Locked seed silhouette: weighted lower mass, gentle forward intent, flat base.
bm = bmesh.new()
bmesh.ops.create_uvsphere(bm, u_segments=28, v_segments=18, radius=0.55)
for vertex in bm.verts:
    t = max(0.0, min(1.0, (vertex.co.z + 0.55) / 1.10))
    vertex.co.x *= 1.0 - 0.10 * t - 0.02 * t * t
    vertex.co.y *= 1.0 - 0.05 * t
    if vertex.co.z < -0.43:
        vertex.co.z = -0.43 + (vertex.co.z + 0.43) * 0.28
body_mesh = bpy.data.meshes.new("Body")
bm.to_mesh(body_mesh)
bm.free()
body = bpy.data.objects.new("Body", body_mesh)
body.location = (0, 0, 0.62)
body.scale = (1.00, 0.90, 1.02)
body.rotation_euler = (math.radians(3), 0, 0)
body_mesh.materials.append(mat_body)
body_mesh.materials.append(mat_base)
for polygon in body_mesh.polygons:
    if polygon.center.z < -0.31:
        polygon.material_index = 1
smooth(body)
link(body)

# Compatibility node: the body keeps its runtime `Body` name while this stable
# rig marker preserves the historical `Body_Charcoal` contract.
body_marker = new_empty("Body_Charcoal")
parent_local(body_marker, body)

# Compact nested squircle: stronger corner falloff and shallow depth let the
# pear body frame the face on every side instead of reading as a screen box.
face_panel = rounded_box("FacePanel", (0, -0.476, 0.82), (0.86, 0.065, 0.42),
                         mat_base, bevel_segments=6, bevel_offset=0.32)
visor_rim = rounded_box("VisorRim", (0, -0.458, 0.82), (0.92, 0.055, 0.48),
                        mat_body, bevel_segments=6, bevel_offset=0.32)
parent_local(visor_rim, face_panel)


# ================================================================ FACE GROUPS
face_classic = new_empty("Face_Classic")
face_eve = new_empty("Face_Eve")
face_screen = new_empty("Face_Screen")
face_kirby = new_empty("Face_Kirby")
face_joy = new_empty("Face_Joy")

# Orbit: warm open eyes, compact pupils and a calm micro-smile.
eye_with_details("", face_classic, -0.18)
eye_with_details("", face_classic, 0.18)
smile_curve("VisorLip", (0, -0.554, 0.724), 0.050, 0.016, 0.009,
            mat_accent, parent=face_classic)

# Focus: narrow orbit eyes, deliberately mouthless.
for name, x in (("EveLeftEye", -0.18), ("EveRightEye", 0.18)):
    eye = uv_sphere(name, (x, -0.518, 0.835), 0.077,
                    scale=(1.22, 0.28, 0.42), segments=16, ring_count=10,
                    mat=mat_eye)
    parent_local(eye, face_eve)
    pupil_name = name.replace("Eye", "Pupil")
    pupil = uv_sphere(pupil_name, (x, -0.542, 0.833), 0.033,
                      scale=(1.35, 0.22, 0.34), segments=12, ring_count=8,
                      mat=mat_pupil)
    parent_local(pupil, eye)
    catch_name = name.replace("Eye", "Catchlight")
    catch = uv_sphere(catch_name, (x - 0.020, -0.554, 0.840), 0.012,
                      segments=8, ring_count=6, mat=mat_catch)
    parent_local(catch, eye)
    catch2 = uv_sphere(catch_name + "2", (x + 0.022, -0.554, 0.829), 0.005,
                       segments=8, ring_count=6, mat=mat_catch)
    parent_local(catch2, eye)
for name, x in (("EveLeftBlush", -0.285), ("EveRightBlush", 0.285)):
    cheek = uv_sphere(name, (x, -0.535, 0.750), 0.022,
                      scale=(1.0, 0.28, 0.6), segments=10, ring_count=6,
                      mat=mat_blush)
    parent_local(cheek, face_eve)

# Pixel: one shared visor panel plus crisp low-resolution marks. ScreenPanel is
# an empty compatibility node, avoiding the previous duplicate visible panel.
screen_panel = new_empty("ScreenPanel")
parent_local(screen_panel, face_screen)
for name, x in (("ScreenLeftEye", -0.18), ("ScreenRightEye", 0.18)):
    tile = rounded_box(name, (x, -0.548, 0.835), (0.12, 0.020, 0.10),
                       mat_accent, bevel_segments=4)
    parent_local(tile, face_screen)
screen_mouth = rounded_box("ScreenMouth", (0, -0.549, 0.720),
                           (0.070, 0.018, 0.022), mat_accent,
                           bevel_segments=4)
parent_local(screen_mouth, face_screen)
for name, x in (("ScreenLeftBlush", -0.285), ("ScreenRightBlush", 0.285)):
    cheek = uv_sphere(name, (x, -0.535, 0.750), 0.023,
                      scale=(1.0, 0.28, 0.62), segments=10, ring_count=6,
                      mat=mat_blush)
    parent_local(cheek, face_screen)

# Spark: family-sized eyes, compact crescent pupils and micro status mouth.
for side, x, start, end in (
    ("Left", -0.18, math.radians(68), math.radians(292)),
    ("Right", 0.18, math.radians(-112), math.radians(112)),
):
    eye = uv_sphere(f"Kirby{side}Eye", (x, -0.518, 0.835), 0.077,
                    scale=(1.04, 0.29, 1.0), segments=16, ring_count=10,
                    mat=mat_eye)
    parent_local(eye, face_kirby)
    crescent = arc_curve(f"Kirby{side}Pupil", (x, -0.550, 0.833), 0.031,
                         start, end, 0.009, mat_pupil, points=18,
                         rotation=(math.pi / 2, 0, 0))
    parent_local(crescent, eye)
    catch = uv_sphere(f"Kirby{side}Catchlight", (x - 0.018, -0.555, 0.860),
                      0.012, segments=8, ring_count=6, mat=mat_catch)
    parent_local(catch, eye)
    catch2 = uv_sphere(f"Kirby{side}Catchlight2", (x + 0.020, -0.555, 0.808),
                       0.005, segments=8, ring_count=6, mat=mat_catch)
    parent_local(catch2, eye)
for name, x in (("KirbyLeftBlush", -0.285), ("KirbyRightBlush", 0.285)):
    cheek = uv_sphere(name, (x, -0.535, 0.750), 0.025,
                      scale=(1.0, 0.28, 0.65), segments=10, ring_count=6,
                      mat=mat_blush)
    parent_local(cheek, face_kirby)
spark_mouth = rounded_box("KirbyMouth", (0, -0.550, 0.716),
                          (0.052, 0.018, 0.016), mat_accent,
                          bevel_segments=4)
parent_local(spark_mouth, face_kirby)

# Rest: relaxed closed eyes and a tiny soft smile.
for side, x in (("Left", -0.18), ("Right", 0.18)):
    eye = smile_curve(f"Joy{side}Eye", (x, -0.550, 0.835), 0.070, 0.040,
                      0.014, mat_eye, parent=face_joy, points=14, inverted=True)
    for cap_index, cap_x in enumerate((x - 0.070, x + 0.070)):
        cap = uv_sphere(f"Joy{side}EyeCap{cap_index}",
                        (cap_x, -0.550, 0.835), 0.014,
                        segments=8, ring_count=6, mat=mat_eye)
        parent_local(cap, eye)
for name, x in (("JoyLeftBlush", -0.285), ("JoyRightBlush", 0.285)):
    cheek = uv_sphere(name, (x, -0.535, 0.750), 0.024,
                      scale=(1.0, 0.28, 0.65), segments=10, ring_count=6,
                      mat=mat_blush)
    parent_local(cheek, face_joy)
smile_curve("JoyMouth", (0, -0.554, 0.710), 0.030, 0.012, 0.007,
            mat_accent, parent=face_joy)


# ============================================================= SHARED ANATOMY
# Seed-shaped energy mark and restrained bezel.
core = uv_sphere("EnergyCore", (0, -0.458, 0.410), 0.070,
                 scale=(0.72, 0.32, 1.25), segments=16, ring_count=10,
                 mat=mat_core)
for vertex in core.data.vertices:
    t = max(0.0, vertex.co.z / 0.070)
    vertex.co.x *= 1.0 - 0.25 * t
bpy.ops.mesh.primitive_torus_add(
    major_radius=0.078,
    minor_radius=0.010,
    major_segments=28,
    minor_segments=8,
    location=(0, -0.452, 0.410),
    rotation=(math.pi / 2, 0, 0),
)
core_bezel = bpy.context.active_object
core_bezel.name = "CoreBezel"
core_bezel.scale = (0.72, 1.0, 1.25)
core_bezel.data.materials.append(mat_body)
smooth(core_bezel)
parent_local(core_bezel, body)

# Dayly Orbit: 318 degree arc with a 42 degree right-side gap.
orbit_start = math.radians(21)
orbit_end = math.radians(339)
halo = arc_curve("HaloCharm", (0, 0, 1.31), 0.155, orbit_start, orbit_end,
                 0.010, mat_accent, points=56, rotation=(0.18, 0, 0))
for name, angle, radius in (
    ("HaloBead", orbit_start, 0.030),
    ("HaloBead2", orbit_end, 0.014),
):
    local_x = 0.155 * math.cos(angle)
    local_y = 0.155 * math.sin(angle)
    world_y = local_y * math.cos(0.18)
    world_z = 1.31 + local_y * math.sin(0.18)
    bead = uv_sphere(name, (local_x, world_y, world_z), radius,
                     segments=12, ring_count=8, mat=mat_accent)
    parent_local(bead, halo)

# Tapered flippers, tucked close enough to read as part of the silhouette.
for name, x, yaw in (
    ("LeftFlipper", -0.54, 0.50),
    ("RightFlipper", 0.54, -0.50),
):
    flipper = uv_sphere(name, (x, -0.08, 0.44), 0.30,
                        scale=(0.23, 0.30, 0.52), rotation=(0, yaw, 0),
                        segments=16, ring_count=10, mat=mat_body)
    for vertex in flipper.data.vertices:
        if vertex.co.z < 0:
            taper = 1.0 - 0.42 * (-vertex.co.z / 0.30)
            vertex.co.x *= taper
            vertex.co.y *= taper

# Small planted feet with a quiet dark sole treatment.
for side, x, yaw in (("Left", -0.25, -0.12), ("Right", 0.25, 0.12)):
    foot = uv_sphere(f"{side}Foot", (x, -0.07, 0.140), 0.145,
                     scale=(0.96, 0.72, 0.42), rotation=(0, 0, yaw),
                     segments=16, ring_count=10, mat=mat_body)
    sole = uv_sphere(f"{side}Sole", (x, -0.078, 0.104), 0.120,
                     scale=(0.82, 0.62, 0.12), rotation=(0, 0, yaw),
                     segments=14, ring_count=8, mat=mat_platform)
    parent_local(sole, foot)

# Rear signature prevents the turntable from resolving to a blank charcoal mass.
bpy.ops.mesh.primitive_torus_add(
    major_radius=0.070,
    minor_radius=0.010,
    major_segments=28,
    minor_segments=8,
    location=(0, 0.49, 0.70),
    rotation=(math.pi / 2, 0, 0),
)
back_dial = bpy.context.active_object
back_dial.name = "BackDial"
back_dial.data.materials.append(mat_base)
smooth(back_dial)
parent_local(back_dial, body)
back_tick = rounded_box("BackDialTick", (0, 0.505, 0.750),
                        (0.018, 0.014, 0.055), mat_accent,
                        bevel_segments=4)
parent_local(back_tick, body)

# Two-tier pod; radii remain stable for equipment and room placement.
bpy.ops.mesh.primitive_cylinder_add(vertices=40, radius=0.80, depth=0.04,
                                    location=(0, 0, 0.02))
pod_base = bpy.context.active_object
pod_base.data.materials.append(mat_platform)
bpy.ops.mesh.primitive_cylinder_add(vertices=40, radius=0.62, depth=0.05,
                                    location=(0, 0, 0.065))
pod_top = bpy.context.active_object
pod_top.data.materials.append(mat_platform)
for pod in (pod_base, pod_top):
    bpy.context.view_layer.objects.active = pod
    bevel = pod.modifiers.new("SoftEdge", "BEVEL")
    bevel.width = 0.012
    bevel.segments = 2
    bevel.limit_method = "ANGLE"
    bpy.ops.object.modifier_apply(modifier="SoftEdge")
bpy.ops.object.select_all(action="DESELECT")
pod_base.select_set(True)
pod_top.select_set(True)
bpy.context.view_layer.objects.active = pod_base
bpy.ops.object.join()
platform = bpy.context.active_object
platform.name = "Platform"
platform.data.name = "Platform"
smooth(platform)

bpy.ops.mesh.primitive_torus_add(major_radius=0.80, minor_radius=0.008,
                                 major_segments=40, minor_segments=8,
                                 location=(0, 0, 0.052))
platform_ring = bpy.context.active_object
platform_ring.name = "PlatformRing"
platform_ring.data.materials.append(mat_accent)
smooth(platform_ring)
bpy.ops.mesh.primitive_torus_add(major_radius=0.62, minor_radius=0.005,
                                 major_segments=40, minor_segments=8,
                                 location=(0, 0, 0.091))
inner_ring = bpy.context.active_object
inner_ring.name = "PlatformInnerRing"
inner_ring.data.materials.append(mat_inner_glow)
smooth(inner_ring)


# ---------- object bookkeeping ----------
SHARED_OBJECTS = [
    "Body", "Body_Charcoal", "FacePanel", "VisorRim", "EnergyCore",
    "CoreBezel", "HaloCharm", "HaloBead", "HaloBead2", "LeftFlipper",
    "RightFlipper", "LeftFoot", "RightFoot", "LeftSole", "RightSole",
    "BackDial", "BackDialTick", "Platform", "PlatformRing", "PlatformInnerRing",
]
FACE_MEMBERS = {
    "Face_Classic": [
        "LeftEye", "RightEye", "LeftPupil", "RightPupil", "LeftCatchlight",
        "RightCatchlight", "LeftCatchlight2", "RightCatchlight2", "LeftBlush",
        "RightBlush", "VisorLip",
    ],
    "Face_Eve": [
        "EveLeftEye", "EveRightEye", "EveLeftPupil", "EveRightPupil",
        "EveLeftCatchlight", "EveRightCatchlight", "EveLeftCatchlight2",
        "EveRightCatchlight2", "EveLeftBlush", "EveRightBlush",
    ],
    "Face_Screen": [
        "ScreenPanel", "ScreenLeftEye", "ScreenRightEye", "ScreenMouth",
        "ScreenLeftBlush", "ScreenRightBlush",
    ],
    "Face_Kirby": [
        "KirbyLeftEye", "KirbyRightEye", "KirbyLeftPupil", "KirbyRightPupil",
        "KirbyLeftCatchlight", "KirbyRightCatchlight", "KirbyLeftCatchlight2",
        "KirbyRightCatchlight2", "KirbyLeftBlush", "KirbyRightBlush",
        "KirbyMouth",
    ],
    "Face_Joy": [
        "JoyLeftEye", "JoyRightEye", "JoyLeftEyeCap0", "JoyLeftEyeCap1",
        "JoyRightEyeCap0", "JoyRightEyeCap1", "JoyLeftBlush", "JoyRightBlush",
        "JoyMouth",
    ],
}
MODEL_OBJECTS = SHARED_OBJECTS + FACE_GROUPS
for members in FACE_MEMBERS.values():
    MODEL_OBJECTS.extend(members)


# ---------- lighting and camera ----------
def add_light(name, kind, location, energy, color=(1, 1, 1), size=None):
    data = bpy.data.lights.new(name, kind)
    data.energy = energy
    data.color = color
    if size and kind == "AREA":
        data.shape = "DISK"
        data.size = size
    obj = bpy.data.objects.new(name, data)
    obj.location = location
    link(obj)
    return obj


target = new_empty("AimTarget")
target.location = (0, 0, 0.68)
key = add_light("KeyLight", "AREA", (2.2, -3.0, 3.2), 340,
                (1.0, 0.92, 0.84), size=3.0)
fill = add_light("FillLight", "AREA", (-2.2, -2.2, 1.5), 90,
                 (0.78, 0.86, 1.0), size=2.6)
rear = add_light("RearFill", "AREA", (0.4, 2.8, 2.2), 170,
                 (0.94, 0.72, 0.55), size=2.2)
rim = add_light("RimLight", "POINT", (-2.0, 1.8, 1.8), 95, ORANGE)
lights = [key, fill, rear, rim]
for light in (key, fill, rear):
    constraint = light.constraints.new("TRACK_TO")
    constraint.target = target
    constraint.track_axis = "TRACK_NEGATIVE_Z"
    constraint.up_axis = "UP_Y"

camera_data = bpy.data.cameras.new("PreviewCamera")
camera_data.lens = 58
camera = bpy.data.objects.new("PreviewCamera", camera_data)
link(camera)
camera_constraint = camera.constraints.new("TRACK_TO")
camera_constraint.target = target
camera_constraint.track_axis = "TRACK_NEGATIVE_Z"
camera_constraint.up_axis = "UP_Y"
scene.camera = camera

world = bpy.data.worlds.get("World") or bpy.data.worlds.new("World")
scene.world = world
world.use_nodes = True
background = world.node_tree.nodes["Background"]
background.inputs[0].default_value = (0.004, 0.004, 0.006, 1.0)
background.inputs[1].default_value = 0.65
for engine in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"):
    try:
        scene.render.engine = engine
        break
    except TypeError:
        continue
scene.render.resolution_x = 900
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.film_transparent = False
scene.view_settings.look = "AgX - Medium High Contrast"


# ---------- visibility and review renders ----------
def descendants(obj):
    result = [obj]
    for child in obj.children:
        result.extend(descendants(child))
    return result


def show_only(active_group):
    for group_name in FACE_GROUPS:
        visible = group_name == active_group
        for obj in descendants(bpy.data.objects[group_name]):
            obj.hide_render = not visible


def show_all_faces():
    for group_name in FACE_GROUPS:
        for obj in descendants(bpy.data.objects[group_name]):
            obj.hide_render = False


def render_file(path, camera_location, active_group="Face_Classic",
                silhouette=False, unlit=False):
    show_only(active_group)
    camera.location = camera_location
    for light in lights:
        light.hide_render = silhouette or unlit
    background.inputs[0].default_value = (
        (0.72, 0.72, 0.75, 1.0) if silhouette else (0.004, 0.004, 0.006, 1.0)
    )
    background.inputs[1].default_value = 0.8 if silhouette else (2.0 if unlit else 0.65)
    scene.view_layers[0].material_override = mat_silhouette if silhouette else None
    unlit_values = []
    if unlit:
        for material in (
            mat_body, mat_base, mat_eye, mat_pupil, mat_catch, mat_blush,
            mat_accent, mat_core, mat_platform, mat_inner_glow,
        ):
            bsdf = material.node_tree.nodes["Principled BSDF"]
            emission_color = bsdf.inputs["Emission Color"]
            emission_strength = bsdf.inputs["Emission Strength"]
            unlit_values.append(
                (emission_color, emission_color.default_value[:],
                 emission_strength, emission_strength.default_value)
            )
            emission_color.default_value = bsdf.inputs["Base Color"].default_value[:]
            emission_strength.default_value = 1.0
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)
    for color_input, color, strength_input, strength in unlit_values:
        color_input.default_value = color
        strength_input.default_value = strength
    scene.view_layers[0].material_override = None
    print(f"RENDERED {path.name}")


render_file(OUT_DIR / "dayly-companion-preview.png", (0, -3.35, 1.45))
for filename, position in (
    ("front.png", (0, -3.35, 1.45)),
    ("three-quarter.png", (2.35, -2.55, 1.48)),
    ("side.png", (3.40, 0, 1.42)),
    ("rear.png", (0, 3.35, 1.45)),
    ("silhouette.png", (2.35, -2.55, 1.48)),
    ("unlit.png", (0, -3.35, 1.45)),
):
    render_file(REVIEW_DIR / filename, position,
                silhouette=filename == "silhouette.png",
                unlit=filename == "unlit.png")

for style, group_name in (
    ("classic", "Face_Classic"),
    ("eve", "Face_Eve"),
    ("screen", "Face_Screen"),
    ("kirby", "Face_Kirby"),
    ("joy", "Face_Joy"),
):
    render_file(FACE_VARIANT_DIR / f"merged-check-{style}.png",
                (0, -3.35, 1.45), active_group=group_name)
show_all_faces()


# ---------- save and export ----------
bpy.ops.wm.save_as_mainfile(filepath=str(OUT_DIR / "dayly-companion.blend"))
print("BLEND SAVED")


def select_model(excluded=()):
    excluded = set(excluded)
    bpy.ops.object.select_all(action="DESELECT")
    for name in MODEL_OBJECTS:
        obj = bpy.data.objects.get(name)
        if obj and name not in excluded:
            obj.select_set(True)


def export_glb(path, excluded=()):
    select_model(excluded)
    bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format="GLB",
        use_selection=True,
        export_tangents=False,
        export_animations=False,
    )
    print(f"EXPORTED {path.name}")


hero_path = OUT_DIR / "dayly-companion.glb"
lite_path = OUT_DIR / "dayly-companion-lite.glb"
export_glb(hero_path)

# Lite derives from the same source after hero export: strip details that are
# sub-pixel in the room and collapse authored mesh density without renaming the rig.
LITE_EXCLUDED = {
    name for name in MODEL_OBJECTS
    if "Blush" in name or "Catchlight2" in name
}


def local_mesh_bounds(obj):
    coordinates = [vertex.co for vertex in obj.data.vertices]
    return (
        tuple(min(coordinate[axis] for coordinate in coordinates) for axis in range(3)),
        tuple(max(coordinate[axis] for coordinate in coordinates) for axis in range(3)),
    )


def restore_local_mesh_bounds(obj, original_bounds):
    current_min, current_max = local_mesh_bounds(obj)
    original_min, original_max = original_bounds
    current_center = tuple(
        (current_min[axis] + current_max[axis]) * 0.5 for axis in range(3)
    )
    original_center = tuple(
        (original_min[axis] + original_max[axis]) * 0.5 for axis in range(3)
    )
    scale = tuple(
        (original_max[axis] - original_min[axis])
        / (current_max[axis] - current_min[axis])
        if current_max[axis] != current_min[axis]
        else 1.0
        for axis in range(3)
    )
    for vertex in obj.data.vertices:
        for axis in range(3):
            vertex.co[axis] = (
                (vertex.co[axis] - current_center[axis]) * scale[axis]
                + original_center[axis]
            )


for name in MODEL_OBJECTS:
    obj = bpy.data.objects.get(name)
    if not obj or obj.type != "MESH" or name in LITE_EXCLUDED:
        continue
    if len(obj.data.polygons) < 12:
        continue
    original_bounds = local_mesh_bounds(obj)
    bpy.context.view_layer.objects.active = obj
    modifier = obj.modifiers.new("LiteReduction", "DECIMATE")
    modifier.ratio = 0.58
    modifier.use_collapse_triangulate = True
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    restore_local_mesh_bounds(obj, original_bounds)
export_glb(lite_path, excluded=LITE_EXCLUDED)


# ---------- GLB inspection and manifest ----------
def glb_json(path):
    data = path.read_bytes()
    if data[:4] != b"glTF" or struct.unpack_from("<I", data, 4)[0] != 2:
        raise RuntimeError(f"Invalid GLB header: {path}")
    json_length, chunk_type = struct.unpack_from("<II", data, 12)
    if chunk_type != 0x4E4F534A:
        raise RuntimeError(f"Missing GLB JSON chunk: {path}")
    return json.loads(data[20:20 + json_length].decode("utf-8"))


def node_descendants(document, root_index):
    found = set()

    def visit(index):
        if index in found:
            return
        found.add(index)
        for child in document.get("nodes", [])[index].get("children", []):
            visit(child)

    visit(root_index)
    return found


def triangle_count(document, node_indexes):
    count = 0
    accessors = document.get("accessors", [])
    meshes = document.get("meshes", [])
    nodes = document.get("nodes", [])
    for node_index in node_indexes:
        mesh_index = nodes[node_index].get("mesh")
        if mesh_index is None:
            continue
        for primitive in meshes[mesh_index].get("primitives", []):
            if primitive.get("mode", 4) != 4:
                raise RuntimeError("Only triangle primitives are allowed")
            accessor_index = primitive.get("indices")
            if accessor_index is None:
                accessor_index = primitive.get("attributes", {}).get("POSITION")
            if accessor_index is not None:
                count += accessors[accessor_index].get("count", 0) // 3
    return count


def inspect_asset(path):
    document = glb_json(path)
    nodes = document.get("nodes", [])
    names = [node.get("name") for node in nodes]
    face_descendants = set()
    per_face_nodes = {}
    for group_name in FACE_GROUPS:
        try:
            root_index = names.index(group_name)
        except ValueError as error:
            raise RuntimeError(f"{path.name} is missing {group_name}") from error
        group_nodes = node_descendants(document, root_index)
        per_face_nodes[group_name] = group_nodes
        face_descendants.update(group_nodes)
    shared_nodes = set(range(len(nodes))) - face_descendants
    shared_triangles = triangle_count(document, shared_nodes)
    active_triangles = {
        group_name: shared_triangles + triangle_count(document, group_nodes)
        for group_name, group_nodes in per_face_nodes.items()
    }
    primitive_count = 0
    index_count = 0
    accessors = document.get("accessors", [])
    for mesh in document.get("meshes", []):
        for primitive in mesh.get("primitives", []):
            primitive_count += 1
            accessor_index = primitive.get("indices")
            if accessor_index is not None:
                index_count += accessors[accessor_index].get("count", 0)
    return {
        "activeTriangles": active_triangles,
        "animations": len(document.get("animations", [])),
        "bytes": path.stat().st_size,
        "indexCount": index_count,
        "primitiveCount": primitive_count,
        "requiredNames": [name for name in REQUIRED_NAMES if name in names],
        "skins": len(document.get("skins", [])),
        "textures": len(document.get("textures", [])),
    }


def validate_asset(label, facts, budget):
    missing = sorted(set(REQUIRED_NAMES) - set(facts["requiredNames"]))
    if missing:
        raise RuntimeError(f"{label} missing required nodes: {', '.join(missing)}")
    if facts["bytes"] > budget["bytes"]:
        raise RuntimeError(f"{label} exceeds file budget: {facts['bytes']}")
    max_triangles = max(facts["activeTriangles"].values())
    if max_triangles > budget["triangles"]:
        raise RuntimeError(f"{label} exceeds triangle budget: {max_triangles}")
    prohibited = facts["textures"] + facts["skins"] + facts["animations"]
    if prohibited:
        raise RuntimeError(f"{label} contains {prohibited} prohibited features")


manifest = {
    "hero": inspect_asset(hero_path),
    "lite": inspect_asset(lite_path),
}
validate_asset("hero", manifest["hero"], HERO_BUDGET)
validate_asset("lite", manifest["lite"], LITE_BUDGET)
(OUT_DIR / "dayly-companion-manifest.json").write_text(
    json.dumps(manifest, indent=2, sort_keys=True) + "\n",
    encoding="utf-8",
)
print(json.dumps(manifest, indent=2, sort_keys=True))
