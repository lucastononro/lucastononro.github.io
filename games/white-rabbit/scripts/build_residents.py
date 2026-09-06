"""Build articulated Hatter, cook and Queen models and their authored idle actions.

Run with Blender --background --python scripts/build_residents.py.
Model helpers accept the game's X across, Y up, Z forward coordinates.
"""
import bpy
import math
import sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
MATERIALS = {}
for name, color, roughness, metal in [
    ('skin', (.66, .40, .25), .72, 0), ('cheek', (.66, .23, .18), .75, 0),
    ('cream', (.84, .78, .62), .66, 0), ('shirt', (.77, .81, .72), .84, 0),
    ('ink', (.009, .016, .018), .65, 0), ('iris', (.09, .20, .15), .46, 0),
    ('teal', (.022, .16, .17), .7, 0), ('tealEdge', (.08, .28, .28), .65, 0),
    ('burgundy', (.28, .018, .032), .8, 0), ('scarlet', (.48, .025, .045), .7, 0),
    ('velvet', (.095, .018, .041), .9, 0), ('gold', (.62, .35, .075), .3, .7),
    ('hair', (.26, .075, .025), .88, 0), ('darkHair', (.038, .014, .013), .88, 0),
    ('trousers', (.062, .078, .068), .9, 0), ('leather', (.055, .026, .013), .57, 0),
    ('wood', (.26, .10, .032), .7, 0), ('porcelain', (.84, .81, .66), .28, 0),
]:
    m = bpy.data.materials.new('resident_' + name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    bs = m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (*color, 1)
    bs.inputs['Roughness'].default_value = roughness
    bs.inputs['Metallic'].default_value = metal
    MATERIALS[name] = m


def xyz(p):
    return (p[0], -p[2], p[1])


def pivot(name, position=(0, 0, 0), parent=None):
    o = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(o)
    o.parent = parent
    o.location = xyz(position)
    return o


def finish(o, name, position, scale, material, parent, smooth=True):
    o.name = name
    o.location = xyz(position)
    o.scale = (scale[0], scale[2], scale[1])
    o.parent = parent
    o.data.materials.append(MATERIALS[material])
    if smooth:
        for face in o.data.polygons:
            face.use_smooth = True
    return o


def ellipsoid(name, position, scale, material, parent):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=10)
    return finish(bpy.context.object, name, position, scale, material, parent)


def cylinder(name, position, radius, depth, material, parent, upper=None):
    bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=radius,
        radius2=radius if upper is None else upper, depth=depth)
    return finish(bpy.context.object, name, position, (1, 1, 1), material, parent)


def box(name, position, scale, material, parent, bevel=.018):
    bpy.ops.mesh.primitive_cube_add(size=1)
    o = finish(bpy.context.object, name, position, scale, material, parent, False)
    if bevel:
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        modifier = o.modifiers.new('Soft cloth edges', 'BEVEL')
        modifier.width = bevel
        modifier.segments = 2
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        modifier = o.modifiers.new('Corner normals', 'WEIGHTED_NORMAL')
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    return o


def tube(name, points, width, material, parent):
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.bevel_depth = width
    curve.bevel_resolution = 1
    spline = curve.splines.new('POLY')
    spline.points.add(len(points)-1)
    for p, v in zip(spline.points, points):
        p.co = (*xyz(v), 1)
    o = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(o)
    o.parent = parent
    o.data.materials.append(MATERIALS[material])
    return o


def ring(name, position, radius, width, material, parent, vertical=False):
    x, y, z = position
    return tube(name, [(x+radius*math.cos(a), y+radius*math.sin(a) if vertical else y,
        z if vertical else z+radius*math.sin(a)) for a in [i*math.tau/32 for i in range(33)]], width, material, parent)


def text(name, value, position, size, material, parent):
    curve = bpy.data.curves.new(name, 'FONT')
    curve.body = value
    curve.align_x = 'CENTER'
    curve.size = size
    curve.extrude = .0008
    o = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(o)
    o.parent = parent
    o.location = xyz(position)
    o.rotation_euler.x = math.pi/2
    curve.materials.append(MATERIALS[material])
    return o


def skirt(name, parent, material, radius=.58):
    vertices, faces = [], []
    rings = [(0, radius), (.18, radius*.97), (.48, radius*.8), (.8, radius*.54), (1.06, radius*.42)]
    for height, r in rings:
        for i in range(40):
            angle = i*math.tau/40
            fold = 1+.045*math.cos(angle*10)
            vertices.append(xyz((r*fold*math.cos(angle), height-.9, r*.78*fold*math.sin(angle))))
    for row in range(len(rings)-1):
        for i in range(40):
            a=row*40+i; b=row*40+(i+1)%40
            faces.append((a,b,b+40,a+40))
    faces.append(tuple(reversed(range(40))))
    mesh=bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    o=bpy.data.objects.new(name,mesh)
    bpy.context.collection.objects.link(o)
    o.parent=parent
    mesh.materials.append(MATERIALS[material])
    for face in mesh.polygons:face.use_smooth=True
    return o


def face(role, head):
    ellipsoid(role+'_face', (0,0,.02), (.235,.30,.215), 'skin', head)
    for side in [-1,1]:
        ellipsoid(role+'_ear', (side*.231,-.005,.012), (.052,.085,.046), 'skin',head)
        ellipsoid(role+'_cheek', (side*.134,-.07,.188), (.066,.043,.018), 'cheek',head)
    ellipsoid(role+'_nose', (0,-.004,.239), (.052,.075,.077), 'skin',head)
    tube(role+'_mouth', [(-.074,-.138,.199),(-.026,-.149,.217),(.036,-.143,.216),(.078,-.119,.196)],.009,'burgundy',head)
    eyes=pivot(role+'_Blink',(0,.058,.20),head)
    for side in [-1,1]:
        ellipsoid(role+'_eyeWhite',(side*.09,0,0),(.06,.046,.026),'cream',eyes)
        ellipsoid(role+'_iris',(side*.09,0,.025),(.029,.033,.009),'iris',eyes)
        ellipsoid(role+'_pupil',(side*.09,0,.033),(.013,.025,.007),'ink',eyes)
        ellipsoid(role+'_glint',(side*.09-.01,.012,.04),(.006,.008,.004),'shirt',eyes)
        tube(role+'_eyebrow',[(side*.09-.053,.13,.19),(side*.09,.148,.212),(side*.09+.047,.128,.195)],.013,'darkHair' if role!='Hatter' else 'hair',head)
    return eyes


def arm(role, side, body, cloth):
    suffix='L' if side<0 else 'R'
    shoulder=pivot(role+'_Shoulder'+suffix,(side*.285,.36,0),body)
    ellipsoid(role+'_puffedShoulder'+suffix,(0,-.058,0),(.14,.15,.13),cloth,shoulder)
    cylinder(role+'_upperSleeve'+suffix,(0,-.20,0),.094,.32,cloth,shoulder,upper=.12)
    elbow=pivot(role+'_Elbow'+suffix,(0,-.35,0),shoulder)
    cylinder(role+'_lowerSleeve'+suffix,(0,-.12,0),.075,.26,cloth,elbow,upper=.094)
    cylinder(role+'_cuff'+suffix,(0,-.26,0),.081,.075,'shirt',elbow)
    hand=pivot(role+'_Hand'+suffix,(0,-.315,.016),elbow)
    ellipsoid(role+'_palm'+suffix,(0,0,0),(.072,.081,.045),'skin',hand)
    for finger in range(3):
        ellipsoid(role+'_finger'+suffix,(side*(-.035+finger*.034),-.055,.027),(.017,.054,.022),'skin',hand)
    ellipsoid(role+'_thumb'+suffix,(-side*.063,-.004,.022),(.031,.045,.025),'skin',hand)
    return shoulder, elbow, hand


actors=[]
for role, cloth in [('Cook','cream'),('Hatter','teal'),('Queen','scarlet')]:
    root=pivot(role+'Resident')
    root['residentRole']=role.lower()
    body=pivot(role+'_Body',(0,1.02,0),root)
    body['articulatedPart']='torso'
    if role=='Hatter':
        for side in [-1,1]:
            cylinder(role+'_trouser',(side*.145,.46,-.025),.103,.79,'trousers',root,upper=.12)
            ellipsoid(role+'_shoe',(side*.145,.085,.085),(.13,.09,.23),'leather',root)
            box(role+'_heel',(side*.145,.042,-.073),(.19,.07,.13),'leather',root)
            ellipsoid(role+'_coatTail',(side*.21,-.45,-.08),(.17,.43,.12),cloth,body)
    else:
        skirt(role+'_pleatedSkirt',body,'burgundy' if role=='Queen' else 'cream',.63 if role=='Queen' else .48)
        for side in [-1,1]:
            ellipsoid(role+'_shoe',(side*.16,.065,.20),(.13,.075,.20),'leather',root)
    ellipsoid(role+'_jacket',(0,.20,0),(.30,.40,.22),cloth,body)
    if role=='Cook':
        box('Cook_linenApron',(0,-.11,.257),(.50,.76,.024),'shirt',body)
        box('Cook_apronBib',(0,.27,.22),(.32,.42,.025),'shirt',body)
        tube('Cook_apronNeck',[(-.17,.40,.18),(-.13,.48,.06),(.13,.48,.06),(.17,.40,.18)],.017,'shirt',body)
        for x in [-.16,.16]:tube('Cook_apronCrease',[(x,-.44,.282),(x*.7,-.12,.28),(x*.8,.11,.28)],.006,'cream',body)
        box('Cook_apronPocket',(-.10,-.20,.283),(.21,.15,.024),'cream',body)
    elif role=='Hatter':
        ellipsoid('Hatter_waistcoat',(0,.15,.19),(.20,.28,.045),'burgundy',body)
        for side in [-1,1]:
            lapel=box('Hatter_lapel',(side*.14,.34,.203),(.12,.34,.04),'tealEdge',body)
            lapel.rotation_euler.y=side*.37
            box('Hatter_jacketPocket',(side*.215,-.04,.158),(.15,.055,.038),'tealEdge',body)
            ellipsoid('Hatter_bow',(side*.08,.49,.213),(.086,.055,.041),'scarlet',body)
        ellipsoid('Hatter_bowKnot',(0,.49,.25),(.036,.045,.029),'gold',body)
        for y in [.28,.15,.02]:ellipsoid('Hatter_button',(0,y,.235),(.025,.025,.012),'gold',body)
        tube('Hatter_watchChain',[(0,.16,.24),(.07,-.08,.25),(.15,-.10,.20),(.24,.05,.17)],.006,'gold',body)
    else:
        ellipsoid('Queen_bodice',(0,.21,.165),(.25,.30,.055),'velvet',body)
        text('Queen_heart','♥',(0,.13,.227),.32,'gold',body)
        cylinder('Queen_belt',(0,-.04,0),.28,.07,'gold',body)
        for i in range(11):
            a=math.pi+i*math.pi/10
            ellipsoid('Queen_ruff',(.32*math.cos(a),.46,.17*math.sin(a)-.04),(.082,.14,.061),'shirt',body)
        for i in range(20):
            a=i*math.tau/20
            ellipsoid('Queen_hemGold',(.60*math.cos(a),-.84,.47*math.sin(a)),(.028,.028,.025),'gold',body)
    head=pivot(role+'_Head',(0,.87 if role=='Cook' else .69,0),body)
    eyes=face(role,head)
    if role=='Hatter':
        for side in [-1,1]:
            for i in range(5):ellipsoid('Hatter_curl',(side*(.21+.017*math.sin(i)),.16-i*.066,-.012),(.070,.067,.10),'hair',head)
        for i in range(7):ellipsoid('Hatter_fringe',(-.19+i*.062,.235,.127),(.057,.07,.062),'hair',head)
        cylinder('Hatter_hatBrim',(0,.295,0),.385,.055,'teal',head)
        cylinder('Hatter_hatCrown',(0,.59,0),.245,.58,'teal',head,upper=.31)
        cylinder('Hatter_hatRibbon',(0,.40,0),.264,.125,'burgundy',head)
        ring('Hatter_hatPiping',(0,.89,0),.31,.013,'gold',head)
        tag=box('Hatter_priceTag',(0,.55,.288),(.31,.24,.018),'cream',head,bevel=.007)
        text('Hatter_priceText','10/6',(0,.50,.304),.115,'ink',head)
    elif role=='Cook':
        for side in [-1,1]:ellipsoid('Cook_hair',(side*.185,.035,-.09),(.10,.23,.17),'darkHair',head)
        cylinder('Cook_hatBand',(0,.275,0),.24,.17,'shirt',head)
        for i in range(7):
            a=i*math.tau/7
            ellipsoid('Cook_toquePuff',(.15*math.cos(a),.40,.13*math.sin(a)),(.15,.16,.14),'shirt',head)
        ellipsoid('Cook_toqueTop',(0,.49,0),(.21,.12,.19),'shirt',head)
    else:
        ellipsoid('Queen_hairBack',(0,.08,-.095),(.275,.30,.16),'darkHair',head)
        for side in [-1,1]:
            for i in range(4):ellipsoid('Queen_hairCurl',(side*.22,.17-i*.095,-.008),(.063,.064,.07),'darkHair',head)
            ellipsoid('Queen_earring',(side*.24,-.09,.018),(.039,.059,.024),'gold',head)
        cylinder('Queen_crownBase',(0,.305,0),.232,.105,'gold',head)
        for i in range(7):
            a=i*math.tau/7
            cylinder('Queen_crownPoint',(.206*math.cos(a),.43,.206*math.sin(a)),.052,.19,'gold',head,upper=.008)
            ellipsoid('Queen_crownPearl',(.206*math.cos(a),.53,.206*math.sin(a)),(.027,.027,.027),'cream',head)
        ellipsoid('Queen_crownJewel',(0,.322,.234),(.046,.038,.015),'scarlet',head)
    left=arm(role,-1,body,cloth)
    right=arm(role,1,body,cloth)
    if role=='Cook':
        # Keep the grip above the cauldron's rim and the longer spoon in the soup.
        left[0].location.z+=.14
        left[0].rotation_euler.x=-2.25
        left[0].rotation_euler.y=-.20
        left[1].rotation_euler.x=-.55
        tube('Cook_woodenSpoon',[(0,-.01,0),(0,.28,-.82)],.018,'wood',left[2])
        ellipsoid('Cook_spoonBowl',(0,.28,-.84),(.052,.027,.08),'wood',left[2])
        pivot('Cook_SpoonTip',(0,.28,-.84),left[2])
        right[0].rotation_euler.y=-.20
        right[1].rotation_euler.x=-.3
    elif role=='Hatter':
        left[0].rotation_euler.x=-.65
        left[1].rotation_euler.x=-1.3
        cup=pivot('Hatter_Cup',(0,-.085,.04),left[2])
        cup.rotation_euler.x=1.95
        cylinder('Hatter_cup',(0,.045,0),.065,.13,'porcelain',cup,upper=.084)
        ring('Hatter_cupRim',(0,.11,0),.084,.007,'gold',cup)
        ring('Hatter_cupHandle',(-.09,.04,0),.048,.009,'porcelain',cup,True)
        cylinder('Hatter_tea',(0,.108,0),.074,.004,'wood',cup)
        right[0].rotation_euler.y=-.18
        right[1].rotation_euler.x=-.24
    else:
        left[0].rotation_euler.x=-.36
        left[1].rotation_euler.x=-.7
        scepter=pivot('Queen_Scepter',(0,-.025,.03),left[2])
        scepter.rotation_euler.x=1.06
        cylinder('Queen_scepterShaft',(0,.25,0),.022,.95,'gold',scepter)
        ellipsoid('Queen_scepterOrb',(0,.78,0),(.10,.10,.10),'scarlet',scepter)
        ring('Queen_scepterBand',(0,.78,0),.104,.009,'gold',scepter)
        right[0].rotation_euler.y=-.18
        right[1].rotation_euler.x=-.4
    actors.append(dict(role=role,root=root,body=body,head=head,eyes=eyes,left=left,right=right))

# Each static material under a joint becomes one draw call, while the joint
# hierarchy stays intact. Exported curves and lettering are real mesh geometry.
for obj in list(bpy.context.scene.objects):
    if obj.type in {'CURVE','FONT'}:
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True)
        bpy.context.view_layer.objects.active=obj
        bpy.ops.object.convert(target='MESH')
for parent in [o for o in bpy.context.scene.objects if o.type=='EMPTY']:
    materials={}
    for obj in list(parent.children):
        if obj.type=='MESH':materials.setdefault(obj.data.materials[0].name,[]).append(obj)
    for name, objects in materials.items():
        if len(objects)>1:
            bpy.ops.object.select_all(action='DESELECT')
            for obj in objects:obj.select_set(True)
            bpy.context.view_layer.objects.active=objects[0]
            bpy.ops.object.join()
            objects[0].name=parent.name+'_'+name

# Six-second loops include a quiet hold, a readable gesture and a return to rest.
# Endpoint keys match, so repeating a clip does not snap a head or a hand.
DURATION=145
bpy.context.scene.render.fps=24
bpy.context.scene.frame_start=1
bpy.context.scene.frame_end=DURATION
for a in actors:
    role=a['role']; body=a['body']; head=a['head']; eyes=a['eyes']; left=a['left']; right=a['right']
    parts=[body,head,eyes,*left,*right]
    rest={o.name:(o.location.copy(),o.rotation_euler.copy(),o.scale.copy()) for o in parts}
    for frame in range(1,DURATION+1,2):
        t=(frame-1)/(DURATION-1)
        angle=t*math.tau
        gesture=math.sin(math.pi*min(1,max(0,(t-.18)/.48)))**2 if .18<t<.66 else 0
        for o in parts:o.location,o.rotation_euler,o.scale=rest[o.name]
        body.location.z+=math.sin(angle)*.009
        head.rotation_euler.z+=math.sin(angle)*.035
        # Two short blinks, with the eyeballs remaining under the same head joint.
        blink=max(0,1-abs(t-.15)/.025,1-abs(t-.78)/.025)
        eyes.scale.z=1-.96*blink
        if role=='Cook':
            left[0].rotation_euler.x+=math.sin(angle*2)*.10
            left[0].rotation_euler.y+=math.cos(angle*2)*.085
            left[1].rotation_euler.x+=math.sin(angle*2+.45)*.075
            left[2].rotation_euler.z+=math.sin(angle*2)*.10
            head.rotation_euler.x+=.10+math.sin(angle*2)*.035
            right[1].rotation_euler.x-=gesture*.22
        elif role=='Hatter':
            left[0].rotation_euler.x-=gesture*.37
            left[1].rotation_euler.x-=gesture*.18
            head.rotation_euler.x+=gesture*.085
            right[0].rotation_euler.y-=gesture*.22
            right[1].rotation_euler.x-=gesture*.48
            right[2].rotation_euler.y+=gesture*.28
        else:
            right[0].rotation_euler.x-=gesture*.62
            right[0].rotation_euler.y-=gesture*.32
            right[1].rotation_euler.x-=gesture*.38
            right[2].rotation_euler.z-=gesture*.22
            head.rotation_euler.z-=gesture*.12
            left[0].rotation_euler.x+=math.sin(angle)*.025
        for o in parts:
            o.keyframe_insert(data_path='location',frame=frame)
            o.keyframe_insert(data_path='rotation_euler',frame=frame)
            o.keyframe_insert(data_path='scale',frame=frame)
    clip={'Cook':'CookStir','Hatter':'HatterTea','Queen':'QueenCommand'}[role]
    for o in parts:
        action=o.animation_data.action
        action.name=clip+'_'+o.name
        track=o.animation_data.nla_tracks.new()
        track.name=clip
        track.strips.new(clip,1,action)
        o.animation_data.action=None
        o.location,o.rotation_euler,o.scale=rest[o.name]

bpy.context.scene.frame_set(1)
(ROOT/'assets/blender').mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/wonderland-residents.blend'))
bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/models/wonderland-residents.glb'),
    export_format='GLB',export_animations=True,export_animation_mode='NLA_TRACKS',export_extras=True)
print('Exported three residents and CookStir, HatterTea, QueenCommand animation clips.',flush=True)

# Studio preview is local QA, not a game asset.
if '--skip-preview' not in sys.argv:
    for actor,x in zip(actors,[-2.0,0,2.0]):actor['root'].location.x=x
    bpy.context.scene.frame_set(76)
    bpy.ops.mesh.primitive_plane_add(size=200)
    floor=bpy.context.object
    floor.data.materials.append(MATERIALS['trousers'])
    bpy.ops.object.camera_add(location=(3.8,-10.5,4.1))
    camera=bpy.context.object
    camera.rotation_euler=(Vector((0,0,1.25))-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.type='ORTHO'
    camera.data.ortho_scale=7.2
    bpy.context.scene.camera=camera
    for location,power,size in [((1,-5,7),1000,5),((-5,-1,4),700,4),((3,4,6),1300,3)]:
        bpy.ops.object.light_add(type='AREA',location=location)
        light=bpy.context.object
        light.data.energy=power
        light.data.shape='DISK'
        light.data.size=size
        light.rotation_euler=(Vector((0,0,1))-light.location).to_track_quat('-Z','Y').to_euler()
    bpy.context.scene.world.color=(.16,.16,.16)
    bpy.context.scene.render.engine='CYCLES'
    bpy.context.scene.cycles.samples=24
    bpy.context.scene.render.resolution_x=1440
    bpy.context.scene.render.resolution_y=900
    bpy.context.scene.render.resolution_percentage=100
    (ROOT/'tmp').mkdir(exist_ok=True)
    bpy.context.scene.render.filepath=str(ROOT/'tmp/residents-preview.png')
    bpy.ops.render.render(write_still=True)
