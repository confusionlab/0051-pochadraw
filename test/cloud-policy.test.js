const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

async function client({ local = {}, rows = [], pending = {} } = {}) {
  const storage = new Map(Object.entries(local).map(([key, value]) => [key, JSON.stringify(value)]));
  storage.set('pochadraw-cloud-pending', JSON.stringify(pending));
  const mutations = [], events = [];
  const workspace = { snapshot: 'snapshot', listPuzzles: 'listPuzzles', getPuzzle: 'getPuzzle', saveState: 'saveState', savePuzzle: 'savePuzzle' };
  const window = { POCHADRAW_CONVEX_URL: 'https://test.convex.cloud', addEventListener() {}, dispatchEvent(event) { events.push(event.detail); } };
  const context = vm.createContext({
    window, location: { search: '' }, URLSearchParams, console,
    navigator: { onLine: true },
    document: { querySelectorAll: () => [], addEventListener() {} },
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    CustomEvent: class { constructor(type, options) { this.detail = options.detail; } },
    // Tests flush explicitly; no retry timers or race timeouts need to run.
    setTimeout: () => 1, clearTimeout() {}, api: { workspace },
    ConvexClient: class {
      async query(name) { return name === 'snapshot' ? rows : []; }
      async mutation(name, args) {
        mutations.push({ name, ...args });
        if(name==='savePuzzle'&&args.json===null){const draft=rows.find(row=>row.key==='draft');if(draft&&JSON.parse(draft.json)?.id===args.key)draft.json='null';}
      }
      onUpdate() {}
    },
  });
  vm.runInContext(fs.readFileSync('tools/cloud-client.js', 'utf8').replace(/^import .*;\n/gm, ''), context);
  await window.CC.Cloud.ready;
  return { cloud: window.CC.Cloud, storage, mutations, events };
}

test('old gameplay outbox entries and remote snapshots never upload or restore', async () => {
  const local = { 'pd-game-strokes': { local: [] }, 'pd-game-level': 7, 'pd-game-muted': false };
  const { storage, mutations, events } = await client({
    local,
    pending: { 'state:strokes': '{"remote":[]}', 'state:preferences': '{"pd-game-level":9}' },
    rows: [
      { key: 'strokes', json: '{"remote":[]}' },
      { key: 'preferences', json: '{"pd-game-level":9,"pd-game-muted":true}' },
    ],
  });
  assert.equal(mutations.length, 0);
  assert.deepEqual(JSON.parse(storage.get('pochadraw-cloud-pending')), {});
  for (const [key, value] of Object.entries(local)) assert.deepEqual(JSON.parse(storage.get(key)), value);
  assert.ok(events.every(event => event.key === 'library'));
});

test('only editor changes and best-star progress enter the cloud queue', async () => {
  const { cloud, mutations, storage } = await client();
  for (const key of ['pd-game-strokes', 'pd-game-level', 'pd-game-muted', 'pd-game-seen-help', 'pd-game-seen-world-1', 'unknown']) cloud.write(key, {});
  await cloud.flush();
  assert.equal(mutations.length, 0);
  assert.deepEqual(JSON.parse(storage.get('pochadraw-cloud-pending')), {});
  cloud.write('pd-game-progress', { 'first-scribble': 3 });
  cloud.write('pochadraw-draft', { id: 'pd-draft', name: 'Edited level' });
  cloud.write('pochadraw-library', [{ id: 'pd-library', name: 'Saved level' }]);
  await cloud.flush();
  assert.deepEqual(mutations.map(({ name, key }) => [name, key]), [
    ['saveState', 'progress'], ['saveState', 'draft'], ['savePuzzle', 'pd-library'],
  ]);
});

test('first-time browser migration uploads progress without gameplay attempts', async () => {
  const { mutations } = await client({ local: {
    'pd-game-progress': { 'first-scribble': 2 },
    'pd-game-strokes': { 'first-scribble': [{ pts: [[0, 0], [1, 1]] }] },
    'pd-game-level': 9,
  } });
  assert.deepEqual(mutations.map(({ key }) => key), ['progress']);
});

test('project deletion cancels its queued draft and deletes even a draft-only project', async () => {
  const { cloud, storage, mutations } = await client();
  cloud.write('pochadraw-library', [{ id:'pd-delete', name:'Delete me' }, { id:'pd-keep', name:'Keep me' }]);
  cloud.write('pochadraw-draft', { id:'pd-delete', name:'Unsaved changes' });
  storage.set('pochadraw-draft', JSON.stringify({ id:'pd-delete' }));
  cloud.deletePuzzle('pd-delete');
  await cloud.flush();
  assert.equal(mutations.some(m=>m.name==='saveState'&&m.key==='draft'),false);
  assert.ok(mutations.some(m=>m.name==='savePuzzle'&&m.key==='pd-delete'&&m.json===null));
  assert.ok(mutations.some(m=>m.name==='savePuzzle'&&m.key==='pd-keep'&&m.json!==null));
  assert.equal(JSON.parse(storage.get('pochadraw-draft')),null);
  cloud.write('pochadraw-draft', { id:'pd-other' });
  cloud.deletePuzzle('pd-draft-only');
  await cloud.flush();
  assert.ok(mutations.some(m=>m.name==='savePuzzle'&&m.key==='pd-draft-only'&&m.json===null));
  assert.ok(mutations.some(m=>m.name==='saveState'&&m.key==='draft'&&JSON.parse(m.json).id==='pd-other'));
});

test('reconnecting with a queued delete never restores or migrates the deleted draft', async () => {
  const id='pd-deleted-offline';
  for(const rows of [[],[{key:'draft',json:JSON.stringify({id})}]]){
    const {mutations,events}=await client({local:{'pochadraw-draft':{id}},pending:{['puzzle:'+id]:null},rows});
    assert.deepEqual(mutations.map(({name,key,json})=>[name,key,json]),[['savePuzzle',id,null]]);
    assert.equal(events.some(event=>event.key==='draft'&&event.value?.id===id),false);
  }
});
