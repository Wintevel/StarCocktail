"""향 원액 병 모델 (Blender 5.x 스크립트)

실행: blender -b -P tools/blender/essence_bottle.py   (또는 pip의 bpy로 python3 tools/blender/essence_bottle.py)
결과: src/exhibit/art/essence-bottle.glb, tools/blender/essence-bottle.blend, tools/blender/essence-bottle.png(미리보기)

모양: 모서리를 둥글린 납작한 사각 몸통 + 짧은 목 + 금빛 목 고리 + 다면체로 깎은 유리 마개.
단위: 미터. 높이 약 0.15m, 원점은 바닥 가운데. 재질 이름이 게임과 약속이다:
  Body    — 노트 색으로 바뀌는 몸통(원액이 비치는 유리)
  Label   — 크림 종이 라벨
  Gold    — 목 고리
  Stopper — 마개(몸통 색을 옅게)
"""
import math
import os

import bpy
import bmesh

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT_GLB = os.path.join(ROOT, 'src', 'exhibit', 'art', 'essence-bottle.glb')
OUT_BLEND = os.path.join(ROOT, 'tools', 'blender', 'essence-bottle.blend')
OUT_PNG = os.path.join(ROOT, 'tools', 'blender', 'essence-bottle.png')

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


def material(name, rgb, rough=0.4, metal=0.0, alpha=1.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*rgb, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if alpha < 1:
        b.inputs['Alpha'].default_value = alpha
    return m


M_BODY = material('Body', (0.85, 0.55, 0.2), 0.15)
M_LABEL = material('Label', (0.98, 0.96, 0.91), 0.8)
M_GOLD = material('Gold', (0.91, 0.69, 0.29), 0.3, 1.0)
M_STOP = material('Stopper', (0.95, 0.85, 0.7), 0.1)


def obj_from_bm(name, bm, mat, smooth=True):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    scene.collection.objects.link(ob)
    me.materials.append(mat)
    for p in me.polygons:
        p.use_smooth = smooth
    return ob


def add_bevel(ob, width, segs=3):
    mod = ob.modifiers.new('Bevel', 'BEVEL')
    mod.width = width
    mod.segments = segs
    mod.limit_method = 'ANGLE'
    mod.angle_limit = math.radians(40)
    ob.modifiers.new('WN', 'WEIGHTED_NORMAL').keep_sharp = True


# ── 몸통: 납작한 사각 기둥, 위쪽 어깨는 안으로 모인다 ─────────────
W, D, H = 0.072, 0.048, 0.095  # 폭, 두께, 몸통 높이
bm = bmesh.new()
bmesh.ops.create_cube(bm, size=1.0)
for v in bm.verts:
    v.co.x *= W
    v.co.y *= D
    v.co.z = (v.co.z + 0.5) * H
# 어깨: 윗면을 한 번 더 밀어 올리며 좁힌다
top = [f for f in bm.faces if f.normal.z > 0.9][0]
r = bmesh.ops.extrude_face_region(bm, geom=[top])
nv = [e for e in r['geom'] if isinstance(e, bmesh.types.BMVert)]
for v in nv:
    v.co.x *= 0.42
    v.co.y *= 0.55
    v.co.z += 0.018
body = obj_from_bm('Body', bm, M_BODY)
add_bevel(body, 0.009, 4)
sub = body.modifiers.new('Sub', 'SUBSURF')
sub.levels = 1
sub.render_levels = 1

# ── 라벨: 앞면에 붙은 얇은 종이 ─────────────────────────────
bm = bmesh.new()
bmesh.ops.create_cube(bm, size=1.0)
for v in bm.verts:
    v.co.x *= W * 0.7
    v.co.y *= 0.002
    v.co.z = 0.042 + v.co.z * 0.036
    v.co.y -= D / 2 + 0.0012
label = obj_from_bm('Label', bm, M_LABEL, smooth=False)

# ── 목과 금빛 고리 ───────────────────────────────────────
neck_z = H + 0.018
bm = bmesh.new()
bmesh.ops.create_cone(bm, cap_ends=True, segments=32, radius1=0.011, radius2=0.011, depth=0.016)
for v in bm.verts:
    v.co.z += neck_z + 0.008
neck = obj_from_bm('Neck', bm, M_BODY)

bm = bmesh.new()
bmesh.ops.create_cone(bm, cap_ends=True, segments=32, radius1=0.0145, radius2=0.0145, depth=0.008)
for v in bm.verts:
    v.co.z += neck_z + 0.016
ring = obj_from_bm('Ring', bm, M_GOLD)
add_bevel(ring, 0.0012, 2)

# ── 마개: 팔면으로 깎은 보석 모양 ─────────────────────────────
bm = bmesh.new()
segs = 8
ring_pts = [
    (0.0, 0.0),
    (0.010, 0.0),
    (0.018, 0.010),
    (0.016, 0.022),
    (0.0, 0.034),
]
rings = []
for (rad, z) in ring_pts[1:-1]:
    rings.append([bm.verts.new((rad * math.cos(2 * math.pi * i / segs + math.pi / segs), rad * math.sin(2 * math.pi * i / segs + math.pi / segs), z)) for i in range(segs)])
bottom = bm.verts.new((0, 0, 0))
apex = bm.verts.new((0, 0, ring_pts[-1][1]))
for i in range(segs):
    j = (i + 1) % segs
    bm.faces.new((bottom, rings[0][j], rings[0][i]))
    for k in range(len(rings) - 1):
        bm.faces.new((rings[k][i], rings[k][j], rings[k + 1][j], rings[k + 1][i]))
    bm.faces.new((rings[-1][i], rings[-1][j], apex))
for v in bm.verts:
    v.co.z += neck_z + 0.020
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
stopper = obj_from_bm('Stopper', bm, M_STOP, smooth=False)

# ── 하나로 합치기 (모디파이어 적용) ─────────────────────────────
bpy.ops.object.select_all(action='DESELECT')
for ob in (body, label, neck, ring, stopper):
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    for m in list(ob.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)
bpy.context.view_layer.objects.active = body
bpy.ops.object.join()
bottle = bpy.context.active_object
bottle.name = 'EssenceBottle'

tris = sum(len(p.vertices) - 2 for p in bottle.data.polygons)
print(f'triangles: {tris}')

os.makedirs(os.path.dirname(OUT_GLB), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=OUT_GLB, export_format='GLB', use_selection=True, export_apply=True, export_yup=True)

# ── 미리보기 렌더 ───────────────────────────────────────
cam_data = bpy.data.cameras.new('Cam')
cam_data.lens = 85
cam = bpy.data.objects.new('Cam', cam_data)
scene.collection.objects.link(cam)
cam.location = (0.32, -0.62, 0.2)
direction = (0 - cam.location[0], 0 - cam.location[1], 0.075 - cam.location[2])
import mathutils
cam.rotation_euler = mathutils.Vector(direction).to_track_quat('-Z', 'Y').to_euler()
scene.camera = cam
light = bpy.data.objects.new('Key', bpy.data.lights.new('Key', 'AREA'))
light.data.energy = 60
light.data.size = 0.5
light.location = (-0.3, -0.4, 0.5)
scene.collection.objects.link(light)
world = bpy.data.worlds.new('W')
world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.98, 0.96, 0.91, 1)
scene.world = world
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.light = 'STUDIO'
scene.display.shading.color_type = 'MATERIAL'
scene.display.shading.show_cavity = True
scene.display.shading.show_object_outline = True
scene.render.resolution_x = 600
scene.render.resolution_y = 800
scene.render.filepath = OUT_PNG
bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND)
print('saved', OUT_GLB, OUT_BLEND)
# 미리보기 PNG: GPU가 있는 PC에서 PREVIEW=1로 실행할 때만(서버에서는 렌더러가 멈춘다)
if os.environ.get('PREVIEW'):
    bpy.ops.render.render(write_still=True)
