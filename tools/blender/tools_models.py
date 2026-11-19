"""투척 도구 모델: 향 캔, 연막탄, 성냥갑 (Blender 5.x 스크립트)

실행: python3 tools/blender/tools_models.py  (pip bpy) 또는 blender -b -P tools/blender/tools_models.py
결과: src/exhibit/art/scent-can.glb, smoke-grenade.glb, match.glb + tools/blender/tools.blend
단위 미터, 원점은 바닥 가운데. 재질 이름이 게임과의 약속:
  scent-can:     Body(향 색으로 바뀜), Cap, Label, Metal
  smoke-grenade: Body(회색), Metal, Pin
  match:         Box, Strip, Stick, Head
"""
import math
import os

import bpy  # bpy를 먼저 불러야 bmesh가 잡힌다(pip bpy)
import bmesh

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
ART = os.path.join(ROOT, 'src', 'exhibit', 'art')


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def mat(name, rgb, rough=0.5, metal=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*rgb, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    return m


def lathe(name, pts, m, segs=40):
    """(반지름, 높이) 점들을 z축으로 돌려 만든 회전체"""
    bm = bmesh.new()
    rings = []
    for r, z in pts:
        if r <= 0.0001:
            rings.append([bm.verts.new((0, 0, z))])
        else:
            rings.append([bm.verts.new((r * math.cos(2 * math.pi * i / segs), r * math.sin(2 * math.pi * i / segs), z)) for i in range(segs)])
    for a, b in zip(rings, rings[1:]):
        if len(a) == 1 and len(b) == 1:
            continue
        for i in range(segs):
            j = (i + 1) % segs
            if len(a) == 1:
                bm.faces.new((a[0], b[i], b[j]))
            elif len(b) == 1:
                bm.faces.new((a[i], a[j], b[0]))
            else:
                bm.faces.new((a[i], a[j], b[j], b[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    me.materials.append(m)
    for p in me.polygons:
        p.use_smooth = True
    return ob


def box(name, size, loc, m, bevel=0.0):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x = v.co.x * size[0] + loc[0]
        v.co.y = v.co.y * size[1] + loc[1]
        v.co.z = v.co.z * size[2] + loc[2]
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    me.materials.append(m)
    if bevel:
        mod = ob.modifiers.new('B', 'BEVEL')
        mod.width = bevel
        mod.segments = 2
    return ob


def export(objs, filename):
    bpy.ops.object.select_all(action='DESELECT')
    for ob in objs:
        ob.select_set(True)
        bpy.context.view_layer.objects.active = ob
        for md in list(ob.modifiers):
            bpy.ops.object.modifier_apply(modifier=md.name)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    ob = bpy.context.active_object
    ob.name = os.path.splitext(filename)[0]
    tris = sum(len(p.vertices) - 2 for p in ob.data.polygons)
    path = os.path.join(ART, filename)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True)
    print(f'{filename}: {tris} tris')
    ob.select_set(False)
    return ob


os.makedirs(ART, exist_ok=True)
reset()

# ── 향 캔: 스프레이 캔. 높이 0.2m ─────────────────────────
body_pts = [(0, 0), (0.028, 0), (0.032, 0.004), (0.033, 0.012), (0.033, 0.15), (0.031, 0.158), (0.024, 0.168), (0.016, 0.172), (0.016, 0.176), (0, 0.176)]
can_body = lathe('CanBody', body_pts, mat('Body', (0.9, 0.55, 0.2), 0.35))
label = lathe('CanLabel', [(0.0336, 0.04), (0.0336, 0.12)], mat('Label', (0.98, 0.96, 0.9), 0.8))
rim = lathe('CanRim', [(0, 0.0), (0.03, 0.0), (0.031, 0.006), (0, 0.006)], mat('Metal', (0.75, 0.73, 0.7), 0.3, 1.0))
cap = lathe('CanCap', [(0, 0.17), (0.0305, 0.17), (0.031, 0.2), (0.026, 0.205), (0, 0.205)], mat('Cap', (0.95, 0.93, 0.88), 0.4))
nozzle = box('Nozzle', (0.012, 0.012, 0.01), (0, 0, 0.21), mat('Metal', (0.75, 0.73, 0.7), 0.3, 1.0))
can = export([can_body, label, rim, cap, nozzle], 'scent-can.glb')

# ── 연막탄: 원통 + 위 금속 뚜껑 + 고리 핀. 높이 0.15m ─────────────
m_body = mat('Body', (0.55, 0.55, 0.52), 0.6)
m_metal = mat('Metal', (0.7, 0.7, 0.68), 0.35, 1.0)
g_body = lathe('GBody', [(0, 0), (0.032, 0), (0.034, 0.005), (0.034, 0.115), (0, 0.115)], m_body)
g_band = lathe('GBand', [(0.0345, 0.03), (0.0345, 0.04)], mat('Pin', (0.85, 0.65, 0.25), 0.4, 0.6))
g_top = lathe('GTop', [(0, 0.115), (0.03, 0.115), (0.03, 0.13), (0.02, 0.14), (0, 0.14)], m_metal)
lever = box('Lever', (0.012, 0.004, 0.09), (0.0, 0.037, 0.09), m_metal)
bpy.ops.mesh.primitive_torus_add(major_radius=0.014, minor_radius=0.0025, location=(0.026, 0.0, 0.135), rotation=(math.pi / 2, 0, 0))
ring = bpy.context.active_object
ring.data.materials.append(bpy.data.materials['Pin'])
grenade = export([g_body, g_band, g_top, lever, ring], 'smoke-grenade.glb')

# ── 성냥갑: 납작한 상자 + 옆면 마찰 띠 + 반쯤 나온 서랍과 성냥 몇 개 ─────
m_box = mat('Box', (0.85, 0.32, 0.22), 0.7)
mb = box('MBox', (0.09, 0.055, 0.02), (0, 0, 0.01), m_box, 0.002)
strip = box('Strip', (0.002, 0.04, 0.012), (0.046, 0, 0.01), mat('Strip', (0.35, 0.25, 0.2), 0.9))
drawer = box('Drawer', (0.05, 0.05, 0.016), (-0.055, 0, 0.012), mat('Box', (0.85, 0.32, 0.22), 0.7))
sticks = []
for i in range(3):
    y = -0.012 + i * 0.012
    sticks.append(box(f'Stick{i}', (0.05, 0.004, 0.004), (-0.06, y, 0.022), mat('Stick', (0.9, 0.82, 0.62), 0.8)))
    sticks.append(box(f'Head{i}', (0.008, 0.007, 0.007), (-0.088, y, 0.022), mat('Head', (0.7, 0.12, 0.1), 0.6), 0.002))
match = export([mb, strip, drawer] + sticks, 'match.glb')

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, 'tools', 'blender', 'tools.blend'))
print('saved')
