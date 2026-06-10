import bmesh
import bpy
import math

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
def make_mat(name, color, roughness, metallic=0.0, emission=None, emission_strength=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if emission:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1.0)
        bsdf.inputs["Emission Strength"].default_value = emission_strength
    return mat


ORANGE = (1.0, 0.15, 0.035)  # ~#ff6b35 in linear
mat_body = make_mat("Body_Charcoal", (0.045, 0.045, 0.052), 0.5)
mat_base = make_mat("Base_Black", (0.012, 0.012, 0.014), 0.25, metallic=0.1)
mat_eye = make_mat("Eye_White_Emission", (1.0, 0.96, 0.9), 0.4,
                   emission=(1.0, 0.93, 0.82), emission_strength=3.5)
mat_accent = make_mat("Accent_Orange_Emission", ORANGE, 0.4,
                      emission=ORANGE, emission_strength=4.5)
mat_platform = make_mat("Platform_Dark", (0.02, 0.02, 0.022), 0.8)


def smooth(obj):
    for p in obj.data.polygons:
        p.use_smooth = True


def link(obj):
    bpy.context.collection.objects.link(obj)


# ---------- Body (two-tone via material slots, seam at lower third) ----------
bm = bmesh.new()
bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=18, radius=0.55)
mesh = bpy.data.meshes.new("Body")
bm.to_mesh(mesh)
bm.free()
body = bpy.data.objects.new("Body", mesh)
link(body)
body.scale = (1.0, 0.95, 1.1)
body.location = (0, 0, 0.68)
mesh.materials.append(mat_body)
mesh.materials.append(mat_base)
for poly in mesh.polygons:
    if poly.center.z < -0.12:  # local space, pre-scale
        poly.material_index = 1
smooth(body)

# ---------- FacePanel (glossy bubble, slightly proud of the body) ----------
bpy.ops.mesh.primitive_uv_sphere_add(segments=28, ring_count=16, radius=0.42,
                                     location=(0, -0.35, 0.87))
face = bpy.context.active_object
face.name = "FacePanel"
face.scale = (1.0, 0.45, 0.75)
face.data.materials.append(mat_base)
smooth(face)

# ---------- Eyes ----------
for name, x in (("LeftEye", -0.17), ("RightEye", 0.17)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, radius=0.095,
                                         location=(x, -0.5, 0.88))
    eye = bpy.context.active_object
    eye.name = name
    eye.scale = (1.0, 0.5, 1.3)
    eye.data.materials.append(mat_eye)
    smooth(eye)

# ---------- EnergyCore ----------
bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, radius=0.06,
                                     location=(0, -0.455, 0.46))
core = bpy.context.active_object
core.name = "EnergyCore"
core.data.materials.append(mat_accent)
smooth(core)

# ---------- HaloCharm ----------
bpy.ops.mesh.primitive_torus_add(major_radius=0.12, minor_radius=0.018,
                                 major_segments=32, minor_segments=12,
                                 location=(0, 0, 1.48), rotation=(0.18, 0, 0))
halo = bpy.context.active_object
halo.name = "HaloCharm"
halo.data.materials.append(mat_accent)
smooth(halo)

# ---------- Flippers ----------
for name, x, rot in (("LeftFlipper", -0.56, 0.22), ("RightFlipper", 0.56, -0.22)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, radius=0.3,
                                         location=(x, 0, 0.55), rotation=(0, rot, 0))
    flip = bpy.context.active_object
    flip.name = name
    flip.scale = (0.28, 0.4, 0.6)
    flip.data.materials.append(mat_body)
    smooth(flip)

# ---------- Platform + ring ----------
bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=0.78, depth=0.05,
                                    location=(0, 0, 0.025))
platform = bpy.context.active_object
platform.name = "Platform"
platform.data.materials.append(mat_platform)
smooth(platform)

bpy.ops.mesh.primitive_torus_add(major_radius=0.76, minor_radius=0.012,
                                 major_segments=48, minor_segments=10,
                                 location=(0, 0, 0.05))
ring = bpy.context.active_object
ring.name = "PlatformRing"
ring.data.materials.append(mat_accent)
smooth(ring)

MODEL_OBJECTS = ["Body", "FacePanel", "LeftEye", "RightEye", "EnergyCore",
                 "HaloCharm", "LeftFlipper", "RightFlipper", "Platform",
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

# aim the key/fill lights at the pet
target = bpy.data.objects.new("AimTarget", None)
target.location = (0, 0, 0.7)
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
cam.location = (0, -3.5, 1.6)
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
scene.render.filepath = f"{OUT_DIR}/dayly-companion-preview.png"
bpy.ops.render.render(write_still=True)
print("PREVIEW RENDERED")

# ---------- save .blend ----------
bpy.ops.wm.save_as_mainfile(filepath=f"{OUT_DIR}/dayly-companion.blend")
print("BLEND SAVED")

# ---------- export GLB (model objects only; no lights/camera/target) ----------
bpy.ops.object.select_all(action="DESELECT")
for name in MODEL_OBJECTS:
    bpy.data.objects[name].select_set(True)
bpy.ops.export_scene.gltf(
    filepath=f"{OUT_DIR}/dayly-companion.glb",
    export_format="GLB",
    use_selection=True,
)
print("GLB EXPORTED")
