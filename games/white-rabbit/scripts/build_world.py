"""Rebuild the original Wonderland environments and props with Blender.
Coordinates in the helpers match Three.js: X across, Y up, Z depth.
"""
import bpy, math, random, os
from mathutils import Vector
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
random.seed(32)

def xyz(p): return (p[0], -p[2], p[1])
def material(name, color, metallic=0, rough=.55, emission=0):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF'); bs.inputs['Base Color'].default_value=(*color,1)
    bs.inputs['Metallic'].default_value=metallic; bs.inputs['Roughness'].default_value=rough
    if emission:
        bs.inputs['Emission Color'].default_value=(*color,1); bs.inputs['Emission Strength'].default_value=emission
    return m
M={}
for n,c,metal,rough,em in [
 ('teal',(.035,.15,.145),0,.7,0),('panel',(.045,.22,.2),0,.6,0),('dark',(.024,.05,.055),0,.6,0),
 ('gold',(.68,.42,.13),.72,.3,0),('brass',(.32,.22,.095),.7,.42,0),('ivory',(.78,.72,.56),0,.55,0),
 ('cream',(.91,.86,.7),0,.4,0),('blacktile',(.065,.11,.115),.15,.3,0),('whitetile',(.58,.62,.53),.1,.4,0),
 ('wood',(.13,.057,.025),0,.6,0),('oak',(.3,.15,.055),0,.48,0),('red',(.42,.045,.053),0,.6,0),
 ('rose',(.72,.08,.15),0,.65,0),('blue',(.06,.25,.36),.1,.36,0),('violet',(.3,.11,.42),0,.5,0),
 ('leaf',(.07,.22,.105),0,.9,0),('leaflight',(.2,.36,.13),0,.9,0),('hedge',(.06,.17,.11),0,1,0),
 ('grass',(.12,.21,.13),0,1,0),('soil',(.14,.12,.075),0,1,0),('stone',(.38,.43,.37),0,.9,0),
 ('pink',(.76,.33,.39),0,.55,0),('glow',(.92,.63,.23),.1,.3,2),('window',(.4,.68,.65),0,.4,.55),
 ('white',(.9,.87,.8),0,.6,0),('ink',(.01,.019,.02),0,.8,0),('orange',(.9,.38,.05),0,.5,0),
 ('mint',(.09,.6,.36),0,.5,0),('magenta',(.68,.055,.4),0,.5,0)
]: M[n]=material(n,c,metal,rough,em)
CACHE={}

def mesh_obj(name,verts,faces,mat,parent=None):
    mesh=bpy.data.meshes.new(name); mesh.from_pydata(verts,[],faces); mesh.update()
    ob=bpy.data.objects.new(name,mesh); bpy.context.collection.objects.link(ob); ob.data.materials.append(M[mat])
    if parent: ob.parent=parent
    return ob

def empty(name):
    ob=bpy.data.objects.new(name,None); bpy.context.collection.objects.link(ob); ob['hotspot']=name; return ob

def box(name,p,s,mat,parent=None,rot=0):
    x,y,z=s; vs=[(-x/2,-z/2,-y/2),(x/2,-z/2,-y/2),(x/2,z/2,-y/2),(-x/2,z/2,-y/2),(-x/2,-z/2,y/2),(x/2,-z/2,y/2),(x/2,z/2,y/2),(-x/2,z/2,y/2)]
    o=mesh_obj(name,vs,[(0,3,2,1),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,6,7)],mat,parent); o.location=xyz(p);o.rotation_euler.z=-rot;return o

def ball(name,p,s,mat,parent=None):
    key=('ball',mat)
    if key not in CACHE:
        bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8); ob=bpy.context.object; ob.data.materials.append(M[mat]); CACHE[key]=ob.data; bpy.data.objects.remove(ob,do_unlink=True)
    o=bpy.data.objects.new(name,CACHE[key]);bpy.context.collection.objects.link(o);o.location=xyz(p);o.scale=(s[0],s[2],s[1]);o.parent=parent
    for po in o.data.polygons:po.use_smooth=True
    return o

def cylinder(name,p,r,h,mat,parent=None,top=None):
    n=24; rt=r if top is None else top
    vs=[(rr*math.cos(i*2*math.pi/n),rr*math.sin(i*2*math.pi/n),zz) for zz,rr in [(-h/2,r),(h/2,rt)] for i in range(n)]
    fs=[tuple(reversed(range(n))),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    o=mesh_obj(name,vs,fs,mat,parent);o.location=xyz(p)
    for po in o.data.polygons:po.use_smooth= len(po.vertices)==4
    return o

def tube(name,pts,r,mat,parent=None):
    # Transport the previous ring's normal along the path. Choosing a fresh
    # axis at each point twisted the rings and tore the appearance of arches.
    clean=[]
    for p in pts:
        v=Vector(xyz(p))
        if not clean or (v-clean[-1]).length>1e-6: clean.append(v)
    pts=clean; verts=[]; faces=[]; n=8; previous=None
    for i,p in enumerate(pts):
        d=(pts[min(i+1,len(pts)-1)]-pts[max(i-1,0)]).normalized()
        if previous is None:
            ref=Vector((0,0,1)) if abs(d.z)<.95 else Vector((1,0,0));a=d.cross(ref).normalized()
        else: a=(previous-d*previous.dot(d)).normalized()
        if a.length<1e-6: a=d.cross(Vector((0,1,0))).normalized()
        b=d.cross(a).normalized();previous=a
        for j in range(n):verts.append(tuple(p+r*(a*math.cos(j*math.tau/n)+b*math.sin(j*math.tau/n))))
        if i:
            for j in range(n): faces.append(((i-1)*n+j,(i-1)*n+(j+1)%n,i*n+(j+1)%n,i*n+j))
    return mesh_obj(name,verts,faces,mat,parent)

def ring(name,p,r,t,mat,parent=None,vertical=False):
    pts=[]
    for i in range(49):
        a=i/48*math.tau;pts.append((p[0]+r*math.cos(a),p[1]+r*math.sin(a) if vertical else p[1],p[2] if vertical else p[2]+r*math.sin(a)))
    return tube(name,pts,t,mat,parent)

def text_obj(name,txt,p,size,mat='cream',parent=None,rot=0):
    cv=bpy.data.curves.new(name,'FONT');cv.body=txt;cv.align_x='CENTER';cv.size=size;cv.extrude=.0015
    ob=bpy.data.objects.new(name,cv);bpy.context.collection.objects.link(ob);ob.location=xyz(p);ob.rotation_euler=(math.pi/2,0,-rot);cv.materials.append(M[mat]);ob.parent=parent;return ob

def arch(name,x,z,w,h,mat='gold',parent=None,base=0):
    r=w/2; shoulder=h-r
    pts=[(x-r,base,z),(x-r,base+shoulder,z)]
    for i in range(25):
        a=math.pi-i/24*math.pi;pts.append((x+r*math.cos(a),base+shoulder+r*math.sin(a),z))
    pts.append((x+r,base,z));tube(name,pts,.065,mat,parent)

def plaque(name,txt,p,w=1.8,parent=None):
    box(name,p,(w,.55,.11),'brass',parent);box(name,(p[0],p[1],p[2]+.065),(w-.08,.47,.03),'dark',parent)
    text_obj(name,txt,(p[0],p[1]-.055,p[2]+.09),.115,'cream',parent)

def pedestal(p,parent=None):
    cylinder('plinth foot',(p[0],.12,p[2]),.64,.24,'dark',parent)
    cylinder('fluted pedestal',(p[0],.65,p[2]),.39,1.05,'teal',parent)
    for i in range(12):
        a=i/12*math.tau;cylinder('gilt flute',(p[0]+.385*math.cos(a),.65,p[2]+.385*math.sin(a)),.018,.9,'gold',parent)
    cylinder('plinth capital',(p[0],1.2,p[2]),.6,.18,'brass',parent)

def table(x,z,w=3,d=1.7,parent=None,y=1.05):
    box('table top',(x,y,z),(w,.17,d),'oak',parent);box('gilt apron',(x,y-.18,z),(w-.14,.19,d-.14),'gold',parent)
    for dx in [-w/2+.22,w/2-.22]:
        for dz in [-d/2+.22,d/2-.22]:
            cylinder('turned leg',(x+dx,y/2-.06,z+dz),.07,y-.2,'wood',parent)
            ball('leg bead',(x+dx,.68,z+dz),(.11,.11,.11),'brass',parent)

def clockface(name,x,y,z,hour,minute,parent=None,r=.45):
    ring('clock rim',(x,y,z),r,.06,'gold',parent,True)
    o=cylinder('clock ivory',(x,y,z-.02),r,.04,'cream',parent);o.rotation_euler.x=math.pi/2
    for n in range(1,13):
        a=n/12*math.tau;text_obj('clock numeral',str(n),(x+math.sin(a)*r*.78,y+math.cos(a)*r*.78-.03,z+.025),r*.14,'ink',parent)
    for a,l,t in [(hour/12*math.tau+minute/720*math.tau,.48,.021),(minute/60*math.tau,.68,.016)]:
        tube('clock hand',[(x,y,z+.06),(x+math.sin(a)*r*l,y+math.cos(a)*r*l,z+.06)],t,'ink',parent)
    ball('clock pin',(x,y,z+.08),(.04,.04,.025),'gold',parent);ring('watch loop',(x,y+r+.1,z),.09,.025,'gold',parent,True)

def lamp(x,z,y=3):
    tube('sconce arm',[(x,y-.25,z-.2),(x,y-.3,z+.1),(x,y,z+.15)],.045,'gold')
    cylinder('lantern',(x,y+.18,z+.15),.2,.43,'glow');cylinder('lantern hat',(x,y+.44,z+.15),.29,.13,'brass',top=.08)
    for a in range(4):cylinder('lantern edge',(x+.2*math.cos(a*math.pi/2),y+.18,z+.15+.2*math.sin(a*math.pi/2)),.016,.45,'brass')

def door(name,x,z,w,h,number='',mat='wood',parent=None,base=0,lock='',hinged=False):
    parent=parent or empty(name)
    leaf=parent
    if hinged:
        leaf=bpy.data.objects.new(name+'_leaf',None);bpy.context.collection.objects.link(leaf);leaf.parent=parent;leaf['doorLeaf']=name
    # Fit the actual panel to its arch instead of letting a rectangular slab
    # protrude above and through neighboring frames.
    outline=[(x-w/2,base),(x+w/2,base)]
    for i in range(25):
        a=i*math.pi/24;outline.append((x+w/2*math.cos(a),base+h-w/2+w/2*math.sin(a)))
    verts=[xyz((px,py,z+depth)) for depth in [-.08,.08] for px,py in outline];n=len(outline)
    mesh_obj('door panel',verts,[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)],mat,leaf)
    arch('arched door frame',x,z+.13,w+.12,h+.1,'gold',parent,base)
    box('door inset',(x,base+h*.39,z+.1),(w*.74,h*.54,.035),'panel',leaf)
    for dx in [-w*.38,w*.38]:box('door molding',(x+dx,base+h*.39,z+.135),(.025,h*.54,.025),'gold',leaf)
    for dy in [h*.12,h*.66]:box('door molding',(x,base+dy,z+.135),(w*.76,.025,.025),'gold',leaf)
    ball('door knob',(x+w*.27,base+h*.4,z+.2),(.055,.055,.045),'gold',leaf)
    if number: text_obj('door number',number,(x,base+h*.75,z+.17),.16,'cream',leaf)
    if lock=='triangle':
        # Model the keyway itself, not a font glyph that can disappear or sit
        # inside the door panel. Its three sides match the high-table key.
        cx=x-.12;cy=base+h*.4;zz=z+.155
        box('keyway plate',(cx,cy,zz),(.24,.26,.045),'brass',leaf)
        points=[(cx,cy+.077,zz+.032),(cx-.071,cy-.052,zz+.032),(cx+.071,cy-.052,zz+.032)]
        mesh_obj('triangular keyway',[xyz(p) for p in points],[(0,1,2)],'ink',leaf)
        tube('triangular keyway edge',points+[points[0]],.01,'gold',leaf)
    elif lock: text_obj('lock shape',lock,(x-.12,base+h*.4-.045,z+.16),.15,'gold',leaf)
    if hinged:
        # Keep the exported pivot on the hinge, with all decorations attached.
        anchor=Vector(xyz((x-w/2,base,z)))
        for child in leaf.children: child.location-=anchor
        leaf.location=anchor
        if name!='small_door':box('dark passage',(x,base+h*.45,z-.1),(w*.9,h*.9,.025),'dark',parent)
        else:parent['passageHeight']=h;parent['passageWidth']=w
    return parent

def cup(p,parent=None,mat='cream',s=1):
    cylinder('saucer',p,.25*s,.035*s,'cream',parent)
    cylinder('teacup',(p[0],p[1]+.13*s,p[2]),.11*s,.23*s,mat,parent,top=.18*s)
    cylinder('tea',(p[0],p[1]+.25*s,p[2]),.155*s,.009,'wood',parent)
    ring('cup handle',(p[0]+.19*s,p[1]+.15*s,p[2]),.095*s,.028*s,'gold',parent,True)
    ring('cup rim',(p[0],p[1]+.25*s,p[2]),.18*s,.017*s,'gold',parent)

def mushroom(x,z,s=1,mat='red',parent=None,spots=11):
    cylinder('mushroom stem',(x,.5*s,z),.17*s,s,'ivory',parent,top=.13*s)
    ball('mushroom cap',(x,1.07*s,z),(.76*s,.3*s,.76*s),mat,parent)
    for k in range(spots):
        a=k*2.4;rad=.64*math.sqrt((k+.5)/spots);y=1.07+.3*math.sqrt(1-(rad/.76)**2);ball('cap spot',(x+math.cos(a)*rad*s,(y+.012)*s,z+math.sin(a)*rad*s),(.052*s,.022*s,.052*s),'cream',parent)

def rabbit(p,parent=None,s=1):
    x,y,z=p;ball('rabbit body',(x,y+.42*s,z),(.3*s,.4*s,.26*s),'ivory',parent);ball('waistcoat',(x,y+.38*s,z+.04*s),(.31*s,.29*s,.26*s),'teal',parent)
    ball('rabbit head',(x,y+.84*s,z),(.26*s,.26*s,.23*s),'white',parent)
    for dx in [-.13,.13]:
        ball('rabbit ear',(x+dx*s,y+1.18*s,z),(.082*s,.32*s,.068*s),'white',parent);ball('ear pink',(x+dx*s,y+1.19*s,z+.058*s),(.04*s,.23*s,.015*s),'pink',parent)
        ball('rabbit eye',(x+dx*s,y+.9*s,z+.21*s),(.027*s,.041*s,.018*s),'ink',parent)
        ball('rabbit foot',(x+dx*s,y+.07*s,z+.12*s),(.12*s,.085*s,.22*s),'white',parent)
    ball('rabbit nose',(x,y+.79*s,z+.25*s),(.035*s,.027*s,.023*s),'pink',parent)
    tube('watch chain',[(x,y+.55*s,z+.28*s),(x+.2*s,y+.38*s,z+.29*s),(x+.24*s,y+.58*s,z+.23*s)],.012*s,'gold',parent)

def tree(x,z,s=1):
    tube('tree trunk',[(x,0,z),(x-.22*s,2*s,z+.1),(x+.1*s,4*s,z),(x-.3*s,5*s,z)],.24*s,'wood')
    for k in range(6):
        a=k*2.4;end=(x+math.cos(a)*2.3*s,(4.2+random.random())*s,z+math.sin(a)*2.3*s)
        tube('branch',[(x,2.8*s,z),((x+end[0])/2,3.8*s,(z+end[2])/2),end],.09*s,'wood')
        ball('tree canopy',end,(1.65*s,1.1*s,1.5*s),'leaf' if k%2 else 'leaflight')

def flower(x,z,white=False,parent=None):
    h=random.uniform(.5,.95);tube('rose stem',[(x,0,z),(x-.04,h*.5,z),(x,h,z)],.018,'leaf',parent)
    for k in range(5):
        a=k/5*math.tau;ball('rose petal',(x+math.cos(a)*.08,h,z+math.sin(a)*.08),(.095,.08,.08),'white' if white else 'rose',parent)
    ball('rose center',(x,h+.05,z),(.07,.065,.07),'cream' if white else 'red',parent)
    for dx in [-1,1]:ball('rose leaf',(x+dx*.13,h*.5,z),(.18,.035,.07),'leaflight',parent)

def guard(name,x,z,variant=False,parent=None,suit='♥'):
    g=parent or empty(name)
    for dx in [-.17,.17]:
        cylinder('guard leg',(x+dx,.47,z),.085,.8,'ivory',g);ball('boot',(x+dx,.1,z+.12),(.13,.12,.24),'wood',g)
    box('guard tunic',(x,1.05,z),(.72,.7,.36),'leaf',g)
    box('jacket border',(x, .72,z+.195),(.72,.055,.025),'gold' if variant else 'red',g)
    ball('guard head',(x,1.67,z),(.26,.29,.23),'ivory',g)
    cylinder('guard hat',(x,1.99,z),.3,.15,'leaf',g,top=.35)
    ring('hat band',(x,1.93,z),.3,.03,'gold' if variant else 'red',g)
    for dx in [-.09,.09]:ball('guard eye',(x+dx,1.71,z+.225),(.022,.027,.02),'ink',g)
    if variant: tube('moustache',[(x-.13,1.6,z+.24),(x,1.62,z+.26),(x+.13,1.6,z+.24)],.025,'wood',g)
    for dx in [-.46,.46]:
        cylinder('guard arm',(x+dx,1.12,z),.085,.57,'leaf',g);ball('glove',(x+dx,.8,z),(.1,.12,.1),'gold' if variant else 'white',g)
    cylinder('halberd',(x+.59,1.2,z),.025,2.35,'oak',g)
    blade=[(.05,-.2),(.05,.2),(.28,.28),(.18,.13),(.16,0),(.19,-.12),(.29,-.22)] if not variant else [(.05,-.2),(.05,.2),(.29,.24),(.28,.1),(.27,-.04),(.28,-.16),(.3,-.22)]
    verts=[xyz((x+.59+dx,2.19+dy,z+dz)) for dz in [-.022,.022] for dx,dy in blade];n=len(blade)
    mesh_obj('halberd blade',verts,[tuple(range(n)),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)],'ivory',g)
    heart=text_obj('heart emblem',suit,(x,1.12,z+.195),.48,'cream' if suit=='♠' else 'gold' if variant else 'red',g)
    if variant: heart.rotation_euler.y=math.pi;heart.location.z+=.28
    box('sash',(x,1.12,z+.202),(.13,.72,.025),'red',g,rot=-.15)
    return g

def character(name,x,z,role,parent):
    actor=bpy.data.objects.new('actor_'+name,None);bpy.context.collection.objects.link(actor);actor.parent=parent;actor.location=xyz((x,0,z));actor['actor']=role
    cloth='red' if role=='queen' else 'blue' if role=='hatter' else 'ivory'
    cylinder(name+' coat',(0,.78,0),.36,1.05,cloth,actor,top=.24)
    for dx in [-.14,.14]:ball(name+' shoe',(dx,.14,.13),(.14,.12,.24),'wood',actor)
    if role=='cook':box('cook apron',(0,.85,.33),(.45,.7,.035),'white',actor)
    head=bpy.data.objects.new(name+'_head',None);bpy.context.collection.objects.link(head);head.parent=actor;head.location=xyz((0,1.53,0));head['motion']='head'
    ball(name+' face',(0,0,0),(.25,.29,.23),'ivory',head)
    for dx in [-.087,.087]:
        ball(name+' eye',(dx,.055,.217),(.025,.037,.02),'ink',head)
        tube(name+' eyebrow',[(dx-.045,.115,.215),(dx,.135,.23),(dx+.04,.115,.215)],.009,'wood',head)
    ball(name+' nose',(0,-.01,.25),(.055,.058,.065),'pink',head)
    tube(name+' mouth',[(-.065,-.11,.215),(0,-.13,.235),(.065,-.11,.215)],.006,'red',head)
    if role=='cook':
        cylinder('chef hat band',(0,.29,0),.25,.18,'white',head)
        for dx in [-.16,0,.16]:ball('chef hat puff',(dx,.43,0),(.15,.15,.18),'white',head)
    elif role=='hatter':
        cylinder('hatter brim',(0,.29,0),.39,.07,'wood',head);cylinder('hatter crown',(0,.58,0),.27,.55,'red',head,top=.33)
        box('hat price',(0,.55,.282),(.35,.22,.024),'cream',head);text_obj('hat distraction','10/6',(0,.51,.3),.12,'ink',head)
        for side in [-1,1]:ball('hatter bow',(side*.1,1.26,.22),(.11,.07,.04),'orange',actor)
    else:
        for dx in [-.18,.18]:ball('queen hair',(dx,.09,-.05),(.18,.28,.23),'red',head)
        cylinder('queen crown',(0,.31,0),.23,.12,'gold',head)
        for i in range(5):
            a=i*math.tau/5;cylinder('crown point',(.2*math.cos(a),.43,.2*math.sin(a)),.055,.2,'gold',head,top=0)
        text_obj('royal heart','♥',(0,.93,.36),.4,'gold',actor)
    for side in [-1,1]:
        arm=bpy.data.objects.new(name+'_arm_'+str(side),None);bpy.context.collection.objects.link(arm);arm.parent=actor;arm.location=xyz((side*.28,1.16,0));arm['motion']='arm';arm['side']=side
        cylinder('sleeve',(0,-.18,0),.09,.4,cloth,arm);ball('hand',(0,-.41,.045),(.075,.09,.07),'ivory',arm)
        if side==1 and role=='cook':tube('stirring spoon',[(0,-.4,.03),(0,-.72,.25)],.025,'oak',arm)
    return actor

def clear():
    CACHE.clear()
    for ob in list(bpy.data.objects):bpy.data.objects.remove(ob,do_unlink=True)

def checkpoint(): return set(bpy.context.scene.objects)
def shift_new(before,dx,dz):
    for ob in set(bpy.context.scene.objects)-before:
        if ob.parent is None: ob.location.x+=dx;ob.location.y-=dz

def export(name):
    os.makedirs(os.path.join(ROOT,'assets/blender'),exist_ok=True)
    os.makedirs(os.path.join(ROOT,'public/models'),exist_ok=True)
    # Merge static meshes by material; interactive objects keep their parent IDs.
    groups={}
    for o in list(bpy.context.scene.objects):
        if o.type=='FONT':
            bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)
        if o.type=='MESH' and o.parent is None: groups.setdefault(o.data.materials[0].name,[]).append(o)
    for mat,objects in groups.items():
        if len(objects)<2:continue
        bpy.ops.object.select_all(action='DESELECT')
        for o in objects:o.select_set(True)
        bpy.context.view_layer.objects.active=objects[0];objects[0].data=objects[0].data.copy();bpy.ops.object.join();objects[0].name='architecture_'+mat
    bpy.ops.object.select_all(action='DESELECT')
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'assets/blender',name+'.blend'))
    bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT,'public/models',name+'.glb'),export_format='GLB',export_extras=True,export_yup=True)
    print('EXPORTED',name,flush=True)

clear()
# THE HALL. Tall teal panels, warm brass, checkerboard stone and an impossible door wall.
box('foundation',(0,-.2,0),(18,.4,24),'dark')
for x in range(-9,9):
    for z in range(-12,12):box('checker',(x+.5,.012,z+.5),(.995,.025,.995),'blacktile' if (x+z)%2 else 'whitetile')
for x in [-9,9]:
    box('wall',(x,4,0),(.3,8,24),'teal');box('lower panel',(x*.983,.85,0),(.1,1.7,24),'panel')
    for y in [.12,1.65,1.76,7.5,7.7]:box('long molding',(x*.978,y,0),(.13,.07,24),'gold')
    for z in range(-11,13,3):box('wall pilaster',(x*.977,4,z),(.15,7.5,.16),'brass')
for lo,hi in [(-9,-2.8),(-2,9)]:
    box('back wall',((lo+hi)/2,4,-12),(hi-lo,8,.35),'teal')
    box('back wainscot',((lo+hi)/2,.8,-11.8),(hi-lo,1.6,.1),'panel')
    box('back molding',((lo+hi)/2,.12,-11.72),(hi-lo,.07,.12),'gold')
box('wall above passage',(-2.4,4.43,-12),(.8,7.14,.35),'teal')
box('panel above passage',(-2.4,1.25,-11.8),(.8,.7,.1),'panel')
for y in [1.65,1.76,7.5,7.7]:box('back molding',(0,y,-11.72),(18,.07,.12),'gold')
box('passage floor',(-2.4,-.02,-12.4),(.8,.06,2.8),'whitetile')
for x in [-2.87,-1.93]:box('passage side',(x,1.8,-13.05),(.15,3.6,2),'teal')
box('passage end',(-2.4,1.8,-14.1),(1.05,3.6,.15),'teal')
ring('passage skylight',(-2.4,3.4,-12.8),.33,.03,'glow')
for x in range(-8,9,2):
    box('back panel edge',(x,.85,-11.69),(.04,1.5,.06),'gold')
    if abs(x)>3:box('pilaster',(x,4.65,-11.73),(.14,5.65,.15),'brass')
# Window-shaped luminous recesses on both flanks.
for x in [-8.8,8.8]:
    for z in [-8,-2,4,10]:
        box('tall window',(x,4.65,z),(.06,4.1,1.7),'window')
        for dz in [-.9,0,.9]:box('window mullion',(x*.994,4.65,z+dz),(.08,4.3,.04),'brass')
        for y in [2.5,3.8,5.2,6.8]:box('window crossbar',(x*.994,y,z),(.08,.06,1.85),'brass')
        for dz in [-1.2,1.2]:box('velvet curtain',(x*.985,4.5,z+dz),(.22,5,.4),'red')
# Coffered ceiling, leaving front open for cinematic camera.
box('ceiling',(0,8,0),(18,.18,24),'dark')
for x in range(-9,10,3):box('ceiling rib',(x,7.84,0),(.12,.16,24),'brass')
for z in range(-12,13,3):box('ceiling rib',(0,7.84,z),(18,.16,.12),'brass')
for z in [-6,4]:
    cylinder('chandelier chain',(0,6.8,z),.025,2,'gold');ring('chandelier',(0,5.8,z),1.35,.07,'gold')
    for k in range(10):
        a=k/10*math.tau;x=math.cos(a)*1.35;zz=z+math.sin(a)*1.35;cylinder('candle',(x,6,zz),.06,.37,'cream');ball('flame',(x,6.25,zz),(.047,.095,.047),'glow')
# Five separate little doors rise along the two sides of an A. Their bases,
# rather than their heights, move upward, leaving space between every frame.
for x,base,num,lock in [(-2.4,0,'6','triangle'),(2.4,0,'9','□'),(-1.2,1.7,'2','○'),(1.2,1.7,'4','☆'),(0,3.4,'7','◊')]:
    door('small_door' if num=='6' else 'door_'+num,x,-11.48,.7,.82,num,base=base,lock=lock,hinged=True)
box('door crossbar',(0,2.1,-11.4),(1.45,.08,.07),'gold')
# Main puzzle props.
g=empty('story');table(-4.8,4,2.8,1.5,g);box('book cover',(-4.8,1.19,4),(1.6,.1,1.04),'red',g);box('open pages',(-4.8,1.27,4),(1.43,.07,.94),'ivory',g);plaque('story label','THE UNFINISHED STORY',(-4.8,1.8,3.67),2.5,g)
for i in range(7):box('page script',(-4.8,1.315,3.7+i*.09),(1.15,.008,.012),'wood',g)
g=empty('shadow');pedestal((4.8,0,4),g);text_obj('rotating letter','M',(4.8,1.65,4.05),.8,'gold',g);plaque('shadow clue','TURN ME. REMEMBER MY SHADOW.',(4.8,.87,4.45),2.8,g)
g=empty('arithmetic');box('blackboard frame',(-5.1,2.35,-6.6),(3.15,2,.15),'gold',g);box('blackboard',(-5.1,2.35,-6.49),(3,1.85,.08),'dark',g)
for i,t in enumerate(['4 × 5 = 12','4 × 6 = 13','4 × 7 = 14','4 × ? = 20']):text_obj('chalk equation',t,(-5.1,2.95-i*.38,-6.43),.24,'cream',g)
for dx in [-1.3,1.3]:box('board leg',(-5.1+dx,1,-6.65),(.12,2,.12),'wood',g)
g=empty('letter');plaque('name plaque','L I C E',(0,.9,-11.28),1.35,g)
g=empty('biscuit');table(-5.5,-1.6,2,1.2,g);cylinder('plate',(-5.5,1.17,-1.6),.44,.05,'cream',g);cylinder('biscuit',(-5.5,1.24,-1.6),.3,.12,'oak',g);plaque('eat label','EAT ME',(-5.5,1.6,-1.8),1.3,g)
g=empty('bottle');table(5.5,-1.6,2,1.2,g);cylinder('bottle',(5.5,1.42,-1.6),.21,.57,'blue',g,top=.12);cylinder('stopper',(5.5,1.76,-1.6),.1,.14,'gold',g);plaque('drink label','DRINK ME',(5.5,1.95,-1.85),1.6,g)
g=empty('key');table(5.3,-7,3.1,1.8,y=3.2);ring('key loop',(5.3,3.39,-7),.2,.05,'gold',g);tube('key shaft',[(5.3,3.4,-7),(5.3,3.4,-6.37)],.045,'gold',g);tube('triangle key bit',[(5.3,3.4,-6.53),(5.5,3.4,-6.38),(5.3,3.4,-6.22),(5.3,3.4,-6.53)],.045,'gold',g)
for i in range(1,6):
    y=i*.69;box('height mark',(7.55,y,-7),(.4,.03,.06),'gold');text_obj('height number',str(i*11),(7.2,y-.04,-6.95),.16,'cream')
g=empty('ceiling');ring('ceiling escape',(0,7.78,-3),1.2,.1,'gold',g);text_obj('ceiling clue','↑',(0,6.9,-3),.6,'glow',g)
for x in [-7,7]:
    for z in [-10,-4,2,8]:
        cylinder('planter',(x,.4,z),.45,.8,'dark',top=.6)
        for k in range(5):ball('topiary',(x+random.uniform(-.3,.3),1.25+random.random()*.4,z),(.4,.6,.4),'leaf')
for x in [-3.5,3.5,-7.5,7.5]:lamp(x,-11.4,3.7)
g=empty('rabbit');rabbit((1.8,0,3),g,1.3);clockface('rabbit watch',2.3,.7,3.35,3,0,g,.18)
export('hall')

clear()
# APPOINTMENTS IN THE GARDEN.
box('garden ground',(0,-.15,0),(66,.3,72),'grass')
for z in range(-31,31):
    for x in [-1,0,1]:box('old path',(x*1.08,.015,z*1.08),(.99,.06,1),'stone',rot=random.uniform(-.035,.035))
for x in [-29,29]:
    for z in [-29,-20,-10,0,10,21,30]:tree(x,z,1.1+random.random()*.4)
for z in [-32,32]:
    for x in [-23,-12,0,12,23]:tree(x,z,1.2)
for k in range(170):
    x=random.uniform(-29,29);z=random.uniform(-32,32)
    if abs(x)>2.5:
        for j in range(3):tube('grass blade',[(x,0,z),(x+random.uniform(-.13,.13),random.uniform(.17,.42),z+.07)],.014,'leaflight')
        if k%3==0:mushroom(x,z,random.uniform(.15,.35))
g=empty('mushroom');mushroom(-24,8,.85,'violet',g,spots=33)
# Arrival rabbit and four appointment watches.
g=empty('schedule');rabbit((0,0,21),g,1.2);plaque('schedule','FOUR APPOINTMENTS. ONE WAY OUT.',(0,2,20.7),3,g)
for name,x,z,h,m in [('caterpillar',-6,0,3,10),('messenger',6,1,4,25),('kitchen',-6,-8,5,40),('tea',6,-8,6,0)]:
    before=checkpoint()
    g=empty(name);clockface(name,x,2.6,z,h,m,g,.54)
    for dx in [-1.45,1.45]:cylinder('pavilion post',(x+dx,1.8,z-.35),.075,3.6,'brass')
    tube('pavilion arch',[(x-1.45,3.6,z-.35),(x-.8,4.3,z-.35),(x+.8,4.3,z-.35),(x+1.45,3.6,z-.35)],.08,'gold')
    if name=='caterpillar':
        mushroom(x,z,1.5,'violet',g)
        for i in range(6):ball('caterpillar',(x,1.7+i*.17,z+.1),(.19,.18,.22),'blue',g)
        for dx in [-.07,.07]:ball('caterpillar eye',(x+dx,2.58,z+.3),(.025,.04,.022),'glow',g)
        tube('hookah',[(x+.7,.1,z),(x+.7,1.2,z),(x+.3,1.5,z),(x+.16,2.2,z)],.045,'gold',g)
    if name=='messenger':
        ball('frog body',(x,.65,z),(.45,.6,.3),'red',g);ball('frog head',(x,1.38,z),(.44,.28,.28),'leaflight',g)
        for dx in [-.25,.25]:ball('frog eye',(x+dx,1.59,z+.15),(.13,.13,.11),'cream',g);ball('frog pupil',(x+dx,1.61,z+.25),(.045,.07,.025),'ink',g)
        box('invitation',(x,1,z+.4),(.64,.4,.06),'cream',g);ball('wax seal',(x,.98,z+.44),(.07,.07,.02),'red',g)
    if name=='kitchen':
        character('cook',x+.65,z-1.05,'cook',g)
        table(x,z,3,1.7,g);cylinder('cauldron',(x,1.45,z),.5,.6,'dark',g,top=.62);ring('cauldron lip',(x,1.77,z),.62,.045,'brass',g)
        for dx in [-.8,.8]:cylinder('pepper jar',(x+dx,1.3,z),.15,.34,'ivory',g)
        # The title belongs on the counter, below the cook's face and stirring arm.
        plaque('kitchen sign','THE PEPPER KITCHEN',(x,.85,z+.92),2.1,g)
    if name=='tea':
        character('hatter',x+1.2,z-1.2,'hatter',g)
        table(x,z,4,2,g);box('table runner',(x,1.15,z),(1.2,.02,1.95),'red',g)
        for dx in [-1.3,0,1.3]:cup((x+dx,1.16,z+.3),g)
        ball('teapot',(x,1.46,z-.35),(.32,.3,.29),'cream',g);tube('teapot spout',[(x+.23,1.4,z-.35),(x+.6,1.66,z-.35)],.06,'cream',g);ring('teapot handle',(x-.32,1.5,z-.35),.2,.04,'gold',g,True)
        # Keep the tabletop distraction at the opposite end from the Hatter's face.
        cylinder('hatter hat',(x-1.3,1.5,z-.35),.35,.65,'teal',g);cylinder('hat brim',(x-1.3,1.2,z-.35),.5,.06,'teal',g);plaque('hat tag','10/6',(x-1.3,1.56,z+.02),.5,g)
    offsets={'caterpillar':(-11,3),'messenger':(10,9),'kitchen':(-12,-14),'tea':(12,-10)}
    shift_new(before,*offsets[name])
# Single fan in an alcove, physical collectible.
before=checkpoint()
g=empty('fan');pedestal((-5,0,6),g)
for k in range(11):
    a=-1.25+k/10*2.5;tube('fan rib',[(-5,1.25,6),(-5+math.sin(a)*.68,1.25+math.cos(a)*.68,6)],.018,'gold',g)
    if k<10:
        a2=a+.25;mesh_obj('fan silk',[xyz((-5,1.25,6)),xyz((-5+math.sin(a)*.68,1.25+math.cos(a)*.68,6)),xyz((-5+math.sin(a2)*.68,1.25+math.cos(a2)*.68,6))],[(0,1,2),(2,1,0)],'blue',g)
shift_new(before,-17,10)
before=checkpoint()
g=empty('minutes');pedestal((0,0,-5),g);clockface('master watch',0,1.9,-5,6,0,g,.57);plaque('minutes lock','THE RABBIT’S LOST MINUTES',(0,.8,-4.5),2.5,g)
shift_new(before,0,-5)
before=checkpoint()
g=empty('signs');table(0,-11,4,2.4,g);plaque('exit colors','E   X   I   T',(0,2,-11.2),2,g)
for i,(char,mat) in enumerate(zip('EXIT',['mint','oak','orange','magenta'])):text_obj('exit letter',char,(-.6+i*.4,2.05,-11.08),.3,mat,g)
shift_new(before,0,-15)
# The Queen's gate stands at the east path into the shared valley.
g=empty('garden_exit');plaque('garden gate','THE QUEEN’S ROAD  →',(28,2,-22),3,g)
for x in [26.3,29.7]:cylinder('gatepost',(x,1.4,-22),.15,2.8,'brass',g)
# A ruined conservatory shelters the lost fan.
for x in [-24,-20]:
    for z in [14,18]:
        cylinder('broken conservatory column',(x,1.5,z),.17,3,'stone')
        cylinder('column capital',(x,3.05,z),.26,.2,'ivory')
arch('broken arch',-22,14,4,4.3,'stone')
for x in [-24,-22,-20]:box('conservatory cornice',(x,3.2,18),(1.6,.25,.5),'stone')
# The pepper kitchen is a crooked cottage, visible from the river.
for x in [-20.4,-15.6]:box('cottage side',(x,1.8,-22.5),(.3,3.6,4.2),'ivory')
box('cottage rear',(-18,1.8,-24.5),(5,3.6,.3),'ivory')
box('door lintel',(-18,3.3,-20.3),(5,.55,.35),'wood')
for x in [-20,-16]:box('front stucco',(x,1.45,-20.3),(1,2.9,.3),'ivory')
for x in [-20.4,-15.6]:box('timber frame',(x,1.8,-20.1),(.18,3.6,.16),'wood')
for dx in [-1.3,1.3]:
    roof=box('cottage roof',(-18+dx,4.3,-22.4),(3.5,.18,5.1),'red');roof.rotation_euler.y=(-.55 if dx<0 else .55)
box('chimney',(-19.5,5,-23.5),(.6,2.3,.6),'stone')
# Tea in a circular garden, reached by a branching path.
for k in range(12):
    a=k/12*math.tau;flower(18+math.cos(a)*3.3,-18+math.sin(a)*3.3)
# Stone marker clues are found along the paths, away from their mechanisms.
for name,txt,x,z in [('forest_map','THE LOST WOODS',-4.5,26),('bridge_note','THE RIVER REMEMBERS EVERY FOOTSTEP',0,1),('fan_note','THE CATERPILLAR BORROWED MY FAN',-14,17)]:
    g=empty(name);plaque(name,txt,(x,1.5,z),3.5,g);cylinder('signpost',(x,.65,z),.055,1.3,'oak',g)

export('garden')

clear()
# QUEEN'S GARDEN, COURT AND CROQUET LAWN.
box('court ground',(0,-.12,0),(32,.24,34),'grass')
for x in range(-3,4):
    for z in range(-14,14):box('court tiles',(x,.025,z),(.99,.05,.99),'whitetile' if (x+z)%2 else 'blacktile')
for x in [-14,14]:
    # The west opening matches the six-metre road, plus shoulder clearance.
    # Its old five-metre gap clipped both sides of the visible approach.
    for side in [-1,1]:
        center,depth=(9.55,11.9) if x<0 else (9,13)
        box('outer hedge',(x,1.5,side*center),(.8,3,depth),'hedge')
for x in [-8,8]:box('rear hedge',(x,1.5,-15),(12,3,.8),'hedge')
for x in [-11,-6,6,11]:
    for z in [-12,11]:tree(x,z,1)
# Low walkable maze paths; controlled gates carry arithmetic modifiers.
for x,z,w,d in [(-10.65, 5, 2.7, 0.6), (-5.35, 5, 2.7, 0.6), (-11, 2, 0.6, 6), (-10.15, -1, 1.7, 0.6), (-4.85, -1, 3.7, 0.6), (-4, 2, 0.6, 6), (5.35, 5, 2.7, 0.6), (10.65, 5, 2.7, 0.6), (11, 2, 0.6, 6), (4.85, -1, 3.7, 0.6), (10.15, -1, 1.7, 0.6), (4, 2, 0.6, 6)]:box('maze hedge',(x,.6,z),(w,1.2,d),'hedge')
g=empty('maze');plaque('maze rules','YOU ARE 33',(0,1.8,7.5),2.1,g)
for x,label in [(-3,'GARDEN   − 4'),(0,'COURT   × 3'),(3,'CROQUET   + 16')]:plaque('maze route',label,(x,1.1,7.3),2.8,g)
g=empty('roses');cylinder('rose bed',(-8,.13,-5),1.8,.25,'stone',g)
for i in range(15):
    a=i*2.4;r=.4+random.random();flower(-8+math.cos(a)*r,-5+math.sin(a)*r,i%3==0,g)
plaque('rose plaque','A WHITE ROSE? HOW UNFORTUNATE.',(-8,1.7,-5.5),3.2,g)
g=empty('brush');table(-6,0,1.6,1,g);cylinder('paint pot',(-6,1.31,0),.22,.35,'red',g);tube('paint brush',[(-5.65,1.15,.1),(-5.5,1.2,-.4)],.04,'oak',g)
g=empty('gardeners')
for gx,gz,num in [(-11,-7,2),(-9,-8,5),(-7,-7.8,7)]:
    guard('gardener',gx,gz,False,g,suit='♠');text_obj('gardener identity',str(num),(gx,.94,gz+.24),.25,'cream',g)
plaque('gardener testimony','THE ROSES MUST BE RED',(-9,2.4,-8.2),3,g)
# Raised tribunal with portraits represented by two full 3D guards.
box('court stage',(0,.15,-9),(8,.3,5),'stone');box('red carpet',(0,.32,-9),(2.2,.03,5),'red')
for x in [-2.5,2.5]:
    box('throne back',(x,1.8,-11),(1.7,3,.3),'gold');box('throne velvet',(x,1.8,-10.8),(1.48,2.7,.15),'red');box('throne seat',(x,.85,-10.3),(1.8,.3,1.1),'gold')
    for dx in [-.8,.8]:cylinder('throne spire',(x+dx,3.5,-11),.1,.5,'gold',top=0)
    text_obj('throne heart','♥',(x,2.65,-10.66),.65,'gold')
g=empty('trial');character('queen',2.5,-10.3,'queen',g);pedestal((0,0,-7),g);plaque('court summons','THE CASE OF THE MISSING TART',(0,1.9,-7.2),3.3,g)
guard('guard_original',-3.2,-6.2,False);guard('guard_impostor',3.2,-6.2,True)
g=empty('tart');table(-5.5,-9,2,1.9,g);cylinder('tart dish',(-5.5,1.17,-9),.58,.04,'cream',g)
# The missing wedge and loose crumbs are evidence, visible from above.
r=.48;start=.8;end=math.tau+.1;n=42
outline=[(0,0)]+[(r*math.cos(start+(end-start)*i/n),r*math.sin(start+(end-start)*i/n)) for i in range(n+1)]
verts=[xyz((-5.5+x,y,-9+z)) for y in [1.19,1.33] for x,z in outline];count=len(outline)
faces=[tuple(reversed(range(count))),tuple(range(count,count*2))]+[(i,(i+1)%count,(i+1)%count+count,i+count) for i in range(count)]
mesh_obj('tart with missing slice',verts,faces,'oak',g)
for angle in [-.55,.55]:
    for offset in [-.29,-.1,.1,.29]:
        half=math.sqrt(r*r-offset*offset)*.92;points=[]
        for i in range(26):
            u=-half+2*half*i/25;x=offset*math.cos(angle)-u*math.sin(angle);z=offset*math.sin(angle)+u*math.cos(angle);a=math.atan2(z,x)%math.tau
            if .1<a<.8:
                if len(points)>1:tube('pie lattice',points,.016,'ivory',g)
                points=[]
            else:points.append((-5.5+x,1.342,-9+z))
        if len(points)>1:tube('pie lattice',points,.016,'ivory',g)
for k in range(36):
    a=k/36*math.tau;xx=16*math.sin(a)**3/25;zz=(13*math.cos(a)-5*math.cos(2*a)-2*math.cos(3*a))/25
    ball('heart crumbs',(-5.5+xx*.6,1.15,-8.0-zz*.55),(.027,.016,.027),'gold',g)
# Croquet board lives on the grass, with brass rebound posts and a hedgehog.
g=empty('croquet');box('croquet lawn',(8,.07,-6),(6.2,.15,8),'leaflight',g)
for x,z,n in [(6,-3,4),(10,-6,7),(6,-9,6)]:
    cylinder('croquet bumper',(x,.3,z),.32,.6,'brass',g);text_obj('bumper number',str(n),(x,.57,z+.34),.32,'cream',g)
for x,z,w,d in [(9,-3.7,2.4,.4),(8,-8.5,.5,.8),(10,-8,.55,.5)]:box('croquet obstacle',(x,.32,z),(w,.6,d),'orange',g)
ball('hedgehog',(10,.3,-2.7),(.27,.23,.3),'wood',g)
for k in range(25):
    a=random.random()*math.tau;ball('hedgehog spine',(10+math.cos(a)*.23,.38+random.random()*.13,-2.7+math.sin(a)*.23),(.04,.13,.04),'ivory',g)
cylinder('flag pole',(10,1,-10),.025,2,'cream',g);box('flag',(10.3,1.8,-10),(.6,.4,.02),'dark',g);text_obj('flag number','1',(10.3,1.67,-9.98),.35,'cream',g)
plaque('croquet rules','THREE REBOUNDS. THEN THE FLAG.',(8,1.8,-10.5),3.2,g)
g=empty('effigies');table(8,1.5,3.5,1.7,g)
for i in range(3):
    x=7+i;box('effigy body',(x,1.64,1.5),(.5,.9,.16),'red' if i==1 else 'ivory',g);ball('effigy head',(x,2.25,1.5),(.22,.24,.18),'ivory',g)
plaque('effigy clue','OFF WITH THEIR HEADS',(8,2.8,1.3),3,g)
g=empty('decree');box('decree frame',(0,2.8,-14.4),(5,2.8,.15),'gold',g);box('decree panel',(0,2.8,-14.3),(4.8,2.6,.06),'ivory',g)
for i,t in enumerate(['A BANISHMENT, IN ALMOST','EVERY LETTER.','WHICH THREE ESCAPED?']):text_obj('decree text',t,(0,3.45-i*.5,-14.24),.25,'ink',g)
g=empty('court_exit');door('court_exit',11,-14.2,1.9,3.2,parent=g);plaque('tower entrance','THE HOUSE OF IMPOSSIBLE THINGS',(10.5,3.8,-14.1),4,g)
export('court')

clear()
# FINAL ANAMORPHOSIS CHAMBER.
box('tower foundation',(0,-.2,0),(20,.4,22),'dark')
for x in range(-10,10):
    for z in range(-11,11):box('tower tile',(x+.5,.02,z+.5),(.995,.04,.995),'blacktile' if (x+z)%2 else 'whitetile')
for x in [-10,10]:box('tower wall',(x,4,0),(.4,8,22),'teal')
box('tower back',(0,4,-11),(20,8,.4),'teal')
for x in [-8,-4,0,4,8]:
    arch('tall tower arch',x,-10.7,3,7,'gold');box('tower glass',(x,4,-10.8),(2.5,5.6,.04),'window')
for z in [-7,0,7]:
    for x in [-9.7,9.7]:cylinder('tower column',(x,3.5,z),.23,7,'brass');cylinder('column base',(x,.3,z),.45,.6,'gold')
cylinder('assembly dais',(0,.18,-2),3.2,.36,'teal');ring('dais rim',(0,.38,-2),3.15,.06,'gold')
g=empty('assembly');pedestal((0,0,4),g);plaque('assembly controls','BUILD WHAT THE KINGS DESCRIBE',(0,1.8,3.8),3.5,g)
# Architectural pieces carry the kings' numbers; no card artwork is used.
g=empty('structure')
slots=[(-1.65,1.25,-2),(0,1.25,-2),(-.8,2.25,-2),(1.65,1.25,-2),(-.85,3.1,-2),(.85,3.1,-2),(0,4.15,-2),(-.38,4.95,-2),(.38,4.95,-2)]
labels=['6','4','8','6','4','2','9','5','7']
for i,pos in enumerate(slots):
    piece=bpy.data.objects.new('house_piece_'+str(i),None);bpy.context.collection.objects.link(piece);piece.parent=g;piece.location=xyz(pos);piece['pieceIndex']=i
    if i in [2,6]:
        width=3.4 if i==2 else 3.1
        box('king bridge',(0,0,0),(width,.16,2.25),'gold',piece)
        emblem=text_obj('matching bridge seal',labels[i],(0,.09,0),.6,'ink' if i==2 else 'red',piece);emblem.rotation_euler=(0,0,0)
    else:
        for side in [-1,1]:
            panel=box('folded wing',(side*.28,0,0),(1.05,.1,2.25),'panel',piece);panel.rotation_euler.y=side*.88
        text_obj('support number',labels[i],(0,.13,1.15),.3,'cream' if i<2 else 'rose',piece)
        if i in [1,5]:
            seal=text_obj('under bridge seal','8' if i==1 else '9',(0,.54,0),.35,'ink' if i==1 else 'red',piece);seal.rotation_euler=(0,0,0)
for name,x,mat in [('amber_view',-6,'orange'),('ivory_view',6,'cream')]:
    g=empty(name);ring('viewpoint',(x,.05,-2),.7,.045,mat,g);plaque('viewpoint clue','STAND HERE. LOOK AT THE HOUSE.',(x,1.2,-5),3,g)
g=empty('final_lock');door('final_lock',0,-10.4,2.2,3.5,parent=g);clockface('final watch',0,4.7,-10.2,7,40,g,.6)
g=empty('cat_eyes')
for x,mat in [(-.34,'orange'),(.34,'cream')]:
    ball('Cheshire eye',(x,5.9,-10.25),(.25,.15,.08),mat,g);ball('cat pupil',(x,5.9,-10.15),(.03,.14,.015),'ink',g)
plaque('eyes order','FOLLOW MY EYES',(0,6.4,-10.15),2,g)
export('tower')
print('All four Blender worlds complete.',flush=True)
