const test = require('node:test');
const assert = require('node:assert/strict');
const CC = require('./load')(['js/levels.js', 'js/level-kit.js']);
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
