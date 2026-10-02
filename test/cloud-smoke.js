/* Start npm run dev with a build pointed at a development Convex deployment. */
const { execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');
const base = process.argv[2] || 'http://localhost:8851/';
const sessions = ['pochadraw-cloud-a', 'pochadraw-cloud-b'];
const call = (session, ...args) => execFileSync('npx', ['--yes', 'agent-browser', '--session', session, ...args], { encoding: 'utf8', timeout: 60000 }).trim();
const evaluate = (session, code) => JSON.parse(call(session, 'eval', code));
const ready = session => call(session, 'wait', '--fn', 'window.CC?.Cloud?.status === "Saved to cloud" && !!document.querySelector("#levelName")?.value');
let id;
const name = 'Cloud test ' + Date.now();
try {
  for (const session of sessions) {
    call(session, 'open', new URL('editor.html', base).href);
    call(session, 'wait', '--fn', '!!document.querySelector("#levelName")?.value');
  }
  assert.match(evaluate(sessions[0], 'window.POCHADRAW_CONVEX_URL'), /vibrant-possum-622/);
  evaluate(sessions[0], 'document.querySelector("#createLevel").click(); true');
  evaluate(sessions[0], `(() => { const input=document.querySelector('#levelName'); input.value=${JSON.stringify(name)}; input.dispatchEvent(new Event('change')); document.querySelector('#saveLevel').click(); return true; })()`);
  ready(sessions[0]);
  id = evaluate(sessions[0], 'CC.LevelKit.read("draft", null).id');
  call(sessions[1], 'wait', '--fn', `CC.LevelKit.read('library', []).some(l => l.name === ${JSON.stringify(name)})`);
  assert.ok(evaluate(sessions[1], `CC.LevelKit.read('library', []).some(l => l.name === ${JSON.stringify(name)})`));
  call(sessions[1], 'reload'); ready(sessions[1]);
  assert.equal(evaluate(sessions[1], 'document.querySelector("#studioLibrary").hidden'), false);
  evaluate(sessions[1], `document.querySelector('[data-level-id="${id}"] .actions button').click(); true`);
  assert.equal(evaluate(sessions[1], 'document.querySelector("#levelName").value'), name);
  console.log('PASS puzzle and draft restored in an independent browser');
  evaluate(sessions[0], `(() => {Object.defineProperty(navigator,'onLine',{get:()=>false,configurable:true});window.dispatchEvent(new Event('offline'));const input=document.querySelector('#levelName');input.value=${JSON.stringify(name + ' offline')};input.dispatchEvent(new Event('change'));document.querySelector('#saveLevel').click();return true;})()`);
  call(sessions[0], 'wait', '500');
  assert.ok(evaluate(sessions[0], 'Object.keys(JSON.parse(localStorage.getItem("pochadraw-cloud-pending"))).length > 0'));
  evaluate(sessions[0], 'delete navigator.onLine; window.dispatchEvent(new Event("online")); true'); ready(sessions[0]);
  call(sessions[1], 'wait', '--fn', `CC.LevelKit.read('library', []).some(l => l.name === ${JSON.stringify(name + ' offline')})`);
  console.log('PASS offline save retries and reaches the other browser');
  // Star scores must never go backwards, including stale saves from another device.
  const scores = evaluate(sessions[0], `(async () => {
    const client=CC.Cloud.client;
    await client.mutation('workspace:saveState',{key:'progress',json:JSON.stringify({'first-scribble':3})});
    await client.mutation('workspace:saveState',{key:'progress',json:JSON.stringify({'first-scribble':1})});
    const rows=await client.query('workspace:snapshot',{});return JSON.parse(rows.find(r=>r.key==='progress').json);
  })()`);
  assert.equal(scores['first-scribble'], 3);
  const rejected = evaluate(sessions[0], `(async () => {try{await CC.Cloud.client.mutation('workspace:saveState',{key:'progress',json:JSON.stringify({'first-scribble':9})});return false;}catch{return true;}})()`);
  assert.equal(rejected, true);
  for (const key of ['strokes', 'preferences']) {
    const rejected = evaluate(sessions[0], `(async () => {try{await CC.Cloud.client.mutation('workspace:saveState',{key:${JSON.stringify(key)},json:'{}'});return false;}catch{return true;}})()`);
    assert.equal(rejected, true);
  }
  console.log('PASS best-score merge, invalid scores and temporary-save rejection');
  evaluate(sessions[0], `(async () => {await CC.Cloud.client.mutation('workspace:savePuzzle',{key:${JSON.stringify(id)},json:null});return true;})()`);
  call(sessions[1], 'wait', '--fn', `!CC.LevelKit.read('library', []).some(l => l.id === ${JSON.stringify(id)})`);
  console.log('PASS deletion syncs between browsers');
  call(sessions[0], 'open', new URL('index.html', base).href);
  call(sessions[0], 'wait', '--fn', '!!window.CCDBG && CC.Cloud.status === "Saved to cloud"');
  evaluate(sessions[0], `(() => {
    Object.defineProperty(navigator,'onLine',{get:()=>false,configurable:true});
    window.dispatchEvent(new Event('offline'));
    CCDBG.loadLevel(2);document.querySelector('[data-act=intro]')?.click();
    return true;
  })()`);
  const board = evaluate(sessions[0], 'document.querySelector("#cv").getBoundingClientRect().toJSON()');
  call(sessions[0], 'mouse', 'move', String(Math.round(board.x + board.width * .3)), String(Math.round(board.y + board.height * .5)));
  call(sessions[0], 'mouse', 'down');
  call(sessions[0], 'mouse', 'move', String(Math.round(board.x + board.width * .5)), String(Math.round(board.y + board.height * .6)));
  call(sessions[0], 'mouse', 'up');
  call(sessions[0], 'wait', '500');
  assert.ok(evaluate(sessions[0], 'Object.values(JSON.parse(localStorage.getItem("pd-game-strokes"))).some(strokes => strokes.length > 0)'));
  assert.deepEqual(evaluate(sessions[0], 'JSON.parse(localStorage.getItem("pochadraw-cloud-pending"))'), {});
  evaluate(sessions[0], 'delete navigator.onLine; window.dispatchEvent(new Event("online")); true');
  console.log('PASS actual gameplay drawings and navigation stay local');
  for (const session of sessions) assert.equal(call(session, 'errors'), '');
} finally {
  for (const session of sessions) try { call(session, 'close'); } catch {}
}
