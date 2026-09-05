"""Author an articulated White Rabbit and three reusable glTF animation clips."""
from pathlib import Path
code=Path(__file__).with_name('build_world.py').read_text().split("clear()\n# THE HALL")[0]
exec(compile(code,str(Path(__file__).with_name('build_world.py')),'exec'))
clear()
# All measurements below are Blender coordinates: X across, Y depth, Z up.
def pivot(name,loc,parent=None):
    o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=loc;o.parent=parent;return o
rig=pivot('RabbitRig',(0,0,0));body=pivot('Body',(0,0,.5),rig);head=pivot('Head',(0,-.015,.52),body)
# Anatomy and clothing are parented directly to their local articulated pivots.
ball('waistcoat body',(0,0,0),(.255,.32,.2),'teal',body)
ball('coat tails',(0,-.15,-.12),(.24,.2,.095),'teal',body)
ball('white shirt',(0,.12,.18),(.145,.22,.032),'ivory',body)
for x in [-.11,.11]:
    box('jacket lapel',(x,.19,.175),(.085,.22,.026),'blue',body,rot=x*3)
for y in [-.07,.05,.17]:ball('brass waistcoat button',(0,y,.222),(.022,.022,.012),'gold',body)
ball('head',(0,.055,0),(.23,.25,.19),'white',head)
for x in [-.083,.083]:
    ball('cheek',(x,-.037,.145),(.105,.085,.06),'white',head)
    ball('eye',(x,.095,.165),(.039,.052,.028),'ink',head)
    ball('eye glint',(x-.01,.112,.19),(.009,.012,.008),'white',head)
    ring('spectacle',(x,.088,.201),.073,.009,'gold',head,True)
    tube('brow',[(x-.045,.174,.165),(x,.186,.18),(x+.045,.175,.17)],.009,'ivory',head)
ball('nose',(0,-.012,.211),(.034,.024,.018),'pink',head)
tube('spectacle bridge',[(-.017,.1,.204),(.017,.1,.204)],.007,'gold',head)
tube('mouth',[(-.055,-.084,.181),(0,-.095,.198),(.055,-.084,.181)],.004,'wood',head)
for sign in [-1,1]:
    for i in range(3):tube('whisker',[(sign*.065,-.04,.19),(sign*.32,-.07+i*.032,.22)],.0025,'ivory',head)
# Neck bow tie and fluffy tail.
for sign in [-1,1]:ball('bow tie wing',(sign*.075,.3,.18),(.08,.045,.025),'red',body)
ball('bow knot',(0,.3,.206),(.028,.034,.02),'gold',body)
ball('tail',(0,-.12,-.225),(.12,.12,.12),'white',body)
ears=[]
for sign in [-1,1]:
    e=pivot('Ear_L' if sign<0 else 'Ear_R',(sign*.105,.015,.235),head)
    ball('outer ear',(0,.195,0),(.066,.235,.045),'white',e);ball('inner ear',(0,.2,.04),(.037,.175,.009),'pink',e);ears.append(e)
legs=[]
for sign in [-1,1]:
    leg=pivot('Leg_L' if sign<0 else 'Leg_R',(sign*.145,0,.3),rig)
    ball('haunch',(0,0,0),(.105,.19,.105),'white',leg);ball('long foot',(0,-.19,.095),(.105,.07,.18),'white',leg);legs.append(leg)
arms=[]
for sign in [-1,1]:
    arm=pivot('Arm_L' if sign<0 else 'Arm_R',(sign*.25,-.005,.18),body)
    ball('jacket sleeve',(0,-.11,0),(.075,.16,.075),'teal',arm)
    cylinder('white cuff',(0,-.24,0),.066,.07,'white',arm)
    ball('paw',(0,-.3,.018),(.06,.079,.065),'white',arm);arms.append(arm)
# The right hand holds the watch; its case, face and hands remain attached while animated.
watch=pivot('PocketWatch',(.035,-.08,-.27),arms[1])
clockface('watch',0,0,0,3,10,watch,.12)
tube('watch chain',[(0,.08,.2),(.14,-.04,.21),(.28,-.14,.12)],.008,'gold',body)
# Export clips from NLA tracks, with independently keyed articulated nodes.
animated=[body,head,*ears,*legs,*arms]
base={o.name:(o.location.copy(),o.rotation_euler.copy(),o.scale.copy()) for o in animated}
for clip,duration in [('Idle',72),('Hop',24),('CheckWatch',96)]:
    bpy.context.scene.frame_start=1;bpy.context.scene.frame_end=duration
    for o in animated:
        o.animation_data_create();o.animation_data.action=None;o.location,o.rotation_euler,o.scale=base[o.name]
    for f in range(1,duration+1,3):
        t=(f-1)/(duration-1);a=t*math.tau
        for o in animated:o.location,o.rotation_euler,o.scale=base[o.name]
        if clip=='Hop':
            hop=max(0,math.sin(a));body.location.z+=hop*.15;body.rotation_euler.x=-.12+math.sin(a)*.12
            body.scale.z=1-.07*max(0,-math.sin(a));head.rotation_euler.x=math.sin(a-.35)*.09
            for i,leg in enumerate(legs):leg.rotation_euler.x=math.sin(a+.45)*.65;leg.location.z+=hop*.12
            for i,arm in enumerate(arms):arm.rotation_euler.x=-math.sin(a)*.38
            for i,e in enumerate(ears):e.rotation_euler.x=math.sin(a-.6)*.22;e.rotation_euler.y=(-.13 if i==0 else .13)
        elif clip=='CheckWatch':
            look=math.sin(math.pi*t)**2;head.rotation_euler.x=look*.5;head.rotation_euler.z=-look*.16
            arms[1].rotation_euler.x=-look*1.3;arms[1].rotation_euler.y=look*.35
            for i,e in enumerate(ears):e.rotation_euler.x=-look*.16;e.rotation_euler.y=(-.08 if i==0 else .12)
        else:
            body.location.z+=math.sin(a)*.012;body.scale.z=1+math.sin(a)*.014
            head.rotation_euler.z=math.sin(a)*.055
            for i,e in enumerate(ears):e.rotation_euler.y=math.sin(a+i)*.075;e.rotation_euler.x=math.sin(a*2+i)*.04
            for arm in arms:arm.rotation_euler.x=math.sin(a)*.025
        for o in animated:
            o.keyframe_insert(data_path='location',frame=f);o.keyframe_insert(data_path='rotation_euler',frame=f);o.keyframe_insert(data_path='scale',frame=f)
    for o in animated:
        action=o.animation_data.action;action.name=clip+'_'+o.name
        track=o.animation_data.nla_tracks.new();track.name=clip;track.strips.new(clip,1,action);o.animation_data.action=None
# Restore a clean rest pose. NLA clips with matching track names export as coherent animations.
for o in animated:o.location,o.rotation_euler,o.scale=base[o.name]
bpy.context.scene.render.fps=24;bpy.context.scene.frame_set(1)
os.makedirs(os.path.join(ROOT,'assets/blender'),exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'assets/blender','white-rabbit.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT,'public/models','white-rabbit.glb'),export_format='GLB',export_animations=True,export_animation_mode='NLA_TRACKS',export_extras=True)
print('Authored articulated rabbit with Idle, Hop and CheckWatch clips.',flush=True)
