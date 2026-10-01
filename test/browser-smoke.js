/* Real browser integration checks. Start npm run dev, then run this file. */
const { execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');
const base = process.argv[2] || 'http://localhost:8851/';
const session = 'pochadraw-smoke';
function browser(...args) { return execFileSync('npx', ['--yes','agent-browser','--session',session,...args], {encoding:'utf8',timeout:60000}).trim(); }
function evalJS(code) { return JSON.parse(browser('eval',code)); }
const click = id => evalJS(`document.querySelector(${JSON.stringify(id)}).click(); true`);
const state = () => evalJS('CC.LevelKit.read("draft", null)');
const settle = () => browser('wait','350');
function pointer(type,x,y) { evalJS(`(() => { const cv=document.querySelector('#editorCanvas'),r=cv.getBoundingClientRect();cv.dispatchEvent(new PointerEvent('${type}',{bubbles:true,clientX:r.left+${x}/16*r.width,clientY:r.top+${y}/9*r.height,pointerId:1,button:0,buttons:${type==='pointerup'?0:1}}));return true;})()`); }
try {
  browser('open',new URL('editor.html',base).href);
  evalJS('localStorage.clear(); true');
  browser('reload');settle();
  assert.equal(state().parts.length,3);
  click('[data-toy="block"]');pointer('pointerdown',7,4);pointer('pointerup',7,4);settle();
  assert.equal(state().parts.length,4);assert.equal(state().solution.length,0);
  pointer('pointerdown',7,4);pointer('pointermove',8,5);pointer('pointerup',8,5);settle();
  assert.equal(state().parts[3].x,7.2);assert.equal(state().parts[3].y,4.4);
  click('#undoEdit');settle();assert.equal(state().parts[3].x,6.2);
  click('#redoEdit');settle();assert.equal(state().parts[3].x,7.2);
  click('.object-actions .button');settle();assert.equal(state().parts.length,5);
  click('.object-actions .danger');settle();assert.equal(state().parts.length,4);
  console.log('PASS place, select, drag, duplicate, delete, undo and redo');
  click('#remixLevel');click('.remix-card:first-child');
  browser('fill','#levelName','포차 ✎ café');browser('press','Tab');settle();
  click('#saveLevel');
  assert.ok(evalJS('CC.LevelKit.read("library",[]).some(l=>l.name==="포차 ✎ café")'));
  browser('reload');settle();assert.equal(state().name,'포차 ✎ café');
  console.log('PASS remix, Unicode names, sketchbook save and reload');
  click('#testLevel');
  browser('wait','--load','networkidle');
  const won=evalJS(`(() => {
    const w=document.querySelector('#playFrame').contentWindow,cv=w.document.querySelector('#cv'),r=cv.getBoundingClientRect();
    const s=w.CCDBG.st.level.solution[0],a=s.pts[0],b=s.pts[s.pts.length-1];
    const fire=(type,p)=>cv.dispatchEvent(new w.PointerEvent(type,{bubbles:true,clientX:r.left+p[0]/16*r.width,clientY:r.top+p[1]/9*r.height,pointerId:1,button:0,buttons:type==='pointerup'?0:1}));
    fire('pointerdown',a);for(let i=1;i<=50;i++)fire('pointermove',[a[0]+(b[0]-a[0])*i/50,a[1]+(b[1]-a[1])*i/50]);fire('pointerup',b);
    w.document.querySelector('#btnGo').click();w.CCDBG.advance(10);return w.CCDBG.st.sim.won;
  })()`);
  assert.equal(won,true);settle();
  assert.equal(evalJS('document.querySelector("#recordHint").hidden'),false);
  click('#recordHint');settle();assert.equal(state().hintVerified,true);
  assert.equal(evalJS('document.querySelector("#testDialog").open'),false);
  console.log('PASS pointer drawing, game physics, win message and replay-checked hint capture');
  click('#shareLevel');
  const share=evalJS('document.querySelector("#shareUrl").value');
  assert.equal(evalJS('CC.LevelKit.decode(new URL(document.querySelector("#shareUrl").value).hash.slice(7)).name'),'포차 ✎ café');
  click('#shareDialog [data-close]');
  const original=state();
  evalJS(`(() => {const level=CC.LevelKit.read('draft',null);level.name='Imported puzzle';const file=new File([JSON.stringify({format:'pochadraw',version:1,level})],'puzzle.json',{type:'application/json'}),dt=new DataTransfer();dt.items.add(file);const input=document.querySelector('#fileInput');input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));return true;})()`);
  settle();assert.equal(state().name,'Imported puzzle');
  // Capture the actual browser download trigger without writing a test artifact.
  evalJS(`window.__download=null;window.__anchorClick=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){window.__download={name:this.download,href:this.href};};true`);
  click('#exportLevel');assert.ok(evalJS('window.__download.name.endsWith(".pochadraw.json") && window.__download.href.startsWith("blob:")'));
  evalJS('HTMLAnchorElement.prototype.click=window.__anchorClick;true');
  console.log('PASS share encoding, JSON file import and export download');
  browser('open',share);browser('wait','--load','networkidle');
  assert.equal(evalJS('CCDBG.st.level.name'),'포차 ✎ café');
  assert.equal(evalJS('document.querySelector("#overlay").hidden'),true);
  assert.equal(evalJS('document.querySelector("#btnNext").disabled'),true);
  assert.equal(evalJS('CCDBG.st.level.custom'),true);
  console.log('PASS shared link opens as a playable custom puzzle');
  browser('open',new URL('editor.html',base).href);
  browser('set','viewport','390','844');settle();
  assert.ok(evalJS('document.documentElement.scrollWidth <= innerWidth'));
  assert.ok(evalJS('document.querySelector("#editorCanvas").getBoundingClientRect().width > 250'));
  console.log('PASS mobile layout has no horizontal overflow');
  const errors=browser('errors');assert.ok(!errors,errors);
  console.log('PASS no browser errors');
} finally { browser('close'); }
