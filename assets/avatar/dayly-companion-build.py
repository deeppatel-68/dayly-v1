import bmesh
import bpy

OUT_DIR = "/Users/deeppatel/dayly-v1/assets/avatar"

# ---------- clean scene ----------
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete()
for block_list in (bpy.data.meshes, bpy.data.materials, bpy.data.lights, bpy.data.cameras):
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


ORANGE = (1.0, 0.15, 0.035)  # ~#ff6b35 in linear
mat_body = make_mat("Body_Charcoal", (0.052, 0.052, 0.06), 0.5)
mat_base = make_mat("Base_Black", (0.012, 0.012, 0.014), 0.12, metallic=0.15)
# Classic eye white (also reused by Kirby -- identical values).
mat_eye = make_mat("Eye_White_Emission", (1.0, 0.89, 0.72), 0.42,
                   emission=(1.0, 0.78, 0.52), emission_strength=2.0)
# Eve: glossier, brighter hero eye.
mat_eye_eve = make_mat("Eye_White_Emission_Eve", (1.0, 0.86, 0.66), 0.14,
                       emission=(1.0, 0.78, 0.50), emission_strength=3.3)
# Joy: warm emissive stroke for the closed happy arcs.
mat_eye_joy = make_mat("Eye_White_Emission_Joy", (1.0, 0.86, 0.66), 0.42,
                       emission=(1.0, 0.72, 0.44), emission_strength=2.8)
mat_pupil = make_mat("Pupil_Dark", (0.015, 0.015, 0.02), 0.25)
mat_catch = make_mat("Catchlight_White", (1.0, 1.0, 1.0), 0.3,
                     emission=(1.0, 1.0, 1.0), emission_strength=2.2)
mat_blush = make_mat("Blush_Peach", (0.78, 0.28, 0.20), 0.7,
                     emission=(0.80, 0.32, 0.22), emission_strength=0.12)
mat_accent = make_mat("Accent_Orange_Emission", ORANGE, 0.4,
                      emission=ORANGE, emission_strength=4.5)
# Chest core runs hotter than the shared accent so the glow hierarchy reads
# core > halo > platform ring > inner ring. Runtime binds this by mesh
# (materialOf(core)), not by name, so a dedicated material is safe.
mat_core = make_mat("Core_Orange_Emission", ORANGE, 0.4,
                    emission=ORANGE, emission_strength=6.0)
mat_platform = make_mat("Platform_Dark", (0.02, 0.02, 0.022), 0.75)
# Variant B: OLED-style screen face.
mat_screen = make_mat("Screen_Glossy_Black", (0.004, 0.004, 0.006), 0.06,
                      metallic=0.2)
LED_WARM = (1.0, 0.32, 0.09)  # coral/amber
mat_led = make_mat("LED_Coral_Emission", LED_WARM, 0.35,
                   emission=LED_WARM, emission_strength=1.5)
# Variant C: Kirby open mouth + tongue.
mat_mouth = make_mat("Mouth_Dark", (0.03, 0.015, 0.02), 0.45)
mat_tongue = make_mat("Tongue_Pink", (0.92, 0.34, 0.42), 0.55,
                      emission=(0.85, 0.28, 0.36), emission_strength=0.3)


def smooth(obj):
    for p in obj.data.polygons:
        p.use_smooth = True


def link(obj):
    bpy.context.collection.objects.link(obj)


def parent_to(child, parent):
    child.parent = parent
    child.matrix_parent_inverse = parent.matrix_world.inverted()


def new_empty(name):
    """Identity-transform group empty at the origin. Children keep their world
    transform when the runtime later reparents named pet nodes out of the group,
    and the exported empty carries no scale to bake into its children."""
    empty = bpy.data.objects.new(name, None)
    empty.empty_display_size = 0.05
    link(empty)
    return empty


def uv_sphere(name, location, radius, scale=(1, 1, 1), rotation=(0, 0, 0),
              segments=20, ring_count=12, mat=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=ring_count,
                                         radius=radius, location=location,
                                         rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    if mat:
        obj.data.materials.append(mat)
    smooth(obj)
    return obj


# ================================================================= SHARED BODY
# Everything below the face groups is shared anatomy, built ONCE.

# ---------- Body: squat friendly mass, two-tone via material slots ----------
bm = bmesh.new()
bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=18, radius=0.55)
# Subtle pear taper: a touch wider low, narrower high — keeps the plush read.
for v in bm.verts:
    t = v.co.z / 0.55  # -1 (base) .. 1 (crown)
    f = 1.0 - 0.055 * t
    v.co.x *= f
    v.co.y *= f
mesh = bpy.data.meshes.new("Body")
bm.to_mesh(mesh)
bm.free()
body = bpy.data.objects.new("Body", mesh)
link(body)
body.scale = (1.05, 0.95, 0.98)
body.rotation_euler = (0.052, 0, 0)  # ~3 deg forward chest lean
body.location = (0, 0, 0.63)
mesh.materials.append(mat_body)
mesh.materials.append(mat_base)
for poly in mesh.polygons:
    if poly.center.z < -0.28:  # local space, pre-scale; low foot-shadow zone,
        # not a garment line — the dark cap should visually merge with the pod
        poly.material_index = 1
smooth(body)

# ---------- FacePanel: wide glossy visor recess, shared by every face -------
# Kept as the classic dark visor. The Screen face lays its own glossy OLED panel
# on top; every other face reads its features against this recess.
bpy.ops.mesh.primitive_uv_sphere_add(segments=64, ring_count=44, radius=0.42,
                                     location=(0, -0.34, 0.81))
face = bpy.context.active_object
face.name = "FacePanel"
face.scale = (1.12, 0.42, 0.62)
face.data.materials.append(mat_base)
smooth(face)

# VisorRim: charcoal lip around the visor so the panel reads as a moulded
# inset seam instead of a raw sphere intersection. Child of FacePanel so the
# runtime petGroup reparent carries it.
bpy.ops.mesh.primitive_uv_sphere_add(segments=64, ring_count=44, radius=0.42,
                                     location=(0, -0.320, 0.81))
visor_rim = bpy.context.active_object
visor_rim.name = "VisorRim"
visor_rim.scale = (1.17, 0.42, 0.66)
visor_rim.data.materials.append(mat_body)
smooth(visor_rim)
parent_to(visor_rim, face)

# ================================================================ FACE GROUPS
# Five toggleable groups. Runtime shows exactly one (Face_<PascalCase(style)>)
# by setting group.visible. Classic keeps the canonical LeftEye/RightEye/
# VisorLip names that the rig looks up; every other style is prefixed so
# getObjectByName never grabs a hidden variant's mesh.
face_classic = new_empty("Face_Classic")
face_eve = new_empty("Face_Eve")
face_screen = new_empty("Face_Screen")
face_kirby = new_empty("Face_Kirby")
face_joy = new_empty("Face_Joy")

# --------------------------------------------------------------- FACE: CLASSIC
# Warm compact ovals + big irises + shallow smile (the original companion face).
classic_eyes = {}
for name, x, roll in (("LeftEye", -0.165, -0.07), ("RightEye", 0.165, 0.07)):
    eye = uv_sphere(name, (x, -0.47, 0.83), 0.105, scale=(1.18, 0.5, 1.15),
                    rotation=(0, roll, 0), mat=mat_eye)
    parent_to(eye, face_classic)
    classic_eyes[name] = eye

for name, x, side in (("LeftPupil", -0.165, "LeftEye"),
                      ("RightPupil", 0.165, "RightEye")):
    pupil = uv_sphere(name, (x, -0.508, 0.818), 0.058, scale=(1.0, 0.35, 1.0),
                      segments=16, ring_count=10, mat=mat_pupil)
    parent_to(pupil, classic_eyes[side])

for name, x, r, side in (("LeftCatchlight", -0.190, 0.017, "LeftEye"),
                         ("RightCatchlight", 0.140, 0.014, "RightEye")):
    catch = uv_sphere(name, (x, -0.532, 0.852), r, segments=12, ring_count=8,
                      mat=mat_catch)
    parent_to(catch, classic_eyes[side])

# Secondary low catchlights: tiny wet-eye sparkle opposite the main highlight.
for name, x, side in (("LeftCatchlight2", -0.136, "LeftEye"),
                      ("RightCatchlight2", 0.194, "RightEye")):
    catch = uv_sphere(name, (x, -0.534, 0.800), 0.008, segments=10, ring_count=6,
                      mat=mat_catch)
    parent_to(catch, classic_eyes[side])

for name, x in (("LeftBlush", -0.30), ("RightBlush", 0.30)):
    blush = uv_sphere(name, (x, -0.487, 0.755), 0.037, scale=(1.0, 0.3, 0.7),
                      segments=14, ring_count=8, mat=mat_blush)
    parent_to(blush, face_classic)

# Classic VisorLip: tiny shallow smile curve (canonical name for runtime tint).
lip_curve = bpy.data.curves.new("VisorLip", type="CURVE")
lip_curve.dimensions = "3D"
lip_curve.resolution_u = 3
lip_curve.bevel_depth = 0.011
lip_curve.bevel_resolution = 4
lip_spline = lip_curve.splines.new("POLY")
lip_points = 16
lip_spline.points.add(lip_points - 1)
lip_half_width = 0.058
lip_depth = 0.022
for index, point in enumerate(lip_spline.points):
    progress = index / (lip_points - 1)
    x = -lip_half_width + progress * (lip_half_width * 2.0)
    z = 0.706 - (1.0 - ((progress - 0.5) * 2.0) ** 2) * lip_depth
    point.co = (x, -0.532, z, 1.0)
visor_lip = bpy.data.objects.new("VisorLip", lip_curve)
link(visor_lip)
visor_lip.data.materials.append(mat_accent)
parent_to(visor_lip, face_classic)

# ------------------------------------------------------------------- FACE: EVE
# Hero WALL-E "Eve" eyes: tall glossy vertical ovals, wide-set, low, no mouth.
eve_eyes = {}
for name, x, roll in (("EveLeftEye", -0.205, -0.12), ("EveRightEye", 0.205, 0.12)):
    eye = uv_sphere(name, (x, -0.46, 0.775), 0.125, scale=(0.86, 0.5, 1.42),
                    rotation=(0, roll, 0), segments=24, ring_count=16,
                    mat=mat_eye_eve)
    parent_to(eye, face_eve)
    eve_eyes[name] = eye

for name, x, side in (("EveLeftPupil", -0.205, "EveLeftEye"),
                      ("EveRightPupil", 0.205, "EveRightEye")):
    pupil = uv_sphere(name, (x, -0.505, 0.758), 0.064, scale=(0.95, 0.35, 1.28),
                      segments=18, ring_count=12, mat=mat_pupil)
    parent_to(pupil, eve_eyes[side])

for name, x, r, side in (("EveLeftCatchlight", -0.235, 0.05, "EveLeftEye"),
                         ("EveRightCatchlight", 0.175, 0.042, "EveRightEye")):
    catch = uv_sphere(name, (x, -0.545, 0.83), r, segments=16, ring_count=10,
                      mat=mat_catch)
    parent_to(catch, eve_eyes[side])

for name, x, side in (("EveLeftCatchlight2", -0.162, "EveLeftEye"),
                      ("EveRightCatchlight2", 0.248, "EveRightEye")):
    catch = uv_sphere(name, (x, -0.542, 0.715), 0.018, segments=12, ring_count=8,
                      mat=mat_catch)
    parent_to(catch, eve_eyes[side])

for name, x in (("EveLeftBlush", -0.30), ("EveRightBlush", 0.30)):
    blush = uv_sphere(name, (x, -0.487, 0.755), 0.045, scale=(1.0, 0.3, 0.7),
                      segments=14, ring_count=8, mat=mat_blush)
    parent_to(blush, face_eve)

# ---------------------------------------------------------------- FACE: SCREEN
# OLED screen face: a glossy black panel with flat emissive LED squircle eyes +
# a mouth bar. LED tiles are parented to the identity Face_Screen empty (NOT to
# the non-uniformly scaled panel), so no parent scale bakes in and flattens them.
bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=18, radius=0.44,
                                     location=(0, -0.315, 0.81))
screen_panel = bpy.context.active_object
screen_panel.name = "ScreenPanel"
screen_panel.scale = (1.14, 0.45, 0.66)
screen_panel.data.materials.append(mat_screen)
smooth(screen_panel)
parent_to(screen_panel, face_screen)


def make_led_tile(name, location, scale, roll=0.0, mat=mat_led):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.bevel(bm, geom=list(bm.verts) + list(bm.edges) + list(bm.faces),
                    offset=0.34, segments=8, affect="EDGES", profile=0.6)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    link(obj)
    obj.scale = scale
    obj.location = location
    obj.rotation_euler = (0, roll, 0)
    mesh.materials.append(mat)
    smooth(obj)
    return obj


EYE_Y = -0.55
tile_l = make_led_tile("ScreenLeftEye", (-0.15, EYE_Y, 0.825), (0.13, 0.05, 0.185),
                       roll=-0.05)
tile_r = make_led_tile("ScreenRightEye", (0.15, EYE_Y, 0.825), (0.13, 0.05, 0.185),
                       roll=0.05)
tile_m = make_led_tile("ScreenMouth", (0.0, EYE_Y, 0.705), (0.065, 0.04, 0.026))
for tile in (tile_l, tile_r, tile_m):
    parent_to(tile, face_screen)

for name, x in (("ScreenLeftBlush", -0.345), ("ScreenRightBlush", 0.345)):
    blush = uv_sphere(name, (x, -0.44, 0.76), 0.05, scale=(1.0, 0.35, 0.75),
                      segments=14, ring_count=8, mat=mat_blush)
    parent_to(blush, face_screen)

# ----------------------------------------------------------------- FACE: KIRBY
# Tall ovals + double sparkle catchlights + open "hii!" mouth with a tongue.
kirby_eyes = {}
for name, x, roll in (("KirbyLeftEye", -0.165, -0.07),
                      ("KirbyRightEye", 0.165, 0.07)):
    eye = uv_sphere(name, (x, -0.47, 0.83), 0.105, scale=(1.08, 0.5, 1.5),
                    rotation=(0, roll, 0), mat=mat_eye)
    parent_to(eye, face_kirby)
    kirby_eyes[name] = eye

for name, x, side in (("KirbyLeftPupil", -0.165, "KirbyLeftEye"),
                      ("KirbyRightPupil", 0.165, "KirbyRightEye")):
    pupil = uv_sphere(name, (x, -0.508, 0.822), 0.072, scale=(1.0, 0.35, 1.35),
                      segments=16, ring_count=10, mat=mat_pupil)
    parent_to(pupil, kirby_eyes[side])

for name, x, z, r, side in (
        ("KirbyLeftCatchlight", -0.198, 0.868, 0.036, "KirbyLeftEye"),
        ("KirbyRightCatchlight", 0.132, 0.868, 0.036, "KirbyRightEye"),
        ("KirbyLeftCatchlight2", -0.140, 0.788, 0.018, "KirbyLeftEye"),
        ("KirbyRightCatchlight2", 0.190, 0.788, 0.018, "KirbyRightEye")):
    catch = uv_sphere(name, (x, -0.536, z), r, segments=12, ring_count=8,
                      mat=mat_catch)
    parent_to(catch, kirby_eyes[side])

for name, x in (("KirbyLeftBlush", -0.30), ("KirbyRightBlush", 0.30)):
    blush = uv_sphere(name, (x, -0.487, 0.748), 0.060, scale=(1.05, 0.3, 0.78),
                      segments=14, ring_count=8, mat=mat_blush)
    parent_to(blush, face_kirby)

kirby_mouth = uv_sphere("KirbyMouth", (0, -0.532, 0.734), 0.041,
                        scale=(1.05, 0.42, 0.86), segments=18, ring_count=12,
                        mat=mat_mouth)
parent_to(kirby_mouth, face_kirby)
kirby_tongue = uv_sphere("KirbyTongue", (0, -0.556, 0.721), 0.026,
                         scale=(0.95, 0.5, 0.55), segments=14, ring_count=8,
                         mat=mat_tongue)
parent_to(kirby_tongue, kirby_mouth)

# ------------------------------------------------------------------- FACE: JOY
# Closed happy caret arcs (^ ^) with soft end caps + a micro "u" smile.
EYE_CX = 0.205
EYE_HALF_W = 0.090
JOY_EYE_Y = -0.512
EYE_Z_END = 0.790
EYE_ARCH = 0.057
EYE_ARC_POINTS = 18
for name, sign in (("JoyLeftEye", -1.0), ("JoyRightEye", 1.0)):
    arc = bpy.data.curves.new(name, type="CURVE")
    arc.dimensions = "3D"
    arc.resolution_u = 6
    arc.bevel_depth = 0.019
    arc.bevel_resolution = 5
    spline = arc.splines.new("POLY")
    spline.points.add(EYE_ARC_POINTS - 1)
    for i, pt in enumerate(spline.points):
        t = i / (EYE_ARC_POINTS - 1)
        x = sign * EYE_CX + (-EYE_HALF_W + t * EYE_HALF_W * 2.0)
        z = EYE_Z_END + (1.0 - ((t - 0.5) * 2.0) ** 2) * EYE_ARCH
        pt.co = (x, JOY_EYE_Y, z, 1.0)
    eye = bpy.data.objects.new(name, arc)
    link(eye)
    eye.data.materials.append(mat_eye_joy)
    parent_to(eye, face_joy)

    for cap_i, tip in enumerate((0.0, 1.0)):
        x = sign * EYE_CX + (-EYE_HALF_W + tip * EYE_HALF_W * 2.0)
        z = EYE_Z_END + (1.0 - ((tip - 0.5) * 2.0) ** 2) * EYE_ARCH
        cap = uv_sphere(f"{name}Cap{cap_i}", (x, JOY_EYE_Y, z), 0.019,
                        segments=12, ring_count=8, mat=mat_eye_joy)
        parent_to(cap, eye)

for name, x in (("JoyLeftBlush", -0.30), ("JoyRightBlush", 0.30)):
    blush = uv_sphere(name, (x, -0.487, 0.755), 0.045, scale=(1.0, 0.3, 0.7),
                      segments=14, ring_count=8, mat=mat_blush)
    parent_to(blush, face_joy)

joy_lip = bpy.data.curves.new("JoyMouth", type="CURVE")
joy_lip.dimensions = "3D"
joy_lip.resolution_u = 3
joy_lip.bevel_depth = 0.010
joy_lip.bevel_resolution = 4
joy_spline = joy_lip.splines.new("POLY")
joy_points = 14
joy_spline.points.add(joy_points - 1)
joy_half_width = 0.030
joy_depth = 0.016
for index, point in enumerate(joy_spline.points):
    progress = index / (joy_points - 1)
    x = -joy_half_width + progress * (joy_half_width * 2.0)
    z = 0.688 - (1.0 - ((progress - 0.5) * 2.0) ** 2) * joy_depth
    point.co = (x, -0.535, z, 1.0)
joy_mouth = bpy.data.objects.new("JoyMouth", joy_lip)
link(joy_mouth)
joy_mouth.data.materials.append(mat_accent)
parent_to(joy_mouth, face_joy)

# ============================================================= SHARED ANATOMY
# ---------- EnergyCore: framed heart on the chest ----------
core = uv_sphere("EnergyCore", (0, -0.43, 0.36), 0.068, mat=mat_core)

# CoreBezel: recessed charcoal ring around the core so it reads as a designed,
# moulded element rather than a loose dot. Child of Body so the runtime
# petGroup reparent carries it with the pet. Torus axis aligned to the local
# chest surface normal (approx (0, -0.85, -0.53) -> rot.x ~= 2.13 rad).
bpy.ops.mesh.primitive_torus_add(major_radius=0.088, minor_radius=0.020,
                                 major_segments=36, minor_segments=12,
                                 location=(0, -0.422, 0.365),
                                 rotation=(2.13, 0, 0))
core_bezel = bpy.context.active_object
core_bezel.name = "CoreBezel"
core_bezel.data.materials.append(mat_body)
smooth(core_bezel)
parent_to(core_bezel, body)

# ---------- HaloCharm: larger, thinner, tilted collectible ring ----------
bpy.ops.mesh.primitive_torus_add(major_radius=0.14, minor_radius=0.011,
                                 major_segments=36, minor_segments=12,
                                 location=(0, 0, 1.34), rotation=(0.18, 0, 0))
halo = bpy.context.active_object
halo.name = "HaloCharm"
halo.data.materials.append(mat_accent)
smooth(halo)

halo_bead = uv_sphere("HaloBead", (0.14, -0.015, 1.36), 0.027, segments=16,
                      ring_count=8, mat=mat_accent)
halo_bead.parent = halo
halo_bead.matrix_parent_inverse = halo.matrix_world.inverted()

halo_bead2 = uv_sphere("HaloBead2", (-0.14, 0.015, 1.325), 0.017, segments=14,
                       ring_count=8, mat=mat_accent)
halo_bead2.parent = halo
halo_bead2.matrix_parent_inverse = halo.matrix_world.inverted()

# ---------- Flippers: tapered little arms, relaxed toward the belly ----------
for name, x, rot in (("LeftFlipper", -0.58, 0.34), ("RightFlipper", 0.58, -0.34)):
    flipper = uv_sphere(name, (x, -0.15, 0.47), 0.3, scale=(0.26, 0.40, 0.62),
                        rotation=(0.50, rot, 0), mat=mat_body)
    # Taper the tip (local -z) so the arm reads as a soft paddle, not an egg.
    for v in flipper.data.vertices:
        if v.co.z < 0:
            f = 1.0 - 0.42 * (-v.co.z / 0.3)
            v.co.x *= f
            v.co.y *= f

# ---------- Feet: plumper forward nubs, splayed slightly outward ----------
for name, x, roll, yaw in (("LeftFoot", -0.27, -0.1, -0.22),
                           ("RightFoot", 0.27, 0.1, 0.22)):
    uv_sphere(name, (x, -0.18, 0.165), 0.19, scale=(1.05, 1.35, 0.62),
              rotation=(0, roll, yaw), segments=18, ring_count=10, mat=mat_body)

# ---------- Platform: two-tier pod (joined into one named mesh) ----------
bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=0.80, depth=0.04,
                                    location=(0, 0, 0.02))
pod_base = bpy.context.active_object
pod_base.data.materials.append(mat_platform)

bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=0.62, depth=0.05,
                                    location=(0, 0, 0.065))
pod_top = bpy.context.active_object
pod_top.data.materials.append(mat_platform)

# Soft chamfer on both tier edges so the pod reads moulded, not machined.
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

# ---------- PlatformRing: light channel between the pod tiers ----------
bpy.ops.mesh.primitive_torus_add(major_radius=0.70, minor_radius=0.012,
                                 major_segments=48, minor_segments=10,
                                 location=(0, 0, 0.052))
ring = bpy.context.active_object
ring.name = "PlatformRing"
ring.data.materials.append(mat_accent)
smooth(ring)

# ---------- PlatformInnerRing: faint glow ring inset on the top tier ----------
mat_inner_glow = make_mat("Platform_Inner_Glow", ORANGE, 0.5,
                          emission=ORANGE, emission_strength=0.7)
bpy.ops.mesh.primitive_torus_add(major_radius=0.50, minor_radius=0.007,
                                 major_segments=48, minor_segments=8,
                                 location=(0, 0, 0.091))
inner_ring = bpy.context.active_object
inner_ring.name = "PlatformInnerRing"
inner_ring.data.materials.append(mat_inner_glow)
smooth(inner_ring)

# ---------- object bookkeeping ----------
FACE_GROUPS = ["Face_Classic", "Face_Eve", "Face_Screen", "Face_Kirby", "Face_Joy"]

SHARED_OBJECTS = ["Body", "FacePanel", "VisorRim", "EnergyCore", "CoreBezel",
                  "HaloCharm", "HaloBead", "HaloBead2", "LeftFlipper",
                  "RightFlipper", "LeftFoot", "RightFoot", "Platform",
                  "PlatformRing", "PlatformInnerRing"]

FACE_MEMBERS = {
    "Face_Classic": ["LeftEye", "RightEye", "LeftPupil", "RightPupil",
                     "LeftCatchlight", "RightCatchlight", "LeftCatchlight2",
                     "RightCatchlight2", "LeftBlush", "RightBlush", "VisorLip"],
    "Face_Eve": ["EveLeftEye", "EveRightEye", "EveLeftPupil", "EveRightPupil",
                 "EveLeftCatchlight", "EveRightCatchlight",
                 "EveLeftCatchlight2", "EveRightCatchlight2", "EveLeftBlush",
                 "EveRightBlush"],
    "Face_Screen": ["ScreenPanel", "ScreenLeftEye", "ScreenRightEye",
                    "ScreenMouth", "ScreenLeftBlush", "ScreenRightBlush"],
    "Face_Kirby": ["KirbyLeftEye", "KirbyRightEye", "KirbyLeftPupil",
                   "KirbyRightPupil", "KirbyLeftCatchlight", "KirbyRightCatchlight",
                   "KirbyLeftCatchlight2", "KirbyRightCatchlight2",
                   "KirbyLeftBlush", "KirbyRightBlush", "KirbyMouth",
                   "KirbyTongue"],
    "Face_Joy": ["JoyLeftEye", "JoyRightEye", "JoyLeftEyeCap0", "JoyLeftEyeCap1",
                 "JoyRightEyeCap0", "JoyRightEyeCap1", "JoyLeftBlush",
                 "JoyRightBlush", "JoyMouth"],
}

MODEL_OBJECTS = list(SHARED_OBJECTS)
MODEL_OBJECTS += FACE_GROUPS
for members in FACE_MEMBERS.values():
    MODEL_OBJECTS += members

# ---------- normalize: apply scale/rotation, keep positions ----------
bpy.ops.object.select_all(action="DESELECT")
for name in MODEL_OBJECTS:
    bpy.data.objects[name].select_set(True)
bpy.context.view_layer.objects.active = bpy.data.objects["Body"]
bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)

# ---------- lighting ----------
def add_light(name, kind, loc, energy, color=(1, 1, 1), size=None):
    data = bpy.data.lights.new(name, kind)
    data.energy = energy
    data.color = color
    if size and kind == "AREA":
        data.size = size
    obj = bpy.data.objects.new(name, data)
    obj.location = loc
    link(obj)
    return obj


key = add_light("KeyLight", "AREA", (2.0, -3.0, 3.2), 280, (1.0, 0.96, 0.9), size=3.0)
fill = add_light("FillLight", "AREA", (-1.8, -2.4, 1.2), 60, (0.9, 0.93, 1.0), size=2.5)
rim = add_light("RimLight", "POINT", (-2.2, 2.0, 1.8), 120, ORANGE)

target = bpy.data.objects.new("AimTarget", None)
target.location = (0, 0, 0.66)
link(target)
for light_obj in (key, fill):
    con = light_obj.constraints.new("TRACK_TO")
    con.target = target
    con.track_axis = "TRACK_NEGATIVE_Z"
    con.up_axis = "UP_Y"

# ---------- camera: slightly elevated front ----------
cam_data = bpy.data.cameras.new("PreviewCamera")
cam_data.lens = 55
cam = bpy.data.objects.new("PreviewCamera", cam_data)
cam.location = (0, -3.4, 1.5)
link(cam)
con = cam.constraints.new("TRACK_TO")
con.target = target
con.track_axis = "TRACK_NEGATIVE_Z"
con.up_axis = "UP_Y"
scene.camera = cam

# ---------- world + render settings ----------
world = bpy.data.worlds.get("World") or bpy.data.worlds.new("World")
scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes["Background"]
bg.inputs[0].default_value = (0.004, 0.004, 0.006, 1.0)
bg.inputs[1].default_value = 1.0

for engine in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"):
    try:
        scene.render.engine = engine
        break
    except TypeError:
        continue
scene.render.resolution_x = 900
scene.render.resolution_y = 900


# ---------- per-face visibility helpers (render checks only) ----------
def descendants(obj):
    out = [obj]
    for child in obj.children:
        out += descendants(child)
    return out


def show_only(active_group):
    for group in FACE_GROUPS:
        visible = group == active_group
        for obj in descendants(bpy.data.objects[group]):
            obj.hide_render = not visible


def show_all_faces():
    for group in FACE_GROUPS:
        for obj in descendants(bpy.data.objects[group]):
            obj.hide_render = False


# ---------- main preview (classic face only) ----------
show_only("Face_Classic")
scene.render.filepath = f"{OUT_DIR}/dayly-companion-preview.png"
bpy.ops.render.render(write_still=True)
print("PREVIEW RENDERED")

# ---------- per-style verification renders ----------
for style, group in (("classic", "Face_Classic"), ("eve", "Face_Eve"),
                     ("screen", "Face_Screen"), ("kirby", "Face_Kirby"),
                     ("joy", "Face_Joy")):
    show_only(group)
    scene.render.filepath = f"{OUT_DIR}/face-variants/merged-check-{style}.png"
    bpy.ops.render.render(write_still=True)
    print(f"CHECK RENDERED {style}")

# ---------- restore full visibility before saving / exporting ----------
show_all_faces()

# ---------- save .blend ----------
bpy.ops.wm.save_as_mainfile(filepath=f"{OUT_DIR}/dayly-companion.blend")
print("BLEND SAVED")

# ---------- export GLB (model objects only; no lights/camera/target) ----------
# glTF carries no standard per-node visibility, so all five Face_* groups export
# VISIBLE; the runtime toggles the selected group on load (applyFaceStyle).
bpy.ops.object.select_all(action="DESELECT")
for name in MODEL_OBJECTS:
    bpy.data.objects[name].select_set(True)
bpy.ops.export_scene.gltf(
    filepath=f"{OUT_DIR}/dayly-companion.glb",
    export_format="GLB",
    use_selection=True,
)
print("GLB EXPORTED")
