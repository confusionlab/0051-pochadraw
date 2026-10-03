const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const CC = require('./load')(['js/levels.js', 'js/level-kit.js', 'js/editor-tools.js']);
const { LevelKit: Kit, Sim, LEVELS } = CC;
test('every campaign puzzle can be remixed without losing its mechanisms or answer', () => {
  for (const original of LEVELS) {
    const remix = Kit.remix(original);
    assert.match(remix.id, /^pd-/);
    assert.equal(remix.custom, true);
    assert.equal(remix.paper, CC.WORLDS[original.world].paper);
    assert.equal(JSON.stringify(remix.parts), JSON.stringify(original.parts));
    assert.equal(JSON.stringify(remix.solution), JSON.stringify(original.solution));
    assert.notEqual(remix.id, original.id);
    remix.parts[0].x = 123;
    assert.notEqual(original.parts[0].x, 123);
  }
});
test('Unicode share links preserve objects, settings and a working solution', () => {
  const lv = Kit.remix(LEVELS[0]);
  lv.name = '포차 ✎ café';
  const restored = Kit.decode(Kit.encode(lv));
  assert.equal(JSON.stringify(restored), JSON.stringify(lv));
  const world = new Sim(restored, restored.solution);
  world.start();
  while (world.t < 34 && !world.won && !world.stalled) world.step();
  assert.equal(world.won, true);
});
test('move keeps platform endpoints, object sizes and decorations together', () => {
  const p = { type:'plank', x1:1, y1:2, x2:4, y2:3, t:.2 };
  Kit.move(p, 2, -1);
  assert.equal(JSON.stringify(p), JSON.stringify({ type:'plank', x1:3, y1:1, x2:6, y2:2, t:.2 }));
  const note = { type:'arrow', pts:[[1,2],[3,4]] };
  Kit.move(note, .5, -.5);
  assert.equal(JSON.stringify(note.pts), JSON.stringify([[1.5,1.5],[3.5,3.5]]));
});
test('malformed imports and expensive object counts are rejected', () => {
  assert.throws(() => Kit.decode('not a level'));
  assert.throws(() => Kit.validate({}));
  for (const mutation of [l => l.crayons=[], l => l.ink=-1, l => l.parts[0].type='oops', l => l.parts[0].style='oops', l => l.parts.push({type:'dominoes',x:1,y:1,n:50000}), l=>l.parts.push({type:'cup',x:1,y:1,w:.1,h:.1}), l=>l.solution=[{kind:'solid',pts:[[null,2]]}]]) {
    const lv=Kit.blank();mutation(lv);assert.throws(()=>Kit.validate(lv));
  }
  const poisoned = JSON.parse('{"parts":[],"__proto__":{"polluted":true}}');
  assert.throws(()=>Kit.validate(poisoned));
  assert.equal({}.polluted, undefined);
});

test('tool box covers every campaign object and every placed object runs in physics', () => {
  const defs=CC.EditorTools.map(tool=>tool[3]([8,4]));
  for(const type of new Set(LEVELS.flatMap(level=>level.parts.map(part=>part.type)))) assert.ok(defs.some(part=>part.type===type), 'Missing tool: '+type);
  for(const kind of ['tube','hen','cannon']) assert.ok(defs.some(part=>part.type==='dispenser'&&part.kind===kind));
  for(const kind of ['sun','cloud']) assert.ok(defs.some(part=>part.type==='deco'&&part.kind===kind));
  for(const def of defs) {
    const level=Kit.blank();level.parts=[def];const valid=Kit.validate(level),sim=new Sim(valid,[]);sim.start();
    for(let i=0;i<180;i++)sim.step();
    for(const part of sim.parts)for(const body of part.bodies) {
      assert.ok(Number.isFinite(body.getPosition().x), def.type+' X');
      assert.ok(Number.isFinite(body.getPosition().y), def.type+' Y');
    }
  }
});
test('wire endpoints and balloon ties move with the objects', () => {
  const wire={type:'wire',from:[1,2],to:[3,4]};Kit.move(wire,2,-1);
  assert.equal(JSON.stringify(wire.from),'[3,1]');assert.equal(JSON.stringify(wire.to),'[5,3]');
  const balloon={type:'balloon',x:1,y:2,tie:[1,4]};Kit.move(balloon,2,-1);assert.equal(JSON.stringify(balloon.tie),'[3,3]');
});
test('tool box button activates the matching gate and goal lamp', () => {
  const tool=(id,point)=>CC.EditorTools.find(t=>t[0]===id)[3](point);
  const level=Kit.blank();level.parts=[tool('ball',[2,1]),tool('button',[2,3]),tool('gate',[6,4]),tool('lamp',[10,8])];
  const sim=new Sim(Kit.validate(level),[]);sim.start();
  for(let i=0;i<180&&!sim.won;i++)sim.step();
  assert.equal(sim.parts[1].st.pressed,true);
  assert.equal(sim.parts[2].st.open,true);
  assert.equal(sim.parts[3].st.on,true);
  assert.equal(sim.won,true);
});
test('Otter Nuke waits for contact, explodes once, disappears and resets on replay', () => {
  const level=Kit.blank();level.parts=[
    {type:'otterNuke',x:8,y:5,r:.55,force:14},
    {type:'ball',x:8,y:1,style:'rubber',hold:'start'},
    {type:'crate',x:5,y:4,w:.8,h:.8}
  ];
  const sim=new Sim(Kit.validate(level),[]),nuke=sim.parts[0];
  sim.step();assert.equal(nuke.st.exploded,undefined);
  sim.start();sim.step();assert.equal(nuke.st.exploded,undefined);
  for(let i=0;i<160&&!nuke.st.exploded;i++)sim.step();
  assert.equal(nuke.st.exploded,true);assert.equal(nuke.st.gone,true);assert.equal(nuke.bodies.length,0);
  assert.ok(sim.parts[2].bodies[0].getLinearVelocity().x<0);
  assert.equal(sim.lost,0);assert.equal(sim.won,false);
  for(let i=0;i<80;i++)sim.step();
  assert.equal(sim.events.filter(e=>e.name==='explosion').length,1);
  assert.equal(level.parts[0].force,14);assert.equal(level.parts[0].gone,undefined);
  const replay=new Sim(level,[]);assert.equal(replay.parts[0].st.exploded,undefined);assert.equal(replay.parts[0].bodies.length,1);
});
test('Otter Nuke pushes in every direction, wakes sleeping objects and scales with Explosion force', () => {
  const run=force=>{
    const level=Kit.blank();level.parts=[{type:'otterNuke',x:8,y:4,force},
      ...[[8,3.5],[6,4],[10,4],[8,2],[8,6]].map(([x,y])=>({type:'ball',x,y,style:'rubber'})),
      {type:'block',x:13,y:7,w:1,h:1}];
    const sim=new Sim(Kit.validate(level),[]);sim.parts[2].bodies[0].setAwake(false);
    sim.start();sim.step();return sim;
  };
  const small=run(10),big=run(20),vel=sim=>sim.parts.slice(1,6).map(p=>p.bodies[0].getLinearVelocity());
  const v=vel(small);assert.ok(v[1].x<0);assert.ok(v[2].x>0);assert.ok(v[3].y<0);assert.ok(v[4].y>0);
  assert.equal(small.parts[2].bodies[0].isAwake(),true);
  assert.ok(Math.abs(vel(big)[2].x/v[2].x-2)<.001);
  assert.equal(small.parts[6].bodies[0].isStatic(),true);assert.equal(small.parts[6].bodies[0].getPosition().x,13.5);
});
test('Otter Nuke also detects fixed/dynamic drawings and overlapping objects safely', () => {
  for(const kind of ['solid','loose','hinge','bouncy']) {
    const level=Kit.blank();level.parts=[{type:'otterNuke',x:8,y:4,force:12}];
    const sim=new Sim(Kit.validate(level),[{kind,pts:[[7.7,4],[8.3,4]]}]);
    sim.start();sim.step();assert.equal(sim.parts[0].st.exploded,true,kind);
    const v=sim.strokes[0].body.getLinearVelocity();assert.ok(Number.isFinite(v.x)&&Number.isFinite(v.y),kind);
  }
  const level=Kit.blank();level.parts=[{type:'otterNuke',x:8,y:4,force:0},{type:'block',x:7.8,y:3.8,w:.4,h:.4}];
  const sim=new Sim(Kit.validate(level),[]);sim.start();sim.step();assert.equal(sim.parts[0].st.exploded,true);
});
test('Otter Nuke retains editable force and size through move, remix and sharing', () => {
  const def=CC.EditorTools.find(t=>t[0]==='otterNuke')[3]([8,4]);
  const level=Kit.blank();level.parts=[def];def.force=32;def.r=.8;
  const restored=Kit.decode(Kit.encode(Kit.remix(level)));Kit.move(restored.parts[0],1,-1);
  assert.equal(restored.parts[0].force,32);
  assert.equal(JSON.stringify(Kit.bounds(restored.parts[0])),'[8.2,2.2,9.8,3.8]');
  for(const force of [-1,101,'strong',null]) {
    const bad=Kit.clone(level);bad.parts[0].force=force;
    if(force===null)assert.doesNotThrow(()=>Kit.validate(bad));else assert.throws(()=>Kit.validate(bad),/Explosion force/);
  }
  const bad=Kit.clone(level);delete bad.parts[0].x;assert.throws(()=>Kit.validate(bad),/position/);
});
test('new object selection bounds follow visible machinery and drop positions', () => {
  assert.equal(JSON.stringify(Kit.bounds({type:'conveyor',x1:1,x2:4,y:3})),'[1,2.95,4,3.35]');
  assert.equal(JSON.stringify(Kit.bounds({type:'dispenser',kind:'hen',x1:2,x2:6,y:3})),'[1.5,2.25,2.5,3.1]');
  assert.equal(JSON.stringify(Kit.bounds({type:'dispenser',kind:'tube',x:3,y:4,xs:[-1,2]})),'[1.6,0,5.4,4.1]');
});
test('new machinery rejects invalid geometry and release settings', () => {
  for(const part of [{type:'wire',from:[1,2],to:[null,3]},{type:'arrow',pts:[[1,2]]},{type:'conveyor',x1:4,x2:2,y:3},{type:'dispenser',kind:'hen',x1:2,x2:2,y:2,count:3},{type:'boss',x:2,y:2,w:1,h:1,hp:-1},{type:'dispenser',x:2,y:2,count:3,every:0}]){
    const level=Kit.blank();level.parts.push(part);assert.throws(()=>Kit.validate(level),part.type);
  }
});
test('deleting a project clears its saved version and matching draft without touching another draft', () => {
  const storage=new Map(),deleted=[];
  const context=vm.createContext({CC:{Cloud:{deletePuzzle:id=>deleted.push(id)}},localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)}});
  vm.runInContext(fs.readFileSync('js/level-kit.js','utf8'),context);
  const kit=context.CC.LevelKit;
  storage.set('pochadraw-library',JSON.stringify([{id:'pd-delete'},{id:'pd-keep'}]));
  storage.set('pochadraw-draft',JSON.stringify({id:'pd-delete',name:'Edited draft'}));
  kit.deleteLevel('pd-delete');
  assert.deepEqual(JSON.parse(storage.get('pochadraw-library')),[{id:'pd-keep'}]);
  assert.equal(JSON.parse(storage.get('pochadraw-draft')),null);
  storage.set('pochadraw-draft',JSON.stringify({id:'pd-other'}));
  kit.deleteLevel('pd-keep');
  assert.deepEqual(JSON.parse(storage.get('pochadraw-draft')),{id:'pd-other'});
  assert.deepEqual(deleted,['pd-delete','pd-keep']);
  kit.deleteLevel('pd-other');
  assert.equal(JSON.parse(storage.get('pochadraw-draft')),null);
  assert.equal(deleted.at(-1),'pd-other');
});
