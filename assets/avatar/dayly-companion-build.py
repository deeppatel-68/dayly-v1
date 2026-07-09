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
mat_body = make_mat("Body_Charcoal", (0.052, 0.052, 0.06), 0.45, coat=0.25)
mat_base = make_mat("Base_Black", (0.012, 0.012, 0.014), 0.22, metallic=0.1)
mat_eye = make_mat("Eye_White_Emission", (1.0, 0.96, 0.9), 0.4,
                   emission=(1.0, 0.93, 0.82), emission_strength=3.5)
mat_accent = make_mat("Accent_Orange_Emission", ORANGE, 0.4,
                      emission=ORANGE, emission_strength=4.5)
mat_platform = make_mat("Platform_Dark", (0.02, 0.02, 0.022), 0.75)


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
bpy.ops.mesh.primitive_uv_sphere_add(segments=28, ring_count=16, radius=0.42,
                                     location=(0, -0.34, 0.81))
face = bpy.context.active_object
face.name = "FacePanel"
face.scale = (1.12, 0.42, 0.62)
face.data.materials.append(mat_base)
smooth(face)

# ---------- Eyes: large soft ovals with a gentle outward tilt ----------
for name, x, roll in (("LeftEye", -0.165, -0.07), ("RightEye", 0.165, 0.07)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, radius=0.105,
                                         location=(x, -0.47, 0.83),
                                         rotation=(0, roll, 0))
    eye = bpy.context.active_object
    eye.name = name
    eye.scale = (1.0, 0.5, 1.35)
    eye.data.materials.append(mat_eye)
    smooth(eye)

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

# ---------- Flippers: soft rounded fins, readable in silhouette ----------
for name, x, rot in (("LeftFlipper", -0.62, 0.35), ("RightFlipper", 0.62, -0.35)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, radius=0.3,
                                         location=(x, 0, 0.48), rotation=(0, rot, 0))
    flip = bpy.context.active_object
    flip.name = name
    flip.scale = (0.30, 0.42, 0.55)
    flip.data.materials.append(mat_body)
    smooth(flip)

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
