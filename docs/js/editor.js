/* Pochadraw — the visual contraption studio. */
(async function () {
  'use strict';
  await Promise.all([window.CC.Cloud?.ready, window.CC.Pochaco.ready]);
  const { Sim, Draw, Crayon, LEVELS, WORLDS, geom, LevelKit: Kit } = window.CC;
  const $ = s => document.querySelector(s);
  const cv = $('#editorCanvas'), ctx = cv.getContext('2d'), cr = new Crayon(ctx);
  const COLORS = ['#2e6bd6', '#f58a1f', '#3fa34d', '#e9b920', '#7a4fc0', '#e23b34', '#3a3844'];
  const NAMES = ['Blue · fixed', 'Orange · falls', 'Green · bouncy', 'Yellow · floats', 'Purple · hinged', 'Red · booster', 'Black · magnetic'];
  const toys = CC.EditorTools;
  const fields = {
    ball: ['x','y','r','style','hold','metal'], plank: ['x1','y1','x2','y2','t','style','friction'], gate: ['x1','y1','x2','y2','t','style','when'],
    cup: ['x','y','w','h','style','accept','back','backH','moving'], block: ['x','y','w','h','style','text'], bell: ['x','y','size','hang','goal'],
    dominoes: ['x','y','n','gap','h'], seesaw: ['x','y','len','t','angle','baseY','limit.0','limit.1','lips'], pusher: ['x','y','dir','reach','speed','when'],
    balloon: ['x','y','r','tie.0','tie.1','goal','fires'], crate: ['x','y','w','h','angle','metal','density'], trampoline: ['x','y','w','bounce','angle'], fan: ['x','y','dir','power','reach','width','on','when'],
    note: ['x','y','text','size','rot'], lava: ['x','y','w','h'], nodraw: ['x','y','w','h','allow'], car: ['x','y','dir','speed','run','torque','metal','when'],
    button: ['x','y','w','angle','fires'], cannon: ['x','y','angle','speed','when','ball.style'], star: ['x','y'],
    lamp: ['x','y','when','flip','goal'], conveyor: ['x1','x2','y','speed','when'], flag: ['x','y'],
    boss: ['x','y','w','h','name','look','hp','minHit','hitBy','eats','flip','moving'], cat: ['x','y'], deco: ['x','y','kind','s'],
    wire: ['startX','startY','endX','endY'], arrow: ['startX','startY','endX','endY']
  };
  const labels = { x:'X position', y:'Y position', x1:'Start X', y1:'Start Y', x2:'End X', y2:'End Y', startX:'Start X',startY:'Start Y',endX:'End X',endY:'End Y', r:'Radius', w:'Width', h:'Height', t:'Thickness', len:'Length', n:'Count', count:'Count', baseY:'Base Y', bounce:'Bounciness', angle:'Angle (degrees)', rot:'Text angle (degrees)', gap:'Spacing', style:'Material', 'ball.style':'Pochaco material', hold:'Release', when:'Trigger', back:'Tall side', backH:'Side height', on:'Always on', text:'Text', size:'Size', fires:'Activates', dir:'Direction', power:'Power', speed:'Speed', reach:'Reach', width:'Air width', goal:'Puzzle goal', look:'Appearance', hp:'Hit points',minHit:'Minimum hit speed',hitBy:'Hit by',eats:'Eats drawings',kind:'Kind',s:'Scale',every:'Seconds between releases',first:'First release (seconds)',run:'Run time (seconds)',metal:'Magnetic',density:'Weight',flip:'Flip',hang:'Hanging',accept:'Accepts',moving:'Moving','move.dx':'Horizontal travel','move.dy':'Vertical travel','move.period':'Travel time (seconds)','move.phase':'Starting phase','tie.0':'Tie X','tie.1':'Tie Y','limit.0':'Minimum angle (degrees)','limit.1':'Maximum angle (degrees)',allow:'Allowed crayons',friction:'Friction',torque:'Motor strength' };
  const materials = Object.keys(CC.BALLS);
  Object.assign(labels, {lips:'Side stops',xs:'Drop offsets'});
  const appearances = ['grumbox','knight','jelly','cloud','eater','clock','snail','robot','king','dragon'];
  const names = {rubber:'Standard',tennis:'Bouncy',marble:'Marble',bowling:'Heavy',beach:'Light',steel:'Steel',egg:'Fragile',meatball:'Soft',ball:'Any Pochaco',any:'Any moving object',grumbox:'Grumbox',knight:'Sir Tipsy',jelly:'Boingo',cloud:'Nimbus',eater:'Scribble Eater',clock:'Tick-Tock',snail:'Turbo Snail',robot:'Magneto',king:'The Chaos King',dragon:'The Crayon Dragon',tube:'Dispenser',hen:'Hen',cannon:'Repeating cannon'};
  let level, selected = -1, tool = 'select', history = [], future = [], sim, drag = null, noteTimer, draftTimer, capture = null, libraryObserver, homeTab = 'studio';
  let sketchbook = Kit.read('library', []);
  let pendingDelete = null;
  if (!Array.isArray(sketchbook)) sketchbook = [];
  try { sketchbook = sketchbook.map(l => Kit.validate(l)).slice(0, 100); } catch (e) { sketchbook = []; }
  window.addEventListener('pochadraw:cloud', ({ detail }) => {
    if (detail.key === 'library') {
      try {
        const next = detail.value.map(l => Kit.validate(l));
        const deletedCurrent = level && sketchbook.some(l => l.id === level.id) && !next.some(l => l.id === level.id);
        sketchbook = next;
        if (deletedCurrent) { Kit.deleteLevel(level.id); forgetCurrentLevel(level.id); notify('This level was deleted.'); }
        $('#savedCount').textContent = sketchbook.length;
        if (!$('#studioPanel').hidden && !$('#studioLibrary').hidden) library();
        if (level) syncSaveButton();
      }
      catch (e) { notify('A cloud puzzle could not be opened.'); }
    }
  });
  const snapshot = () => ({ level: Kit.clone(level), selected });
  const notify = message => { $('#notification').textContent = message; $('#notification').hidden = false; clearTimeout(noteTimer); noteTimer = setTimeout(() => $('#notification').hidden = true, 3800); };
  function saveDraft() {
    clearTimeout(draftTimer);
    draftTimer = setTimeout(() => {
      try { Kit.write('draft', level); }
      catch (e) { notify('Browser storage is full or unavailable. Free some browser storage and try saving again.'); }
    }, 200);
  }
  function forgetCurrentLevel(id) {
    if (level?.id !== id) return;
    clearTimeout(draftTimer);
    level = Kit.blank(); selected = -1; history = []; future = []; refresh();
    if (!$('#editorPanel').hidden) showTab('studio', true, false);
  }
  function remember(before) { history.push(before); if (history.length > 70) history.shift(); future = []; }
  function change(fn, keepHint) {
    const before = snapshot();
    try {
      fn();
      if (!keepHint) { level.solution = []; delete level.hintVerified; }
      level = Kit.validate(level); remember(before); refresh(); saveDraft();
    } catch (e) { level = before.level; selected = before.selected; refresh(); notify(e.message); }
  }
  function undo(redo) {
    const from = redo ? future : history, to = redo ? history : future;
    if (!from.length) return;
    to.push(snapshot()); const previous = from.pop(); level = previous.level; selected = previous.selected; refresh(); saveDraft();
  }
  function setLevel(next) {
    level = Kit.validate(next); selected = -1; history = []; future = []; setTool('select'); showProperties('object'); refresh(); saveDraft();
  }
  function writeLibrary() {
    try { Kit.write('library', sketchbook); $('#savedCount').textContent = sketchbook.length; return true; }
    catch (e) { notify('Could not save to this browser. Free some browser storage and try again.'); return false; }
  }
  function saveToLibrary(quiet) {
    // Commit an in-progress property edit, including when using Ctrl/Cmd+S.
    if ($('#editorPanel').contains(document.activeElement)) document.activeElement.blur();
    if (syncSaveButton()) return true;
    const current = Kit.validate(level), i = sketchbook.findIndex(l => l.id === current.id);
    const old = sketchbook.slice();
    if (i >= 0) sketchbook[i] = current; else if (sketchbook.length >= 100) { notify('Your sketchbook has 100 puzzles. Remove one before adding another.'); return false; } else sketchbook.unshift(current);
    if (!writeLibrary()) { sketchbook = old; return false; }
    syncSaveButton(); return true;
  }
  function preserveDraft() {
    const draft = Kit.read('draft', null);
    if ((!$('#editorPanel').hidden || draft?.id === level.id) && level.parts.length) {
      if (!saveToLibrary(true)) return false;
      clearTimeout(draftTimer);
      try { Kit.write('draft', level); }
      catch { notify('Could not keep your draft in this browser. Try saving again.'); return false; }
    }
    return true;
  }
  function setTool(next) {
    tool = next;
    $('#selectTool').setAttribute('aria-pressed', String(next === 'select'));
    document.querySelectorAll('.toy').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.toy === next)));
    cv.style.cursor = next === 'select' ? 'default' : 'crosshair';
  }
  function drawTo(canvas, lv, selectedIndex = -1, hint = false) {
    const c = canvas.getContext('2d'), sketch = canvas === cv ? cr : new Crayon(c), scale = canvas.width / 1600;
    sketch.res = scale; sketch.boil = 0;
    const world = canvas === cv ? sim : new Sim(lv, []);
    c.setTransform(scale, 0, 0, scale, 0, 0);
    const g = { ctx:c, cr:sketch, t:0 };
    Draw.paper(g, lv.paper || (WORLDS[lv.world] || {}).paper || 'graph'); Draw.floor(g);
    for (const p of world.parts) { const r = Draw.R[p.type]; if (r && r.stat) r.stat(g, p, world); }
    for (const p of world.parts) { const r = Draw.R[p.type]; if (r && r.live) r.live(g, p, world); }
    if (hint && lv.solution.length) Draw.ghost(g, lv.solution, .6);
    if (selectedIndex >= 0 && lv.parts[selectedIndex]) {
      const p = lv.parts[selectedIndex], box = Kit.bounds(p), pad = .12;
      c.save(); c.strokeStyle = '#3565b3'; c.lineWidth = 2.5; c.setLineDash([8,6]);
      c.fillStyle = '#3565b311'; c.fillRect((box[0]-pad)*100,(box[1]-pad)*100,(box[2]-box[0]+pad*2)*100,(box[3]-box[1]+pad*2)*100);
      c.strokeRect((box[0]-pad)*100,(box[1]-pad)*100,(box[2]-box[0]+pad*2)*100,(box[3]-box[1]+pad*2)*100); c.setLineDash([]);
      const handles = p.x1 != null && p.x2 != null && p.y1 != null && p.y2 != null ? [[p.x1,p.y1],[p.x2,p.y2]] : [[box[0],box[1]],[box[2],box[3]]];
      for (const [x,y] of handles) { c.fillStyle = '#fffdf7'; c.fillRect(x*100-6,y*100-6,12,12); c.strokeRect(x*100-6,y*100-6,12,12); }
      c.restore();
    }
  }
  function render() { drawTo(cv, level, selected, $('#showHint').checked); }
  const editableFields = '#levelName,#levelStory,#levelTip,#levelInk,#levelPaper,#goalMode,#goalStars,#goalNeed,#goalOf,#livePlay,#liveTime,#liveFade,[data-field],[data-crayon]';
  const fieldValue = input => input.type === 'checkbox' ? String(input.checked) : input.value;
  function syncSaveButton() {
    const saved = sketchbook.find(item => item.id === level.id);
    const pendingInput = Array.from($('#editorPanel').querySelectorAll(editableFields)).some(input => fieldValue(input) !== input.dataset.committedValue);
    const clean = !!saved && !pendingInput && JSON.stringify(saved) === JSON.stringify(level);
    $('#saveLevel').textContent = clean ? 'Saved' : 'Save';
    $('#saveLevel').disabled = clean;
    return clean;
  }
  $('#editorPanel').addEventListener('input', syncSaveButton);
  function refresh() {
    sim = new Sim(level, []); render(); settings(); inspector();
    $('#undoEdit').disabled = !history.length; $('#redoEdit').disabled = !future.length;
    $('#showHint').disabled = !level.solution.length;
    $('#editorPanel').querySelectorAll(editableFields).forEach(input => input.dataset.committedValue = fieldValue(input));
    syncSaveButton();
  }
  function settings() {
    $('#levelName').value = level.name; $('#levelStory').value = level.story; $('#levelTip').value = level.tip;
    $('#goalMode').value = level.goal?.stars ? 'stars' : level.goal?.need ? 'deliveries' : 'any';
    $('#goalStars').value=level.goal?.stars||1;$('#goalNeed').value=level.goal?.need||1;$('#goalOf').value=level.goal?.of||1;
    $('#starGoalField').hidden=$('#goalMode').value!=='stars';$('#deliveryGoalFields').hidden=$('#goalMode').value!=='deliveries';
    $('#livePlay').checked=!!level.live;$('#liveFields').hidden=!level.live;$('#liveTime').value=level.live?.time||45;$('#liveFade').value=level.live?.fade||0;
    $('#levelInk').value = level.ink; $('#levelPaper').value = level.paper; $('#liveNote').hidden = !level.live;
    document.querySelectorAll('[data-crayon]').forEach(c => c.checked = level.crayons.includes(c.dataset.crayon));
  }
  function fieldGet(p, key) {
    if (key === 'moving') return !!p.move;
    if (key === 'lips') return p.lips?.length === 2 ? 'both' : p.lips?.[0] === -1 ? 'left' : p.lips?.[0] === 1 ? 'right' : '';
    if (key.startsWith('limit.') && typeof p.limit === 'number') return key === 'limit.0' ? -p.limit : p.limit;
    if (/^(start|end)[XY]$/.test(key)) {
      const first = key.startsWith('start'), axis = key.endsWith('X') ? 0 : 1;
      return (p.type === 'wire' ? p[first ? 'from' : 'to'] : p.pts[first ? 0 : p.pts.length-1])[axis];
    }
    return key.split('.').reduce((value, part) => value?.[part], p);
  }
  function fieldSet(p, key, value) {
    if (key === 'moving') { if (value) p.move = {dx:2,dy:0,period:4}; else delete p.move; return; }
    if (key === 'lips') { p.lips = value === 'both' ? [-1,1] : value === 'left' ? [-1] : value === 'right' ? [1] : []; return; }
    if (/^(start|end)[XY]$/.test(key)) {
      const first = key.startsWith('start'), axis = key.endsWith('X') ? 0 : 1;
      (p.type === 'wire' ? p[first ? 'from' : 'to'] : p.pts[first ? 0 : p.pts.length-1])[axis] = value; return;
    }
    if (key.startsWith('tie.') && !p.tie) p.tie=[p.x,p.y+1];
    if (key.startsWith('limit.') && !Array.isArray(p.limit)) p.limit=[-(p.limit||.5),p.limit||.5];
    const parts = key.split('.'), leaf = parts.pop();
    let parent = p;
    for (let i=0;i<parts.length;i++) parent = parent[parts[i]] ||= /^\d+$/.test(i+1<parts.length ? parts[i+1] : leaf) ? [] : {};
    if (value === undefined) delete parent[leaf]; else parent[leaf] = value;
    if (key === 'kind' && p.type === 'dispenser' && value !== 'hen') p.x ??= (p.x1+p.x2)/2;
    if (key === 'kind' && p.type === 'dispenser' && value === 'hen') {
      p.x1 ??= p.x-1; p.x2 ??= p.x+1;
      if (p.x2 <= p.x1) p.x2 = p.x1+2;
    }
  }
  function angleField(p, key) { return key.startsWith('limit.') || ['angle','rot'].includes(key) && !(p.type === 'cannon' || p.type === 'dispenser'); }
  function makeField(p, key) {
    const label = document.createElement('label'); label.className = 'field'; label.append(document.createTextNode(labels[key] || key));
    let input, value = fieldGet(p,key);
    const styleOptions = {ball:materials,dispenser:materials,cup:['basket','bucket','bowl','nest'],block:['wood','box','books'],plank:['wood','metal'],gate:['wood','metal']};
    const choices = key === 'style' ? styleOptions[p.type] : key === 'ball.style' ? materials : key === 'look' ? appearances : key === 'kind' ? p.type === 'deco' ? ['cloud','sun'] : ['tube','hen','cannon'] : key === 'accept' ? ['ball','any',...materials] : key === 'hitBy' ? ['','ball'] : key === 'lips' ? ['','left','right','both'] : key === 'back' ? ['', 'left', 'right'] : key === 'dir' ? p.type === 'fan' ? ['right','left','up','down'] : [-1,1] : null;
    if (choices) {
      input = document.createElement('select');
      for (const v of choices) { const o = document.createElement('option'); o.value=v; o.textContent=key === 'dir' && typeof v === 'number' ? v < 0 ? 'Left' : 'Right' : names[v] || v || (key==='hold' ? 'Falls at Play' : key==='hitBy' ? 'Any moving object' : 'Neither'); input.append(o); }
      const fallback = key === 'style' ? p.type === 'cup' ? 'basket' : p.type === 'block' || p.type === 'plank' || p.type === 'gate' ? 'wood' : 'rubber' : key === 'accept' ? 'ball' : key === 'ball.style' ? 'meatball' : key === 'dir' ? p.type === 'fan' ? 'right' : 1 : '';
      input.value = value ?? fallback;
    } else {
      input = document.createElement('input');
      if (typeof value === 'boolean' || ['on','metal','goal','eats','flip','hang','moving'].includes(key)) { input.type='checkbox'; input.checked=key==='goal' ? value!==false : !!value; }
      else if (!['text','name','fires','when','hold','allow','xs'].includes(key)) {
        input.type='number'; input.step=['n','count','hp'].includes(key) ? '1' : '0.1';
        if (value == null && key==='r' && p.type==='ball') value=CC.BALLS[p.style||'rubber'].r;
        input.value=value==null ? '' : angleField(p,key) ? Math.round(value*180/Math.PI*10)/10 : value;
      } else { input.type='text'; input.maxLength=key==='text' ? 300 : 80; input.value=Array.isArray(value) ? value.join(', ') : value || ''; }
      if (['when','fires','hold'].includes(key)) { input.setAttribute('list','triggerSignals'); input.placeholder=key==='fires' ? 'signal1' : key==='hold' ? 'Empty falls at Play' : 'start or signal name'; }
      if (key==='xs') input.placeholder='0';
    }
    input.dataset.field=key;
    input.addEventListener('change', () => change(() => {
      const object=level.parts[selected]; let next;
      if (input.type==='checkbox') next=input.checked;
      else if (input.type==='number') {
        next=input.value==='' ? undefined : Number(input.value);
        if(next !== undefined && !Number.isFinite(next)) throw new Error('Enter a valid number.');
        if(next !== undefined && angleField(object,key)) next *= Math.PI/180;
      } else if (key==='dir' && object.type!=='fan') next=Number(input.value);
      else if (!input.value && ['hold','back','when','hitBy'].includes(key)) next=undefined;
      else if(key==='xs') next=input.value.trim() ? input.value.split(',').map(Number) : undefined;
      else next=['fires','allow'].includes(key) ? input.value.split(',').map(s=>s.trim()).filter(Boolean) : input.value;
      fieldSet(object,key,next);
    }));
    input.dataset.committedValue = fieldValue(input);
    label.append(input); return label;
  }
  function showProperties(name) {
    const object = name === 'object';
    $('#objectInspector').hidden = !object; $('#puzzleProperties').hidden = object;
    for (const [id, active] of [['#tabObject', object], ['#tabPuzzle', !object]]) {
      $(id).setAttribute('aria-selected', String(active)); $(id).tabIndex = active ? 0 : -1;
    }
  }
  $('#tabObject').onclick = () => showProperties('object');
  $('#tabPuzzle').onclick = () => showProperties('puzzle');
  document.querySelector('.properties-tabs').addEventListener('keydown', ev => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(ev.key)) return;
    ev.preventDefault();
    const object = ev.key === 'Home' || (ev.key !== 'End' && $('#tabObject').getAttribute('aria-selected') !== 'true');
    showProperties(object ? 'object' : 'puzzle'); $(object ? '#tabObject' : '#tabPuzzle').focus();
  });
  function inspector() {
    const box = $('#objectInspector'); box.replaceChildren();
    const p=level.parts[selected];
    if(!p) { const empty=document.createElement('div'); empty.className='empty-inspector'; empty.innerHTML='<span aria-hidden="true">↖</span><strong>Pick something on the paper.</strong><p>Move it, give it a little nudge, or make it your own.</p>'; box.append(empty); return; }
    const heading=document.createElement('div'); heading.className='selected-heading';
    const name=document.createElement('strong'); name.textContent=(toys.find(t=>t[0] === (p.type==='dispenser' ? p.kind==='hen' ? 'hen' : p.kind==='cannon' ? 'repeater' : 'dispenser' : p.type==='deco' ? p.kind : p.type))||['',p.type])[1];
    const number=document.createElement('span'); number.textContent='OBJECT '+String(selected+1).padStart(2,'0'); heading.append(name,number); box.append(heading);
    const dispenserFields = p.kind==='hen' ? ['x1','x2','y','speed'] : ['x','y',...(p.kind==='cannon' ? ['angle','speed'] : ['xs'])];
    const list=((p.type==='dispenser' ? ['kind',...dispenserFields,'style','count','every','first','when'] : fields[p.type]) || Object.keys(p).filter(k=>!['type'].includes(k)&&['string','number','boolean'].includes(typeof p[k]))).slice();
    if (p.move) list.push(...['move.dx','move.dy','move.period','move.phase'].filter(key=>!list.includes(key)));
    const signals=$('#triggerSignals');signals.replaceChildren();for(const signal of new Set(['start','signal1',...level.parts.flatMap(item=>[item.when,...[].concat(item.fires||[])])].filter(Boolean))){const option=document.createElement('option');option.value=signal;signals.append(option);}
    let row;
    for(const key of list) { if(!row||row.children.length===2) { row=document.createElement('div'); row.className='field-row'; box.append(row); } row.append(makeField(p,key)); }
    const acts=document.createElement('div'); acts.className='object-actions';
    const duplicate=document.createElement('button'); duplicate.className='button'; duplicate.textContent='Duplicate'; duplicate.onclick=duplicateSelected;
    const remove=document.createElement('button'); remove.className='button danger'; remove.textContent='Remove'; remove.onclick=removeSelected; acts.append(duplicate,remove); box.append(acts);
  }
  function removeSelected() { if(selected>=0) change(()=>{level.parts.splice(selected,1);selected=-1;}); }
  function duplicateSelected() {
    if(selected<0) return;
    change(()=>{const p=Kit.clone(level.parts[selected]); Kit.move(p,.4,-.4); if(p.id) p.id+='-copy'; level.parts.push(p); selected=level.parts.length-1;});
  }
  const snap=n=>$('#snapGrid').checked ? Math.round(n*5)/5 : Math.round(n*1000)/1000;
  function point(ev) { const r=cv.getBoundingClientRect(); return [snap(Math.max(0,Math.min(16,(ev.clientX-r.left)/r.width*16))),snap(Math.max(0,Math.min(8.6,(ev.clientY-r.top)/r.height*9)))]; }
  function hit(q) {
    for(let i=level.parts.length-1;i>=0;i--) {
      const p=level.parts[i],b=Kit.bounds(p);
      if(p.x1!=null && p.y1!=null && p.x2!=null && p.y2!=null) { if(geom.segDist(q,[p.x1,p.y1],[p.x2,p.y2])<.23) return i; }
      else if(q[0]>=b[0]-.15&&q[0]<=b[2]+.15&&q[1]>=b[1]-.15&&q[1]<=b[3]+.15) return i;
    } return -1;
  }
  cv.addEventListener('pointerdown',ev=>{
    if(ev.button>0) return; ev.preventDefault(); cv.focus({preventScroll:true}); try { cv.setPointerCapture(ev.pointerId); } catch (e) { /* Pointer may already have been released. */ }
    const q=point(ev), before=snapshot();
    showProperties('object');
    if(tool!=='select') {
      if(level.parts.length>=120) {notify('A puzzle can have up to 120 objects.');return;}
      const def=toys.find(t=>t[0]===tool)[3](q);
      level.parts.push(def); selected=level.parts.length-1;
      if(tool==='plank') { def.x1=q[0];def.y1=q[1];def.x2=q[0]+.2;def.y2=q[1];drag={kind:'create',q,before}; }
      else { level=before.level;change(()=>{level.parts.push(def);selected=level.parts.length-1;});setTool('select'); }
      sim=new Sim(level,[]);render();inspector();return;
    }
    let handle;
    const p=level.parts[selected];
    if(p&&p.x1!=null&&p.y1!=null&&p.x2!=null&&p.y2!=null) {
      if(Math.hypot(q[0]-p.x1,q[1]-p.y1)<.25) handle=1;
      else if(Math.hypot(q[0]-p.x2,q[1]-p.y2)<.25) handle=2;
    }
    if(!handle) selected=hit(q);
    if(selected>=0) drag={kind:handle?'handle':'move',handle,q,before,original:Kit.clone(level.parts[selected])};
    render();inspector();
  });
  cv.addEventListener('pointermove',ev=>{
    const q=point(ev); $('#coordinates').textContent='x '+q[0].toFixed(1)+'  /  y '+q[1].toFixed(1);
    if(!drag) return;
    const p=level.parts[selected];
    if(drag.kind==='create') {p.x2=q[0];p.y2=q[1];if(Math.hypot(p.x2-p.x1,p.y2-p.y1)<.12)p.x2=p.x1+.2;}
    else if(drag.kind==='handle') {p['x'+drag.handle]=q[0];p['y'+drag.handle]=q[1];if(Math.hypot(p.x2-p.x1,p.y2-p.y1)<.12){p.x2=p.x1+.2;p.y2=p.y1;}}
    else {level.parts[selected]=Kit.clone(drag.original);Kit.move(level.parts[selected],q[0]-drag.q[0],q[1]-drag.q[1]);}
    sim=new Sim(level,[]);render();
  });
  function finishDrag(cancelled) {
    if(!drag)return; const before=drag.before;drag=null;
    if(cancelled){level=before.level;selected=before.selected;refresh();return;}
    if(JSON.stringify(level)!==JSON.stringify(before.level)) {
      try { level.solution=[];delete level.hintVerified;level=Kit.validate(level);remember(before);refresh();saveDraft();setTool('select'); }
      catch(e){level=before.level;selected=before.selected;refresh();notify(e.message);}
    } else inspector();
  }
  cv.addEventListener('pointerup',()=>finishDrag(false));cv.addEventListener('pointercancel',()=>finishDrag(true));
  window.addEventListener('keydown',ev=>{
    if(ev.defaultPrevented || $('#studioPanel').hidden || $('#editorPanel').hidden || ev.target.closest('input,textarea,select') || document.querySelector('dialog[open]'))return;
    const mod=ev.ctrlKey||ev.metaKey,key=ev.key.toLowerCase();
    if(mod&&key==='z'){ev.preventDefault();undo(ev.shiftKey);}
    else if(mod&&key==='y'){ev.preventDefault();undo(true);}
    else if(mod&&key==='d'){ev.preventDefault();duplicateSelected();}
    else if(mod&&key==='s'){ev.preventDefault();saveToLibrary();}
    else if(key==='v'||key==='escape'){setTool('select');selected=-1;render();inspector();}
    else if((key==='delete'||key==='backspace')&&selected>=0){ev.preventDefault();removeSelected();}
    else if(selected>=0&&['arrowleft','arrowright','arrowup','arrowdown'].includes(key)){ev.preventDefault();const n=ev.shiftKey?.5:.1;change(()=>Kit.move(level.parts[selected],key==='arrowleft'?-n:key==='arrowright'?n:0,key==='arrowup'?-n:key==='arrowdown'?n:0));}
  });
  for(const [id,name,icon] of toys) {
    const b=document.createElement('button');b.className='toy';b.dataset.toy=id;b.setAttribute('aria-pressed','false');b.setAttribute('aria-label','Place '+name);
    b.innerHTML=(id === 'ball' ? '<img src="assets/pochaco.png" alt="">' : '<svg viewBox="0 0 40 34" aria-hidden="true" fill="none" stroke="#675b43" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'+icon+'</svg>')+'<span>'+name+'</span>';
    b.onclick=()=>setTool(id);$('#palette').append(b);
  }
  Kit.crayons.forEach((kind,i)=>{
    const label=document.createElement('label');label.className='crayon-check';label.title=NAMES[i];label.style.setProperty('--color',COLORS[i]);
    const input=document.createElement('input');input.type='checkbox';input.dataset.crayon=kind;input.setAttribute('aria-label',NAMES[i]);
    input.onchange=()=>change(()=>{level.crayons=Array.from(document.querySelectorAll('[data-crayon]:checked')).map(c=>c.dataset.crayon);});
    const stick=document.createElement('span');label.append(input,stick);$('#crayonOptions').append(label);
  });
  for(const [selector,key] of [['#levelName','name'],['#levelStory','story'],['#levelTip','tip'],['#levelPaper','paper']]) $(selector).onchange=ev=>change(()=>level[key]=ev.target.value,true);
  $('#goalMode').onchange=ev=>change(()=>{
    if(ev.target.value==='any') delete level.goal;
    else if(ev.target.value==='stars') level.goal={stars:Math.max(1,level.parts.filter(p=>p.type==='star').length)};
    else {const total=Math.max(1,level.parts.reduce((n,p)=>n+(p.type==='ball'?1:p.type==='dispenser'?p.count:0),0));level.goal={need:total,of:total};}
  });
  for(const [id,key] of [['#goalStars','stars'],['#goalNeed','need'],['#goalOf','of']]) $(id).onchange=ev=>change(()=>level.goal[key]=Number(ev.target.value));
  $('#livePlay').onchange=ev=>change(()=>{if(ev.target.checked)level.live={ink:level.ink,time:45};else delete level.live;});
  $('#liveTime').onchange=ev=>change(()=>level.live.time=Number(ev.target.value));
  $('#liveFade').onchange=ev=>change(()=>{const fade=Number(ev.target.value);if(!Number.isFinite(fade)||fade<0||fade>300)throw new Error('Drawing lifetime must be between 0 and 300 seconds.');if(fade)level.live.fade=fade;else delete level.live.fade;});
  $('#levelInk').onchange=ev=>change(()=>{level.ink=Number(ev.target.value);level.par=[level.ink*.5,level.ink*.75];if(level.live)level.live.ink=level.ink;});
  $('#selectTool').onclick=()=>setTool('select');$('#undoEdit').onclick=()=>undo(false);$('#redoEdit').onclick=()=>undo(true);$('#showHint').onchange=render;
  $('#saveLevel').onclick=()=>saveToLibrary();
  function library() {
    const list = $('#libraryList'); list.replaceChildren();
    libraryObserver?.disconnect();
    const previews = new Map();
    libraryObserver = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        drawTo(entry.target, previews.get(entry.target)); previews.delete(entry.target); libraryObserver.unobserve(entry.target);
      }
    }, { rootMargin: '200px' });
    const levels = sketchbook.slice();
    const draft = Kit.read('draft', null);
    if (draft) {
      try {
        const current = Kit.validate(draft), index = levels.findIndex(lv => lv.id === current.id);
        if (index < 0) levels.unshift(current); else levels[index] = current;
      } catch { /* Ignore an invalid browser draft. */ }
    }
    $('#savedCount').textContent = levels.length;
    if (!levels.length) {
      const empty = document.createElement('div'); empty.className = 'empty-library';
      empty.innerHTML = '<span aria-hidden="true">▤</span><h3>No levels yet</h3><p>Make your first level, or remix one from Levels.</p>';
      list.append(empty);
    }
    for (const lv of levels) {
      const saved = sketchbook.some(item => item.id === lv.id);
      const card = document.createElement('article'); card.className = 'studio-card campaign-card'; card.dataset.levelId = lv.id;
      const thumbnail = document.createElement('a'); thumbnail.href = 'index.html?from=studio#level=' + Kit.encode(lv); thumbnail.setAttribute('aria-label', 'Play ' + lv.name);
      const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 180; canvas.setAttribute('aria-hidden', 'true'); thumbnail.append(canvas);
      const title = document.createElement('h3'); title.textContent = lv.name;
      const goal = document.createElement('p'); goal.textContent = lv.story;
      const meta = document.createElement('p'); meta.className = 'studio-meta'; meta.textContent = (saved ? '' : 'Draft · ') + lv.parts.length + ' objects · ' + (lv.hintVerified ? 'Solved hint included' : lv.solution.length ? 'Hint included' : 'No hint yet');
      const actions = document.createElement('div'); actions.className = 'actions level-actions';
      const edit = document.createElement('button'); edit.className = 'button'; edit.textContent = 'Edit'; edit.onclick = () => openEditor(lv);
      const play = document.createElement('a'); play.className = 'button'; play.textContent = 'Play'; play.href = thumbnail.href;
      actions.append(edit, play);
      const del = document.createElement('button'); del.className = 'button danger'; del.textContent = 'Delete'; del.setAttribute('aria-label', 'Delete ' + lv.name);
      del.onclick = () => { pendingDelete = lv.id; $('#deleteLevelName').textContent = lv.name; $('#deleteDialog').showModal(); };
      actions.append(del);
      card.append(thumbnail, title, goal, meta, actions); list.append(card);
      previews.set(canvas, lv); libraryObserver.observe(canvas);
    }
  }
  $('#deleteDialog').addEventListener('close', () => pendingDelete = null);
  $('#confirmDelete').onclick = () => {
    if (!pendingDelete) return;
    const id = pendingDelete;
    try {
      sketchbook = Kit.deleteLevel(id);
      forgetCurrentLevel(id);
      library(); $('#deleteDialog').close(); $('#createLevel').focus();
      notify('Level deleted.');
    } catch { notify('Could not delete this level. Please try again.'); }
  };
  function updateViewUrl(name, editId) {
    const url = new URL(location.href); url.searchParams.set('tab', name);
    for (const key of ['campaign', 'library', 'new', 'edit', 'from']) url.searchParams.delete(key);
    url.hash = '';
    if (editId) { url.searchParams.set('edit', editId); url.searchParams.set('from', homeTab); }
    window.history.replaceState(null, '', url);
  }
  function showTab(name, updateUrl = true, preserve = true) {
    if (preserve && !$('#editorPanel').hidden && !preserveDraft()) return;
    const levels = name === 'levels';
    $('#levelsPanel').hidden = !levels; $('#studioPanel').hidden = levels;
    $('#editorPanel').hidden = true; $('#studioLibrary').hidden = false;
    $('#btnHome').hidden = true; document.querySelector('.workspace-tabs').hidden = false;
    for (const [id, selected] of [['#tabLevels', levels], ['#tabStudio', !levels]]) {
      $(id).setAttribute('aria-selected', String(selected)); $(id).tabIndex = selected ? 0 : -1;
    }
    if (levels) campaignList(); else library();
    if (updateUrl) updateViewUrl(name);
  }
  function openEditor(next, preserve = true, updateUrl = true, origin) {
    if (preserve && !preserveDraft()) return;
    if ($('#editorPanel').hidden) homeTab = ['levels', 'studio'].includes(origin) ? origin : $('#levelsPanel').hidden ? 'studio' : 'levels';
    showTab('studio', false, false);
    setLevel(next);
    $('#studioLibrary').hidden = true; $('#editorPanel').hidden = false;
    $('#btnHome').hidden = false; document.querySelector('.workspace-tabs').hidden = true;
    if (updateUrl) updateViewUrl('studio', level.id);
    window.scrollTo({ top: 0 });
  }
  $('#tabLevels').onclick = () => showTab('levels');
  $('#tabStudio').onclick = () => showTab('studio');
  $('#btnHome').onclick = () => showTab(homeTab);
  document.querySelector('.workspace-tabs').addEventListener('keydown', ev => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(ev.key)) return;
    ev.preventDefault();
    const levels = ev.key === 'Home' || (ev.key !== 'End' && $('#tabLevels').getAttribute('aria-selected') !== 'true');
    showTab(levels ? 'levels' : 'studio'); $(levels ? '#tabLevels' : '#tabStudio').focus();
  });
  function updateCampaignProgress() {
    let progress = {};
    try { progress = JSON.parse(localStorage.getItem('pd-game-progress') || '{}'); } catch { /* Keep the catalog usable with an invalid local cache. */ }
    document.querySelectorAll('[data-stars-for]').forEach(el => {
      const stars = Math.max(0, Math.min(3, Number(progress[el.dataset.starsFor]) || 0));
      el.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars); el.setAttribute('aria-label', stars + ' stars');
    });
  }
  function campaignList() {
    const list = $('#campaignList');
    if (list.childElementCount) { updateCampaignProgress(); return; }
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        drawTo(entry.target, LEVELS[Number(entry.target.dataset.levelIndex)]); observer.unobserve(entry.target);
      }
    }, { rootMargin: '200px' });
    WORLDS.forEach((world, wi) => {
      const section = document.createElement('section'); section.className = 'world-section'; section.id = 'world-' + wi;
      const heading = document.createElement('h2'); heading.id = section.id + '-title'; heading.textContent = (wi + 1) + '. ' + world.name; section.setAttribute('aria-labelledby', heading.id);
      const row = document.createElement('div'); row.className = 'world-levels level-grid'; row.setAttribute('aria-label', world.name + ' levels');
      LEVELS.filter(lv => lv.world === wi).forEach(lv => {
        const card = document.createElement('article'); card.className = 'campaign-card';
        const thumbnail = document.createElement('a'); thumbnail.href = 'index.html?from=levels&level=' + (lv.n - 1); thumbnail.setAttribute('aria-label', 'Play ' + lv.name);
        const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 180; canvas.dataset.levelIndex = lv.n - 1; canvas.setAttribute('aria-hidden', 'true'); thumbnail.append(canvas);
        const title = document.createElement('h3'); title.textContent = lv.n + '. ' + lv.name;
        const goal = document.createElement('p'); goal.textContent = lv.story;
        const actions = document.createElement('div'); actions.className = 'level-actions';
        const stars = document.createElement('span'); stars.className = 'level-stars'; stars.dataset.starsFor = lv.id;
        const play = document.createElement('a'); play.className = 'button'; play.textContent = 'Play'; play.href = thumbnail.href;
        const remix = document.createElement('button'); remix.className = 'button'; remix.textContent = 'Remix'; remix.onclick = () => openEditor(Kit.remix(lv));
        actions.append(stars, play, remix); card.append(thumbnail, title, goal, actions); row.append(card); observer.observe(canvas);
      });
      section.append(heading, row); list.append(section);
    });
    updateCampaignProgress();
  }
  const blankLevel = () => Kit.validate({ ...Kit.blank(), parts: [], story: 'Complete the contraption', tip: '', verb: 'HOORAY!' });
  $('#createLevel').onclick = () => $('#createDialog').showModal();
  $('#newBlankLevel').onclick = () => { $('#createDialog').close(); openEditor(blankLevel()); };
  window.addEventListener('pochadraw:cloud', ({ detail }) => {
    if (detail.key === 'progress') updateCampaignProgress();
    if (detail.key === 'draft') {
      if (detail.value === null && detail.previous?.id === level?.id) forgetCurrentLevel(level.id);
      if (!$('#studioPanel').hidden && !$('#studioLibrary').hidden) library();
    }
  });
  WORLDS.forEach((world,i)=>{const o=document.createElement('option');o.value=i;o.textContent=(i+1)+'. '+world.name;$('#worldFilter').append(o);});
  function remixList(){
    const list=$('#remixList');list.replaceChildren();
    LEVELS.filter(l=>l.world===Number($('#worldFilter').value)).forEach(lv=>{
      const b=document.createElement('button');b.className='remix-card';const c=document.createElement('canvas');c.width=320;c.height=180;c.setAttribute('aria-hidden','true');
      const name=document.createElement('strong');name.textContent=lv.n+'. '+lv.name;const note=document.createElement('small');note.textContent=(lv.live?'Live puzzle · ':'')+(lv.bossLevel?'Boss · ':'')+lv.parts.length+' objects';b.append(c,name,note);
      b.onclick=()=>{openEditor(Kit.remix(lv));$('#remixDialog').close();};
      list.append(b);drawTo(c,lv);
    });
  }
  $('#remixLevel').onclick=()=>{$('#createDialog').close();remixList();$('#remixDialog').showModal();};$('#worldFilter').onchange=remixList;
  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
  document.querySelectorAll('dialog.modal').forEach(d=>d.addEventListener('click',ev=>{if(ev.target===d){const r=d.getBoundingClientRect();if(ev.clientX<r.left||ev.clientX>r.right||ev.clientY<r.top||ev.clientY>r.bottom)d.close();}}));
  $('#testLevel').onclick=()=>{
    try{const lv=Kit.validate(level);if(!lv.parts.some(p=>['cup','bell','balloon','lamp','boss','flag'].includes(p.type)&&p.goal!==false)&&!(lv.goal&&lv.goal.stars))throw new Error('Add a goal, such as a basket, bell, or balloon, before testing.');
      capture=null;$('#recordHint').hidden=true;$('#testStatus').textContent='Draw your solution, then press GO.';$('#testTitle').textContent=lv.name;
      $('#playFrame').src='index.html?preview=1#level='+Kit.encode(lv);$('#testDialog').showModal();
    }catch(e){notify(e.message);}
  };
  function closeTest(){$('#testDialog').close();}
  $('#backToEditor').onclick=closeTest;$('#testDialog').addEventListener('close',()=>{$('#playFrame').src='about:blank';capture=null;});
  window.addEventListener('message',ev=>{
    if(ev.origin!==location.origin||ev.source!==$('#playFrame').contentWindow||!ev.data||ev.data.type!=='pochadraw:win'||ev.data.id!==level.id)return;
    if(!Array.isArray(ev.data.strokes))return;
    capture=ev.data.strokes;$('#testStatus').textContent='It works! Keep your winning drawing as a hint.';$('#recordHint').hidden=false;
  });
  $('#recordHint').onclick=()=>{
    if(!capture)return;
    try{
      const candidate=Kit.validate({...level,solution:capture}),timed=candidate.solution.filter(s=>s.at!=null).sort((a,b)=>a.at-b.at),world=new Sim(candidate,candidate.solution.filter(s=>s.at==null));world.quiet=true;world.start();
      while(world.t<(candidate.live?candidate.live.time||45:34)&&!world.won&&!world.stalled){while(timed.length&&timed[0].at<=world.t)world.addStroke(timed.shift());world.step();}
      if(!world.won)throw new Error('That run could not be replayed exactly. Try again without erasing during a live run.');
      change(()=>{level.solution=candidate.solution;level.hintVerified=true;const ink=candidate.solution.reduce((a,s)=>a+geom.inkOf(s),0);level.par=[Math.min(level.ink,Math.round(ink*10)/10),Math.min(level.ink,Math.round(ink*1.3*10)/10)];},true);
      closeTest();notify('Winning solution recorded and replay-checked. Save your puzzle to keep it.');
    }catch(e){notify(e.message);}
  };
  const params = new URLSearchParams(location.search), hash = new URLSearchParams(location.hash.slice(1));
  const draft = Kit.read('draft', null);
  try { level = Kit.validate(draft || Kit.blank()); }
  catch { level = Kit.blank(); }
  refresh();
  showTab(params.get('tab') === 'levels' ? 'levels' : 'studio', false);
  try {
    if (hash.has('level')) openEditor(Kit.decode(hash.get('level')), true, true, params.get('from'));
    else if (params.has('campaign')) openEditor(Kit.remix(LEVELS[Math.max(0, Math.min(99, Number(params.get('campaign')) || 0))]), true, true, 'levels');
    else if (params.has('new')) openEditor(blankLevel(), true, true, params.get('from'));
    else if (params.has('edit')) {
      const saved = (draft?.id === params.get('edit') ? draft : null) || sketchbook.find(lv => lv.id === params.get('edit'));
      if (saved) openEditor(saved, false, true, params.get('from'));
      else notify('This level is no longer in your Studio.');
    }
  } catch (e) { notify(e.message); }
  if (params.get('tab') === 'levels' && Number(params.get('world')) > 0) {
    requestAnimationFrame(() => document.querySelector('#world-' + Math.max(0, Math.min(WORLDS.length - 1, Number(params.get('world')) || 0)))?.scrollIntoView({ block: 'start' }));
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { CC.clearSprites(); cr.pats.clear(); render(); });
})();
