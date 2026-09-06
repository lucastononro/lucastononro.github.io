"""Build the woodland cast and their articulated animation clips in Blender.

All helper coordinates are in game space: X across, Y up, Z forward.
Run with Blender --background --python scripts/build_animals.py.
The glTF contains three independent character roots. Puzzle props stay in the
environment asset; the messenger's existing letter attaches to LetterGrip.
"""
import bpy
import math
import os
import random
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
random.seed(31)
for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)


def xyz(p):
    return (p[0], -p[2], p[1])


def mat(name, color, rough=.5, metallic=0):
    material = bpy.data.materials.new(name)
    material.diffuse_color = (*color, 1)
    material.use_nodes = True
    bs = material.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (*color, 1)
    bs.inputs['Roughness'].default_value = rough
    bs.inputs['Metallic'].default_value = metallic
    return material


M = {name: mat(name, color, rough, metal) for name, color, rough, metal in [
    ('FrogMoss', (.26, .43, .12), .44, 0),
    ('FrogLight', (.45, .59, .22), .46, 0),
    ('FrogSpots', (.12, .24, .065), .6, 0),
    ('ThroatCream', (.77, .75, .4), .52, 0),
    ('CoatClaret', (.34, .045, .063), .72, 0),
    ('CoatSeam', (.58, .16, .14), .68, 0),
    ('Waistcoat', (.12, .24, .23), .72, 0),
    ('Linen', (.85, .79, .62), .75, 0),
    ('BrassDetail', (.68, .44, .15), .32, .65),
    ('IrisAmber', (.69, .43, .09), .31, .12),
    ('EyeInk', (.012, .021, .018), .2, 0),
    ('EyeGlint', (.95, .94, .84), .18, 0),
    ('Mouth', (.085, .035, .025), .68, 0),
    ('CaterpillarBlue', (.07, .27, .36), .52, .05),
    ('CaterpillarLight', (.16, .43, .48), .52, .02),
    ('CaterpillarStripe', (.04, .15, .24), .6, 0),
    ('HedgehogFur', (.4, .28, .14), .86, 0),
    ('HedgehogFace', (.64, .48, .28), .81, 0),
    ('HedgehogSpine', (.29, .17, .075), .85, 0),
    ('HedgehogTips', (.76, .66, .42), .86, 0),
    ('HedgehogEar', (.48, .29, .22), .77, 0),
]}
SPHERES = {}


def pivot(name, position=(0, 0, 0), parent=None):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.location = xyz(position)
    obj.parent = parent
    return obj


def ball(name, position, scale, material, parent):
    if material not in SPHERES:
        bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12)
        temporary = bpy.context.object
        temporary.data.materials.append(M[material])
        for face in temporary.data.polygons:
            face.use_smooth = True
        SPHERES[material] = temporary.data
        bpy.data.objects.remove(temporary, do_unlink=True)
    obj = bpy.data.objects.new(name, SPHERES[material])
    bpy.context.collection.objects.link(obj)
    obj.location = xyz(position)
    obj.scale = (scale[0], scale[2], scale[1])
    obj.parent = parent
    return obj


def tube(name, points, radius, material, parent):
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.resolution_u = 8
    curve.bevel_resolution = 2
    curve.bevel_depth = radius
    spline = curve.splines.new('BEZIER')
    spline.bezier_points.add(len(points) - 1)
    for point, position in zip(spline.bezier_points, points):
        point.co = xyz(position)
        point.handle_left_type = 'AUTO'
        point.handle_right_type = 'AUTO'
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    curve.materials.append(M[material])
    return obj


def cone(name, start, end, radius, tip_radius, material, parent):
    a, b = Vector(xyz(start)), Vector(xyz(end))
    direction = b - a
    bpy.ops.mesh.primitive_cone_add(vertices=7, radius1=radius,
                                  radius2=tip_radius, depth=direction.length)
    obj = bpy.context.object
    obj.name = name
    obj.location = (a + b) / 2
    obj.rotation_euler = direction.to_track_quat('Z', 'Y').to_euler()
    obj.data.materials.append(M[material])
    obj.parent = parent
    for face in obj.data.polygons:
        face.use_smooth = True
    return obj


def webbed_foot(name, x, parent):
    ball(name + 'Heel', (x, .065, .05), (.1, .06, .15), 'FrogMoss', parent)
    for i in range(3):
        dx = (i - 1) * .065
        tube(name + 'Toe', [(x, .055, .08), (x + dx, .04, .23),
                           (x + dx * 1.3, .045, .31 - abs(dx))], .027,
             'FrogLight', parent)
        ball(name + 'Pad', (x + dx * 1.3, .045, .31 - abs(dx)),
             (.033, .018, .043), 'FrogLight', parent)
    # A flat elliptical membrane bridges the three toes.
    ball(name + 'Web', (x, .038, .18), (.11, .016, .1), 'FrogMoss', parent)


# The messenger keeps the height and the letter position of the original.
frog = pivot('FrogRig')
frog['animal'] = 'messenger'
frog_body = pivot('FrogTorso', (0, .85, 0), frog)
ball('FrogCoatBody', (0, -.02, 0), (.34, .43, .255), 'CoatClaret', frog_body)
for side in [-1, 1]:
    ball('FrogCoatTail', (side * .17, -.33, -.1), (.16, .28, .15), 'CoatClaret', frog_body)
    tube('FrogCoatPiping', [(side * .2, .27, .21), (side * .15, .08, .262),
                           (side * .16, -.3, .22)], .012, 'CoatSeam', frog_body)
ball('FrogWaistcoat', (0, .065, .225), (.19, .3, .058), 'Waistcoat', frog_body)
for y in [-.10, .02, .14]:
    ball('FrogButton', (0, y, .286), (.02, .02, .012), 'BrassDetail', frog_body)
ball('FrogShirt', (0, .285, .13), (.17, .12, .12), 'Linen', frog_body)
for side in [-1, 1]:
    ball('FrogCollar', (side * .105, .28, .2), (.11, .052, .05), 'Linen', frog_body)
ball('FrogCravat', (0, .22, .266), (.07, .13, .045), 'Linen', frog_body)

frog_legs = []
for side in [-1, 1]:
    leg = pivot('FrogLegL' if side < 0 else 'FrogLegR', (side * .22, .32, -.04), frog)
    ball('FrogThigh', (side * .045, .03, 0), (.14, .24, .14), 'FrogMoss', leg)
    tube('FrogShin', [(side * .04, 0, 0), (side * .09, -.13, -.035),
                     (side * .045, -.25, .1)], .064, 'FrogMoss', leg)
    foot = pivot('FrogFootL' if side < 0 else 'FrogFootR', (side * .045, -.31, .07), leg)
    webbed_foot('FrogWebbed', 0, foot)
    frog_legs.append(leg)

frog_arms = []
for side in [-1, 1]:
    arm = pivot('FrogArmL' if side < 0 else 'FrogArmR', (side * .31, .15, .015), frog_body)
    tube('FrogSleeve', [(0, 0, 0), (side * .12, -.16, .1),
                       (side * .015, -.035, .34)], .084, 'CoatClaret', arm)
    ball('FrogCuff', (side * .008, -.03, .35), (.075, .075, .06), 'Linen', arm)
    ball('FrogHand', (0, -.02, .405), (.072, .064, .055), 'FrogLight', arm)
    for i in range(3):
        x = side * (.032 - i * .021)
        tube('FrogFinger', [(x, -.01 + i * .023, .43),
                           (x - side * .026, .015 + i * .023, .45),
                           (x - side * .06, .018 + i * .023, .455)],
             .015, 'FrogLight', arm)
    frog_arms.append(arm)
# Existing invitation and seal retain their world transforms when attached here.
pivot('FrogLetterGrip', (0, .15, .4), frog_body)

frog_head = pivot('FrogHead', (0, .505, .015), frog_body)
ball('FrogBroadHead', (0, .02, 0), (.40, .24, .245), 'FrogMoss', frog_head)
ball('FrogUpperMuzzle', (0, -.025, .17), (.37, .115, .18), 'FrogLight', frog_head)
for side in [-1, 1]:
    ball('FrogNostril', (side * .1, .034, .334), (.016, .01, .008), 'FrogSpots', frog_head)
    for i in range(5):
        angle = (i / 4) * 1.7
        ball('FrogFreckle', (side * (.24 + .08 * math.sin(angle)),
                            -.022 + .06 * math.cos(angle), .275 - .06 * math.sin(angle)),
             (.012 + i * .001, .008, .007), 'FrogSpots', frog_head)
frog_jaw = pivot('FrogJaw', (0, -.05, .1), frog_head)
ball('FrogMouthShadow', (0, -.028, .13), (.295, .018, .16), 'Mouth', frog_jaw)
ball('FrogLowerJaw', (0, -.057, .125), (.32, .048, .17), 'FrogLight', frog_jaw)
frog_throat = ball('FrogThroat', (0, -.16, .1), (.22, .10, .16), 'ThroatCream', frog_head)
frog_lids = []
for side in [-1, 1]:
    x = side * .252
    ball('FrogEyeOrbit', (x, .194, .078), (.158, .17, .135), 'FrogMoss', frog_head)
    ball('FrogEyeWhite', (x, .214, .171), (.12, .124, .064), 'Linen', frog_head)
    ball('FrogIris', (x, .212, .223), (.079, .082, .025), 'IrisAmber', frog_head)
    ball('FrogPupil', (x, .212, .246), (.061, .024, .012), 'EyeInk', frog_head)
    ball('FrogEyeReflection', (x - .025, .244, .256), (.018, .022, .006), 'EyeGlint', frog_head)
    lid = pivot('FrogLidL' if side < 0 else 'FrogLidR', (x, .313, .228), frog_head)
    ball('FrogUpperLid', (0, 0, 0), (.126, .028, .052), 'FrogMoss', lid)
    frog_lids.append(lid)


# The caterpillar sits on the mushroom's left shoulder so its clock is readable.
# Its tail curves back onto the cap rather than hanging unsupported in the air.
caterpillar = pivot('CaterpillarRig')
caterpillar['animal'] = 'caterpillar'
caterpillar_segments = []
tail_points = [(.68, -.025, -.02), (.5, .005, .05), (.31, .03, .08),
               (.14, .09, .07), (.035, .22, .025), (0, .38, 0)]
for i, p in enumerate(tail_points):
    segment = pivot('CaterpillarSegment' + str(i), p, caterpillar)
    size = .115 + min(i, 3) * .017
    ball('CaterpillarBody', (0, 0, 0), (size, .135, .19), 'CaterpillarBlue', segment)
    ball('CaterpillarBelly', (0, -.025, .145), (size * .72, .085, .035), 'CaterpillarLight', segment)
    for side in [-1, 1]:
        ball('CaterpillarSideSpot', (side * size * .91, .015, .045),
             (.018, .032, .039), 'CaterpillarStripe', segment)
    caterpillar_segments.append(segment)

caterpillar_arms = []
for i, height in enumerate([.13, .28, .42]):
    for side in [-1, 1]:
        arm = pivot('CaterpillarArm' + str(i) + ('L' if side < 0 else 'R'),
                    (side * .13, height, .04), caterpillar)
        elbow = (side * .13, -.02, .04)
        wrist = (side * .1, -.08, .15)
        tube('CaterpillarForeleg', [(0, 0, 0), elbow, wrist], .026, 'CaterpillarBlue', arm)
        ball('CaterpillarHand', wrist, (.035, .032, .04), 'CaterpillarLight', arm)
        for finger in range(2):
            tube('CaterpillarFinger', [wrist, (wrist[0] - side * .05, wrist[1] + finger * .025,
                                             wrist[2] + .018)], .01, 'CaterpillarLight', arm)
        caterpillar_arms.append(arm)
for i, p in enumerate(tail_points[:4]):
    for side in [-1, 1]:
        ball('CaterpillarFoot', (p[0] + side * .095, p[1] - .095, p[2] + .1),
             (.045, .04, .07), 'CaterpillarLight', caterpillar)

caterpillar_head = pivot('CaterpillarHead', (0, .60, .012), caterpillar)
ball('CaterpillarFace', (0, 0, 0), (.20, .22, .19), 'CaterpillarBlue', caterpillar_head)
ball('CaterpillarMuzzle', (0, -.08, .155), (.15, .10, .07), 'CaterpillarLight', caterpillar_head)
caterpillar_jaw = pivot('CaterpillarJaw', (0, -.105, .16), caterpillar_head)
ball('CaterpillarLip', (0, 0, .03), (.055, .016, .028), 'CaterpillarStripe', caterpillar_jaw)
caterpillar_lids = []
for side in [-1, 1]:
    x = side * .082
    ball('CaterpillarEye', (x, .035, .165), (.06, .07, .042), 'Linen', caterpillar_head)
    ball('CaterpillarIris', (x, .026, .202), (.035, .04, .014), 'IrisAmber', caterpillar_head)
    ball('CaterpillarPupil', (x, .024, .214), (.019, .027, .01), 'EyeInk', caterpillar_head)
    ball('CaterpillarGlint', (x - .009, .042, .222), (.006, .009, .005), 'EyeGlint', caterpillar_head)
    lid = pivot('CaterpillarLidL' if side < 0 else 'CaterpillarLidR',
                (x, .088, .207), caterpillar_head)
    ball('CaterpillarLid', (0, 0, 0), (.064, .023, .031), 'CaterpillarBlue', lid)
    caterpillar_lids.append(lid)
    tube('CaterpillarBrow', [(x - .046, .125, .175), (x, .135, .18),
                            (x + .042, .126, .178)], .012, 'CaterpillarStripe', caterpillar_head)
caterpillar_antennae = []
for side in [-1, 1]:
    antenna = pivot('CaterpillarAntennaL' if side < 0 else 'CaterpillarAntennaR',
                   (side * .11, .16, 0), caterpillar_head)
    tube('CaterpillarAntenna', [(0, 0, 0), (side * .045, .16, -.035),
                              (side * .07, .18, .015)], .018, 'CaterpillarStripe', antenna)
    ball('CaterpillarAntennaTip', (side * .07, .18, .015), (.031, .035, .031),
         'BrassDetail', antenna)
    caterpillar_antennae.append(antenna)
# Continuation of the original hookah, routed in front of the cap under the clock.
tube('CaterpillarHose', [(0, .493, .212), (.13, .47, .27), (.45, .19, .32),
                       (.84, .09, .14), (1.01, .23, -.48)],
     .023, 'CaterpillarStripe', caterpillar)
tube('CaterpillarMouthpiece', [(0, .493, .205), (.14, .465, .27)],
     .019, 'BrassDetail', caterpillar)


# The croquet actor is centered on the existing ball origin, radius about .3m.
hedgehog = pivot('HedgehogRig')
hedgehog['animal'] = 'hedgehog'
hedgehog_body = pivot('HedgehogBody', (0, 0, 0), hedgehog)
ball('HedgehogBack', (0, 0, -.02), (.24, .225, .265), 'HedgehogSpine', hedgehog_body)
ball('HedgehogBelly', (0, -.06, .035), (.215, .15, .23), 'HedgehogFur', hedgehog_body)
for i in range(112):
    # An even spiral covers the upper and rear body, leaving the face clear.
    angle = i * 2.399963
    up = .12 + .85 * (i + .5) / 112
    radial = math.sqrt(1 - up * up)
    direction = Vector((math.cos(angle) * radial, up, math.sin(angle) * radial))
    if direction.z > .53:
        continue
    start = (direction.x * .22, direction.y * .185, direction.z * .24 - .015)
    length = .060 + random.random() * .035
    mid = tuple(start[k] + direction[k] * length * .72 for k in range(3))
    end = tuple(start[k] + direction[k] * length for k in range(3))
    cone('HedgehogQuill', start, mid, .018, .006, 'HedgehogSpine', hedgehog_body)
    cone('HedgehogQuillTip', mid, end, .006, .0006, 'HedgehogTips', hedgehog_body)
hedgehog_head = pivot('HedgehogHead', (0, -.015, .185), hedgehog_body)
ball('HedgehogCheeks', (0, 0, .015), (.155, .12, .125), 'HedgehogFace', hedgehog_head)
ball('HedgehogSnout', (0, -.025, .105), (.075, .068, .11), 'HedgehogFace', hedgehog_head)
hedgehog_nose = ball('HedgehogNose', (0, -.02, .20), (.04, .031, .025), 'EyeInk', hedgehog_head)
for side in [-1, 1]:
    ball('HedgehogEye', (side * .104, .042, .10), (.025, .027, .022), 'EyeInk', hedgehog_head)
    ball('HedgehogEyeShine', (side * .105 - .006, .054, .118), (.007, .008, .005), 'EyeGlint', hedgehog_head)
    ball('HedgehogEar', (side * .122, .094, -.006), (.052, .067, .031), 'HedgehogFur', hedgehog_head)
    ball('HedgehogInnerEar', (side * .122, .098, .018), (.032, .044, .009), 'HedgehogEar', hedgehog_head)
    for i in range(3):
        tube('HedgehogWhisker', [(side * .05, -.025, .15),
                               (side * (.13 + i * .006), -.028 + i * .017, .21)],
             .0018, 'HedgehogTips', hedgehog_head)
hedgehog_feet = []
for side in [-1, 1]:
    for z in [-.13, .125]:
        foot = pivot('HedgehogFoot' + str(len(hedgehog_feet)), (side * .145, -.165, z), hedgehog_body)
        ball('HedgehogPaw', (0, 0, 0), (.049, .048, .075), 'HedgehogFur', foot)
        for i in range(3):
            ball('HedgehogClaw', ((i - 1) * .02, -.012, .06), (.009, .01, .024), 'HedgehogTips', foot)
        hedgehog_feet.append(foot)


def make_clip(name, duration, objects, pose):
    """Each NLA track name becomes one glTF clip across articulated nodes."""
    base = {o.name: (o.location.copy(), o.rotation_euler.copy(), o.scale.copy()) for o in objects}
    for o in objects:
        o.animation_data_create()
        o.animation_data.action = None
        for track in o.animation_data.nla_tracks:
            track.mute = True
    frames = sorted(set(range(1, duration + 1, 2)) | {duration})
    for frame in frames:
        seconds = (frame - 1) / 24
        phase = (frame - 1) / (duration - 1) * math.tau
        for o in objects:
            o.location, o.rotation_euler, o.scale = base[o.name]
        pose(seconds, phase)
        for o in objects:
            for path in ['location', 'rotation_euler', 'scale']:
                o.keyframe_insert(data_path=path, frame=frame)
    for o in objects:
        action = o.animation_data.action
        action.name = name + '_' + o.name
        track = o.animation_data.nla_tracks.new()
        track.name = name
        track.strips.new(name, 1, action)
        track.mute = True
        o.animation_data.action = None
        o.location, o.rotation_euler, o.scale = base[o.name]


def blink(seconds, at, width=.13):
    return max(0, 1 - abs(seconds - at) / width)


def frog_pose(seconds, phase, speaking=False):
    frog_body.location.z += math.sin(phase) * .01
    frog_head.rotation_euler.z = math.sin(phase) * .035
    frog_head.rotation_euler.x = math.sin(phase * 2) * .017
    frog_throat.scale.z *= 1 + .055 * math.sin(phase * 2)
    if speaking:
        syllable = max(0, math.sin(seconds * 16)) * (.4 + .6 * math.sin(seconds * 4) ** 2)
        frog_jaw.rotation_euler.x = syllable * .22
        frog_jaw.location.z -= syllable * .024
        frog_throat.scale.z *= 1 + syllable * .09
        frog_head.rotation_euler.x += math.sin(phase * 2) * .05
    for i, arm in enumerate(frog_arms):
        arm.rotation_euler.y = math.sin(phase) * .009 * (-1 if i == 0 else 1)
    for lid in frog_lids:
        closure = max(blink(seconds, 2.15), blink(seconds, 2.48, .09))
        lid.location.z -= closure * .101
        lid.scale.z = 1 + closure * 3.75


frog_nodes = [frog_body, frog_head, frog_jaw, frog_throat, *frog_arms, *frog_lids]
make_clip('FrogIdle', 145, frog_nodes, frog_pose)
make_clip('FrogSpeak', 145, frog_nodes, lambda s, p: frog_pose(s, p, True))


def caterpillar_pose(seconds, phase, speaking=False):
    for i, segment in enumerate(caterpillar_segments):
        segment.rotation_euler.y = math.sin(phase + i * .38) * .035
        segment.scale.z = 1 + math.sin(phase + i * .32) * .018
    caterpillar_head.rotation_euler.z = math.sin(phase) * .045
    caterpillar_head.rotation_euler.x = math.sin(phase * 2) * .023
    for i, antenna in enumerate(caterpillar_antennae):
        antenna.rotation_euler.y = math.sin(phase + i * .9) * .085
        antenna.rotation_euler.x = math.sin(phase * 2 + i) * .06
    for i, arm in enumerate(caterpillar_arms):
        arm.rotation_euler.x = math.sin(phase + i * .45) * .05
        if speaking and i == 4:
            arm.rotation_euler.y -= math.sin(phase / 2) ** 2 * .65
            arm.rotation_euler.x -= math.sin(phase / 2) ** 2 * .45
    if speaking:
        caterpillar_jaw.location.z -= max(0, math.sin(seconds * 12)) * .026
    for lid in caterpillar_lids:
        closure = blink(seconds, 3.2, .22)
        lid.location.z -= closure * .052
        lid.scale.z = 1 + closure * 2.5


caterpillar_nodes = [*caterpillar_segments, caterpillar_head, caterpillar_jaw,
                     *caterpillar_antennae, *caterpillar_arms, *caterpillar_lids]
make_clip('CaterpillarIdle', 169, caterpillar_nodes, caterpillar_pose)
make_clip('CaterpillarSpeak', 169, caterpillar_nodes, lambda s, p: caterpillar_pose(s, p, True))


def hedgehog_pose(seconds, phase, curled=False):
    if curled:
        hedgehog_head.location.y += .15
        hedgehog_head.location.z -= .028
        hedgehog_head.scale *= .63
        for foot in hedgehog_feet:
            foot.location.z += .10
            foot.scale *= .55
    else:
        hedgehog_body.scale.z *= 1 + math.sin(phase) * .018
        hedgehog_head.rotation_euler.z = math.sin(phase) * .075
        hedgehog_head.rotation_euler.x = math.sin(phase * 2) * .025
        hedgehog_nose.scale.z *= 1 + math.sin(seconds * 9) * .06


hedgehog_nodes = [hedgehog_body, hedgehog_head, hedgehog_nose, *hedgehog_feet]
make_clip('HedgehogIdle', 97, hedgehog_nodes, hedgehog_pose)
make_clip('HedgehogCurl', 25, hedgehog_nodes, lambda s, p: hedgehog_pose(s, p, True))

# Convert curves and merge pieces that share a pivot/material. The articulated
# hierarchy remains intact while a many-fingered character costs fewer draws.
bpy.ops.object.select_all(action='DESELECT')
for obj in list(bpy.context.scene.objects):
    if obj.type == 'CURVE':
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        bpy.ops.object.convert(target='MESH')
        obj.select_set(False)
groups = {}
for obj in bpy.context.scene.objects:
    if obj.type == 'MESH' and obj.data.users > 1:
        # Joining changes the active mesh. Keep cached sphere geometry from
        # inheriting geometry merged into a different limb or character.
        obj.data = obj.data.copy()
    if obj.type == 'MESH' and not obj.animation_data:
        groups.setdefault((obj.parent, obj.data.materials[0].name), []).append(obj)
for (parent, material), objects in groups.items():
    if len(objects) < 2:
        continue
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    bpy.context.object.name = parent.name + '_' + material
    bpy.context.object.select_set(False)

for obj in bpy.context.scene.objects:
    if obj.animation_data:
        for track in obj.animation_data.nla_tracks:
            track.mute = False
bpy.context.scene.render.fps = 24
bpy.context.scene.frame_start = 1
bpy.context.scene.frame_end = 169
bpy.context.scene.frame_set(1)
os.makedirs(os.path.join(ROOT, 'assets/blender'), exist_ok=True)
os.makedirs(os.path.join(ROOT, 'public/models'), exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, 'assets/blender', 'woodland-animals.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT, 'public/models', 'woodland-animals.glb'),
                          export_format='GLB', export_animations=True,
                          export_animation_mode='NLA_TRACKS', export_extras=True,
                          export_optimize_animation_size=True,
                          export_optimize_animation_keep_anim_object=True)
print('Exported frog, caterpillar and hedgehog with six articulated animation clips.', flush=True)
