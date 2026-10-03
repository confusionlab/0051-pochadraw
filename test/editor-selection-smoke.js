/* Run against a local dev server: node test/editor-selection-smoke.js http://localhost:8851/ */
const { execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');
const base = process.argv[2] || 'http://localhost:8851/';
if (!['localhost','127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Selection smoke tests require a local preview.');
const session = 'pochadraw-selection';
const browser = (...args) => execFileSync('npx', ['--yes','agent-browser','--session',session,...args], {encoding:'utf8',timeout:60000}).trim();
const js = code => JSON.parse(browser('eval',code));
const click = selector => js(`document.querySelector(${JSON.stringify(selector)}).click(); true`);
const settle = () => browser('wait','300');
const state = () => js('CC.LevelKit.read("draft",null)');
const heading = () => js('document.querySelector("#objectInspector .selected-heading")?.textContent || ""');
const menuOpen = () => js('!document.querySelector("#selectionMenu").hidden');
function pointer(events, shift = false) {
  js(`(() => {const cv=document.querySelector('#editorCanvas'),r=cv.getBoundingClientRect();
    for(const [type,x,y] of ${JSON.stringify(events)}) cv.dispatchEvent(new PointerEvent(type,{bubbles:true,clientX:r.left+x/16*r.width,clientY:r.top+y/9*r.height,pointerId:1,button:0,buttons:type==='pointerup'?0:1,shiftKey:${shift}}));return true;})()`);
}
const tap = (x,y,shift=false) => pointer([['pointerdown',x,y],['pointerup',x,y]],shift);
const box = (x1,y1,x2,y2,shift=false) => pointer([['pointerdown',x1,y1],['pointermove',x2,y2],['pointerup',x2,y2]],shift);
function context(x,y) {
  js(`(() => {const cv=document.querySelector('#editorCanvas'),r=cv.getBoundingClientRect();cv.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,button:2,clientX:r.left+${x}/16*r.width,clientY:r.top+${y}/9*r.height}));return true;})()`);
}
try {
  browser('open',new URL('editor.html?preview=1',base).href);
  browser('wait','500');
  js(`(() => {localStorage.clear();const l=CC.LevelKit.blank();l.id='pd-selection-test';l.name='Selection test';l.parts=[
    {type:'block',id:'piece',x:2,y:2,w:1,h:1,style:'wood'},
    {type:'block',x:5,y:2,w:1,h:1,style:'box'},
    {type:'plank',x1:10,y1:1,x2:12,y2:1,t:.2},
    {type:'wire',from:[2,6],to:[4,6]},
    {type:'arrow',pts:[[5,6],[6,6],[6,7]]},
    {type:'balloon',x:8,y:6,r:.3,tie:[8,8]}
  ];l.solution=[{kind:'solid',pts:[[1,4],[3,5]]}];l.hintVerified=true;
  const valid=CC.LevelKit.validate(l);localStorage.setItem('pochadraw-draft',JSON.stringify(valid));localStorage.setItem('pochadraw-library',JSON.stringify([valid]));return true;})()`);
  browser('open',new URL('editor.html?preview=1&tab=studio&edit=pd-selection-test',base).href);browser('wait','#editorPanel');settle();
  const original=state();
  js('window.selectionWrites=0;const write=CC.LevelKit.write;CC.LevelKit.write=(...args)=>{window.selectionWrites++;return write(...args);};true');
  box(1,1.5,6.5,3.5);settle();
  assert.equal(heading(),'2 objects selected');
  assert.deepEqual(state(),original);
  assert.equal(js('window.selectionWrites'),0);
  assert.equal(js('document.querySelector("#saveLevel").textContent'),'Saved');
  assert.equal(js('document.querySelector("#undoEdit").disabled'),true);
  // A cancelled marquee restores the previous selection without writing a draft.
  pointer([['pointerdown',9,.3],['pointermove',13,1.5],['pointercancel',13,1.5]]);
  assert.equal(heading(),'2 objects selected');
  // Shift-click toggles membership; reverse-direction Shift-box adds another part.
  tap(5.5,2.5,true);assert.match(heading(),/OBJECT 01/);
  tap(5.5,2.5,true);assert.equal(heading(),'2 objects selected');
  box(13,1.5,9,.3,true);assert.equal(heading(),'3 objects selected');
  box(1,1.5,6.5,3.5);assert.equal(heading(),'2 objects selected');
  console.log('PASS box selection, reverse/additive selection, Shift-click, cancel, and no save or history changes');

  context(2.5,2.5);assert.equal(menuOpen(),true);
  assert.equal(js('document.querySelector("#selectionCount").textContent'),'2 objects selected');
  assert.equal(js('document.activeElement.id'),'duplicateSelection');
  browser('press','Enter');settle();
  let current=state();assert.equal(current.parts.length,8);assert.equal(heading(),'2 objects selected');
  assert.deepEqual(current.parts.slice(0,6),original.parts);
  assert.equal(current.parts[6].x,2.4);assert.equal(current.parts[6].y,1.6);
  assert.equal(current.parts[6].id,'piece-copy');
  assert.equal(current.parts[7].x,5.4);assert.equal(current.parts[7].y,1.6);
  assert.deepEqual(current.solution,[]);assert.equal(current.hintVerified,undefined);
  assert.equal(menuOpen(),false);
  click('#undoEdit');settle();assert.deepEqual(state(),original);assert.equal(heading(),'2 objects selected');
  click('#redoEdit');settle();assert.equal(state().parts.length,8);assert.equal(heading(),'2 objects selected');

  // Dragging any selected part moves the whole group in one undo step.
  pointer([['pointerdown',2.8,2.4],['pointermove',3.8,3.4],['pointerup',3.8,3.4]]);settle();
  current=state();assert.equal(current.parts[6].x,3.4);assert.equal(current.parts[7].x,6.4);
  assert.deepEqual(current.parts.slice(0,6),original.parts);
  click('#undoEdit');settle();assert.equal(state().parts[6].x,2.4);assert.equal(state().parts[7].x,5.4);
  context(15,8);browser('press','ArrowDown');browser('press','Enter');settle();
  assert.equal(state().parts.length,6);assert.equal(heading(),'');
  click('#undoEdit');settle();assert.equal(state().parts.length,8);assert.equal(heading(),'2 objects selected');
  click('#redoEdit');settle();assert.equal(state().parts.length,6);
  console.log('PASS right-click bulk duplicate/delete, selected copies, group drag, and atomic undo/redo');

  // Point-array geometry and balloon ties also move with the group.
  box(1,5,9,8.3);assert.equal(heading(),'3 objects selected');
  browser('press','ArrowRight');settle();current=state();
  assert.deepEqual(current.parts[3].from,[2.1,6]);assert.deepEqual(current.parts[3].to,[4.1,6]);
  assert.deepEqual(current.parts[4].pts,[[5.1,6],[6.1,6],[6.1,7]]);
  assert.equal(current.parts[5].x,8.1);assert.deepEqual(current.parts[5].tie,[8.1,8]);
  click('#undoEdit');settle();assert.deepEqual(state().parts,original.parts);
  browser('press',process.platform==='darwin'?'Meta+d':'Control+d');settle();
  assert.equal(state().parts.length,9);assert.equal(heading(),'3 objects selected');
  browser('press','Delete');settle();assert.equal(state().parts.length,6);

  // Right-clicking an unselected part selects only that part; menu dismissal is safe.
  box(1,1.5,6.5,3.5);context(11,1);
  assert.equal(js('document.querySelector("#selectionCount").textContent'),'1 object selected');
  browser('press','Escape');assert.equal(menuOpen(),false);assert.match(heading(),/OBJECT 03/);
  assert.equal(js('document.activeElement.id'),'editorCanvas');
  pointer([['pointerdown',12,1],['pointermove',12,2],['pointerup',12,2]]);settle();
  assert.equal(state().parts[2].y2,2);assert.equal(state().parts[2].y1,1);
  context(11,1.5);browser('click','#snapGrid');assert.equal(menuOpen(),false);
  tap(15,4);context(15,4);assert.equal(menuOpen(),false);
  console.log('PASS group nudge/shortcuts, wire/arrow/tie geometry, single handles, and context menu dismissal');

  assert.equal(browser('errors'),'');
  console.log('All selection browser checks passed.');
} finally { browser('close'); }
