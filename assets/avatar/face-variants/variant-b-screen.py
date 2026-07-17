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
mat_eye = make_mat("Eye_White_Emission", (1.0, 0.89, 0.72), 0.42,
                   emission=(1.0, 0.78, 0.52), emission_strength=2.0)
mat_pupil = make_mat("Pupil_Dark", (0.015, 0.015, 0.02), 0.25)
mat_catch = make_mat("Catchlight_White", (1.0, 1.0, 1.0), 0.3,
                     emission=(1.0, 1.0, 1.0), emission_strength=2.5)
mat_blush = make_mat("Blush_Peach", (0.78, 0.28, 0.20), 0.7,
                     emission=(0.80, 0.32, 0.22), emission_strength=0.25)
mat_accent = make_mat("Accent_Orange_Emission", ORANGE, 0.4,
                      emission=ORANGE, emission_strength=4.5)
mat_platform = make_mat("Platform_Dark", (0.02, 0.02, 0.022), 0.75)
# Variant B: OLED-style screen face
mat_screen = make_mat("Screen_Glossy_Black", (0.004, 0.004, 0.006), 0.06,
                      metallic=0.2)
LED_WARM = (1.0, 0.32, 0.09)  # coral/amber
mat_led = make_mat("LED_Coral_Emission", LED_WARM, 0.35,
                   emission=LED_WARM, emission_strength=1.5)


def smooth(obj):
    for p in obj.data.polygons:
        p.use_smooth = True


def link(obj):
    bpy.context.collection.objects.link(obj)


# ---------- Body: squat friendly mass, two-tone via material slots ----------
bm = bmesh.new()
bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=18, radius=0.55)
mesh = bpy.data.meshes.new("Body")
bm.to_mesh(mesh)
bm.free()
body = bpy.data.objects.new("Body", mesh)
link(body)
body.scale = (1.05, 0.95, 0.98)
body.location = (0, 0, 0.63)
mesh.materials.append(mat_body)
mesh.materials.append(mat_base)
for poly in mesh.polygons:
    if poly.center.z < -0.12:  # local space, pre-scale
        poly.material_index = 1
smooth(body)

# ---------- FacePanel: wide glossy visor, slightly proud of the body ----------
# Variant B: a dark, glossy OLED "screen" that curves with the head. Kept as a
# spherical cap so it reads inset/curved rather than a flat billboard.
bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=18, radius=0.44,
                                     location=(0, -0.30, 0.81))
face = bpy.context.active_object
face.name = "FacePanel"
face.scale = (1.14, 0.44, 0.66)
face.data.materials.append(mat_screen)
smooth(face)
face_panel = face


def parent_to(child, parent):
    child.parent = parent
    child.matrix_parent_inverse = parent.matrix_world.inverted()


# ---------- Screen face: flat emissive LED shapes proud of the glass ----------
# Rounded-rectangle "squircle" eyes built from a heavily-beveled thin cube so
# they read like OLED pixels. Geometry stays simple + flat so expressions can be
# swapped at runtime. Parented to the FacePanel so the screen carries them.
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


# Two softly-rounded squircle eyes, gentle friendly tilt, proud of the glass
EYE_Y = -0.55
# Parent to Body (near-uniform scale) not FacePanel: FacePanel's strong 0.44
# Y-scale would bake into children on transform_apply and squash the tiles.
make_led_tile("LeftEye", (-0.15, EYE_Y, 0.825), (0.13, 0.05, 0.185), roll=-0.05)
make_led_tile("RightEye", (0.15, EYE_Y, 0.825), (0.13, 0.05, 0.185), roll=0.05)
for nm in ("LeftEye", "RightEye"):
    parent_to(bpy.data.objects[nm], body)

# Tiny simple mouth glyph: a small horizontal LED bar for warmth
make_led_tile("ScreenMouth", (0.0, EYE_Y, 0.705), (0.065, 0.04, 0.026))
parent_to(bpy.data.objects["ScreenMouth"], body)

# ---------- Blush: two subtle warm dots on the cheeks, outside the screen ----------
for name, x in (("LeftBlush", -0.345), ("RightBlush", 0.345)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=14, ring_count=8, radius=0.05,
                                         location=(x, -0.44, 0.76))
    blush = bpy.context.active_object
    blush.name = name
    blush.scale = (1.0, 0.35, 0.75)
    blush.data.materials.append(mat_blush)
    smooth(blush)
    parent_to(blush, body)

# ---------- EnergyCore: small framed heart on the chest ----------
bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, radius=0.055,
                                     location=(0, -0.43, 0.36))
core = bpy.context.active_object
core.name = "EnergyCore"
core.data.materials.append(mat_accent)
smooth(core)

# ---------- HaloCharm: larger, thinner, tilted collectible ring ----------
bpy.ops.mesh.primitive_torus_add(major_radius=0.14, minor_radius=0.015,
                                 major_segments=36, minor_segments=12,
                                 location=(0, 0, 1.34), rotation=(0.18, 0, 0))
halo = bpy.context.active_object
halo.name = "HaloCharm"
halo.data.materials.append(mat_accent)
smooth(halo)

# One asymmetric bead turns the halo into an ownable charm rather than a
# generic status ring. It stays parented to the halo so the shared idle
# animation carries both pieces as one signature.
bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=0.027,
                                     location=(0.14, -0.015, 1.36))
halo_bead = bpy.context.active_object
halo_bead.name = "HaloBead"
halo_bead.data.materials.append(mat_accent)
smooth(halo_bead)
halo_bead.parent = halo
halo_bead.matrix_parent_inverse = halo.matrix_world.inverted()

# ---------- Flippers: tapered little arms, splayed and reaching forward ----------
for name, x, rot in (("LeftFlipper", -0.60, 0.45), ("RightFlipper", 0.60, -0.45)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, radius=0.3,
                                         location=(x, -0.12, 0.47),
                                         rotation=(0.35, rot, 0))
    flip = bpy.context.active_object
    flip.name = name
    flip.scale = (0.26, 0.40, 0.62)
    flip.data.materials.append(mat_body)
    smooth(flip)

# ---------- Feet: tiny forward nubs that ground the pet on the pod ----------
for name, x, roll in (("LeftFoot", -0.25, -0.1), ("RightFoot", 0.25, 0.1)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=18, ring_count=10, radius=0.18,
                                         location=(x, -0.18, 0.16),
                                         rotation=(0, roll, 0))
    foot = bpy.context.active_object
    foot.name = name
    foot.scale = (1.0, 1.35, 0.55)
    foot.data.materials.append(mat_body)
    smooth(foot)

# ---------- Platform: two-tier pod (joined into one named mesh) ----------
bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=0.80, depth=0.04,
                                    location=(0, 0, 0.02))
pod_base = bpy.context.active_object
pod_base.data.materials.append(mat_platform)

bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=0.62, depth=0.05,
                                    location=(0, 0, 0.065))
pod_top = bpy.context.active_object
pod_top.data.materials.append(mat_platform)

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

MODEL_OBJECTS = ["Body", "FacePanel", "LeftEye", "RightEye", "ScreenMouth",
                 "LeftBlush", "RightBlush", "EnergyCore",
                 "HaloCharm", "HaloBead", "LeftFlipper", "RightFlipper",
                 "LeftFoot", "RightFoot", "Platform",
                 "PlatformRing"]

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
scene.render.filepath = f"{OUT_DIR}/face-variants/variant-b-screen.png"
bpy.ops.render.render(write_still=True)
print("PREVIEW RENDERED")

# ---------- save .blend ----------
bpy.ops.wm.save_as_mainfile(filepath=f"{OUT_DIR}/face-variants/variant-b-screen.blend")
print("BLEND SAVED")

# ---------- export GLB (model objects only; no lights/camera/target) ----------
bpy.ops.object.select_all(action="DESELECT")
for name in MODEL_OBJECTS:
    bpy.data.objects[name].select_set(True)
bpy.ops.export_scene.gltf(
    filepath=f"{OUT_DIR}/face-variants/variant-b-screen.glb",
    export_format="GLB",
    use_selection=True,
)
print("GLB EXPORTED")
