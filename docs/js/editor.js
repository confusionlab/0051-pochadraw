/* Pochadraw — the visual contraption studio. */
(function () {
  'use strict';
  const { Sim, Draw, Crayon, LEVELS, WORLDS, geom, LevelKit: Kit } = window.CC;
  const $ = s => document.querySelector(s);
  const cv = $('#editorCanvas'), ctx = cv.getContext('2d'), cr = new Crayon(ctx);
  const COLORS = ['#2e6bd6', '#f58a1f', '#3fa34d', '#e9b920', '#7a4fc0', '#e23b34', '#3a3844'];
  const NAMES = ['Blue · fixed', 'Orange · falls', 'Green · bouncy', 'Yellow · floats', 'Purple · hinged', 'Red · booster', 'Black · magnetic'];
  const toys = [
    ['ball', 'Ball', '<circle cx="20" cy="17" r="10" fill="#e86252"/><path d="M13 13q3-5 7-4"/>', p => ({ type: 'ball', x: p[0], y: p[1], style: 'rubber', hold: 'start' })],
    ['plank', 'Platform', '<path d="m4 22 31-10 2 6L6 27Z" fill="#c2986b"/><path d="m8 23 24-8"/>', p => ({ type: 'plank', x1: p[0]-1.5, y1: p[1], x2: p[0]+1.5, y2: p[1], t: 0.2 })],
    ['cup', 'Basket', '<path d="m7 11 3 16h21l3-16Z" fill="#d9b87c"/><path d="M8 15h25M10 22h22m-17-9 1 14m7-14v14m6-14-1 14"/>', p => ({ type: 'cup', x: p[0], y: p[1], w: 1.8, h: 1.1, style: 'basket' })],
    ['block', 'Block', '<path d="M7 7h26v22H7Z" fill="#d6ae7c"/><path d="m7 7 7 6h19M14 13v16"/>', p => ({ type: 'block', x: p[0]-.8, y: p[1]-.6, w: 1.6, h: 1.2, style: 'box' })],
    ['bell', 'Bell', '<path d="M10 24q5-5 4-13 6-6 12 0-1 8 4 13Z" fill="#eec95f"/><path d="M18 26q2 5 5 0M20 6V2"/>', p => ({ type: 'bell', x: p[0], y: p[1], size: 1, hang: true })],
    ['dominoes', 'Dominoes', '<path d="M4 10h7v19H4Zm13-3h7v22h-7Zm13-5h7v27h-7Z" fill="#efe5c7"/><path d="M5 19h5m9-2h4m9-3h4"/>', p => ({ type: 'dominoes', x: p[0], y: p[1], n: 5, gap: .45, h: .8 })],
    ['seesaw', 'Seesaw', '<path d="m15 28 6-12 6 12Z" fill="#e6ab72"/><path d="m3 15 34-7 1 5L4 20Z" fill="#ab9870"/>', p => ({ type: 'seesaw', x: p[0], y: p[1], len: 3.4, angle: -.2, limit: [-.4, .4], baseY: 8.7, t: .14 })],
    ['pusher', 'Pusher', '<path d="M5 12h13v10H5Z" fill="#af9270"/><path d="M18 8q8-4 13 3l4 7q-4 7-14 5l-3-4Z" fill="#e96658"/>', p => ({ type: 'pusher', x: p[0], y: p[1], dir: 1, reach: .8, speed: 3, when: 'start' })],
    ['balloon', 'Balloon', '<ellipse cx="20" cy="13" rx="10" ry="12" fill="#94b4db"/><path d="m19 25 3 2m-2-1q-5 4 0 7"/>', p => ({ type: 'balloon', x: p[0], y: p[1], r: .5 })],
    ['crate', 'Crate', '<path d="M8 5h25v24H8Z" fill="#c59e70"/><path d="m8 5 25 24m-25 0L33 5M9 11h23M9 23h23"/>', p => ({ type: 'crate', x: p[0], y: p[1], w: 1.1, h: 1.1, angle: 0 })],
    ['trampoline', 'Bounce pad', '<path d="M4 17h32v5H4Z" fill="#94b696"/><path d="m8 22-2 8m26-8 2 8M8 25h24"/>', p => ({ type: 'trampoline', x: p[0], y: p[1], w: 2, bounce: .92, angle: 0 })],
    ['fan', 'Fan', '<circle cx="20" cy="14" r="12" fill="#c9d9de"/><path d="M20 2v24M8 14h24m-20-8 16 16M12 22 28 6M20 26v5m-8 0h16"/>', p => ({ type: 'fan', x: p[0], y: p[1], dir: 'right', power: 6, reach: 5, on: true })],
    ['note', 'Note', '<path d="M8 2h24v27H8Z" fill="#f7da79"/><path d="M13 10h14m-14 5h14m-14 5h8"/>', p => ({ type: 'note', x: p[0], y: p[1], text: 'Draw something here!', size: 28 })],
    ['lava', 'Lava', '<path d="m3 20 5-8 6 6 6-11 6 13 8-9 4 17H3Z" fill="#e89a62"/><path d="m8 24 6-4 6 4 6-3 7 3"/>', p => ({ type: 'lava', x: p[0]-1, y: p[1], w: 2, h: .4 })]
  ];
  const fields = {
    ball: ['x','y','r','style','hold'], plank: ['x1','y1','x2','y2','t'], gate: ['x1','y1','x2','y2','t','id','when'],
    cup: ['x','y','w','h','back','backH'], block: ['x','y','w','h','text'], bell: ['x','y','size'],
    dominoes: ['x','y','n','gap','h'], seesaw: ['x','y','len','angle','baseY'], pusher: ['x','y','dir','reach','speed','when'],
    balloon: ['x','y','r'], crate: ['x','y','w','h','angle'], trampoline: ['x','y','w','bounce','angle'], fan: ['x','y','dir','power','reach','on'],
    note: ['x','y','text','size','rot'], label: ['x','y','text','you'], lava: ['x','y','w','h'], car: ['x','y','dir','speed','when'],
    button: ['x','y','w','angle','id','fires'], cannon: ['x','y','angle','speed','when'], star: ['x','y','r']
  };
  const labels = { x:'X position', y:'Y position', x1:'Start X', y1:'Start Y', x2:'End X', y2:'End Y', r:'Radius', w:'Width', h:'Height', t:'Thickness', len:'Length', n:'Count', baseY:'Base Y', bounce:'Bounciness', angle:'Angle (degrees)', rot:'Text angle (degrees)', gap:'Spacing', style:'Material', hold:'Release', when:'Triggered by', back:'Tall side', backH:'Side height', on:'Always on', you:'Player label', text:'Text', size:'Size', label:'Caption letter', id:'Mechanism ID', fires:'Activates IDs', dir:'Direction', power:'Power', speed:'Speed', reach:'Reach' };
  let level, selected = -1, tool = 'select', history = [], future = [], sim, drag = null, noteTimer, draftTimer, capture = null;
  let sketchbook = Kit.read('library', []);
  if (!Array.isArray(sketchbook)) sketchbook = [];
  try { sketchbook = sketchbook.map(l => Kit.validate(l)).slice(0, 100); } catch (e) { sketchbook = []; }
  const snapshot = () => ({ level: Kit.clone(level), selected });
  const notify = message => { $('#notification').textContent = message; $('#notification').hidden = false; clearTimeout(noteTimer); noteTimer = setTimeout(() => $('#notification').hidden = true, 3800); };
  function saveDraft() {
    clearTimeout(draftTimer); $('#saveState').textContent = 'Saving…';
    draftTimer = setTimeout(() => {
      try { Kit.write('draft', level); $('#saveState').textContent = 'Draft saved'; }
      catch (e) { $('#saveState').textContent = 'Export to keep a copy'; notify('Browser storage is full or unavailable. Export your puzzle as JSON.'); }
    }, 200);
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
    level = Kit.validate(next); selected = -1; history = []; future = []; setTool('select'); refresh(); saveDraft();
  }
  function writeLibrary() {
    try { Kit.write('library', sketchbook); $('#savedCount').textContent = sketchbook.length; return true; }
    catch (e) { notify('Could not save to this browser. Export your puzzle as JSON instead.'); return false; }
  }
  function saveToLibrary(quiet) {
    const current = Kit.validate(level), i = sketchbook.findIndex(l => l.id === current.id);
    const old = sketchbook.slice();
    if (i >= 0) sketchbook[i] = current; else if (sketchbook.length >= 100) { notify('Your sketchbook has 100 puzzles. Export or remove one before adding another.'); return false; } else sketchbook.unshift(current);
    if (!writeLibrary()) { sketchbook = old; return false; }
    if (!quiet) notify('Saved to your sketchbook.'); return true;
  }
  function preserveDraft() { if (level.parts.length && !saveToLibrary(true)) return false; return true; }
  function setTool(next) {
    tool = next;
    $('#selectTool').setAttribute('aria-pressed', String(next === 'select'));
    document.querySelectorAll('.toy').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.toy === next)));
    cv.style.cursor = next === 'select' ? 'default' : 'crosshair';
    $('#toolInstruction').textContent = next === 'select' ? 'Select a toy to move it. Drag the blue handles to resize a platform.' : next === 'plank' ? 'Click and drag across the paper to draw a platform.' : 'Click the paper to place a ' + (toys.find(t => t[0] === next) || ['',next])[1].toLowerCase() + '.';
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
  function refresh() {
    sim = new Sim(level, []); render(); settings(); inspector();
    $('#objectCount').textContent = level.parts.length + ' object' + (level.parts.length === 1 ? '' : 's');
    $('#undoEdit').disabled = !history.length; $('#redoEdit').disabled = !future.length;
    $('#solutionState').textContent = level.hintVerified ? 'Solved! A working hint is tucked into this puzzle.' : level.solution.length ? 'Includes an original hint. Edits to the puzzle will clear it.' : 'Play it, solve it, turn your drawing into a hint.';
    $('#showHint').disabled = !level.solution.length;
  }
  function settings() {
    $('#levelName').value = level.name; $('#levelStory').value = level.story; $('#levelTip').value = level.tip;
    $('#levelInk').value = level.ink; $('#levelPaper').value = level.paper; $('#liveNote').hidden = !level.live;
    document.querySelectorAll('[data-crayon]').forEach(c => c.checked = level.crayons.includes(c.dataset.crayon));
  }
  function makeField(p, key) {
    const label = document.createElement('label'); label.className = 'field'; label.append(document.createTextNode(labels[key] || key));
    let input;
    const choices = key === 'style' && p.type === 'ball' ? Object.keys(CC.BALLS) : key === 'hold' ? ['', 'start'] : key === 'back' ? ['', 'left', 'right'] : key === 'dir' && p.type === 'fan' ? ['right','left','up','down'] : null;
    if (choices) {
      input = document.createElement('select');
      for (const value of choices) { const o = document.createElement('option'); o.value=value; o.textContent=value || (key==='hold' ? 'Falls at GO' : 'Neither'); input.append(o); }
      input.value = p[key] ?? '';
    } else {
      input = document.createElement('input');
      if (typeof p[key] === 'boolean' || ['on','you'].includes(key)) { input.type='checkbox'; input.checked=!!p[key]; }
      else if (typeof p[key] === 'number' || !['text','label','id','fires','when'].includes(key)) {
        input.type='number'; input.step=key==='n' ? '1' : '0.1';
        let value = p[key];
        if (value == null && key==='r' && p.type==='ball') value=CC.BALLS[p.style||'rubber'].r;
        input.value=value==null ? '' : ['angle','rot'].includes(key) && p.type !== 'cannon' ? Math.round(value*180/Math.PI*10)/10 : value;
      } else { input.type='text'; input.maxLength=key==='text' ? 300 : 80; input.value=Array.isArray(p[key]) ? p[key].join(', ') : p[key] || ''; }
    }
    input.dataset.field=key;
    input.addEventListener('change', () => change(() => {
      const object=level.parts[selected];
      if (input.type==='checkbox') object[key]=input.checked;
      else if (input.type==='number') {
        if (input.value==='') delete object[key];
        else { const value=Number(input.value); if(!Number.isFinite(value)) throw new Error('Enter a valid number.'); object[key]=['angle','rot'].includes(key) && object.type !== 'cannon' ? value*Math.PI/180 : value; }
      } else if (!input.value && ['hold','back','label','id','when'].includes(key)) delete object[key];
      else object[key]=key==='fires' ? input.value.split(',').map(s=>s.trim()).filter(Boolean) : input.value;
    }));
    label.append(input); return label;
  }
  function inspector() {
    const box = $('#objectInspector'); box.replaceChildren();
    const p=level.parts[selected];
    if(!p) { const empty=document.createElement('div'); empty.className='empty-inspector'; empty.innerHTML='<span aria-hidden="true">↖</span><strong>Pick something on the paper.</strong><p>Move it, give it a little nudge, or make it your own.</p>'; box.append(empty); return; }
    const heading=document.createElement('div'); heading.className='selected-heading';
    const name=document.createElement('strong'); name.textContent=(toys.find(t=>t[0]===p.type)||['',p.type])[1];
    const number=document.createElement('span'); number.textContent='OBJECT '+String(selected+1).padStart(2,'0'); heading.append(name,number); box.append(heading);
    const list=fields[p.type] || Object.keys(p).filter(k=>!['type'].includes(k)&&['string','number','boolean'].includes(typeof p[k]));
    let row;
    for(const key of list) { if(!row||row.children.length===2) { row=document.createElement('div'); row.className='field-row'; box.append(row); } row.append(makeField(p,key)); }
    const acts=document.createElement('div'); acts.className='object-actions';
    const duplicate=document.createElement('button'); duplicate.className='button'; duplicate.textContent='Duplicate'; duplicate.onclick=duplicateSelected;
    const remove=document.createElement('button'); remove.className='button danger'; remove.textContent='Remove'; remove.onclick=removeSelected; acts.append(duplicate,remove); box.append(acts);
    const advanced=document.createElement('details'); advanced.className='advanced'; const title=document.createElement('summary'); title.textContent='Advanced object JSON';
    const area=document.createElement('textarea'); area.setAttribute('aria-label','Object JSON'); area.value=JSON.stringify(p,null,2);
    const apply=document.createElement('button'); apply.className='button'; apply.textContent='Apply object JSON'; apply.onclick=()=>change(()=>level.parts[selected]=JSON.parse(area.value));
    advanced.append(title,area,apply); box.append(advanced);
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
    if(ev.target.closest('input,textarea,select')||document.querySelector('dialog[open]'))return;
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
    b.innerHTML='<svg viewBox="0 0 40 34" aria-hidden="true" fill="none" stroke="#675b43" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'+icon+'</svg><span>'+name+'</span>';
    b.onclick=()=>setTool(id);$('#palette').append(b);
  }
  Kit.crayons.forEach((kind,i)=>{
    const label=document.createElement('label');label.className='crayon-check';label.title=NAMES[i];label.style.setProperty('--color',COLORS[i]);
    const input=document.createElement('input');input.type='checkbox';input.dataset.crayon=kind;input.setAttribute('aria-label',NAMES[i]);
    input.onchange=()=>change(()=>{level.crayons=Array.from(document.querySelectorAll('[data-crayon]:checked')).map(c=>c.dataset.crayon);});
    const stick=document.createElement('span');label.append(input,stick);$('#crayonOptions').append(label);
  });
  for(const [selector,key] of [['#levelName','name'],['#levelStory','story'],['#levelTip','tip'],['#levelPaper','paper']]) $(selector).onchange=ev=>change(()=>level[key]=ev.target.value,true);
  $('#levelInk').onchange=ev=>change(()=>{level.ink=Number(ev.target.value);level.par=[level.ink*.5,level.ink*.75];if(level.live)level.live.ink=level.ink;});
  $('#selectTool').onclick=()=>setTool('select');$('#undoEdit').onclick=()=>undo(false);$('#redoEdit').onclick=()=>undo(true);$('#showHint').onchange=render;
  $('#saveLevel').onclick=()=>saveToLibrary();$('#newLevel').onclick=()=>{if(preserveDraft()){setLevel(Kit.blank());notify('Fresh paper! Your previous draft is in the sketchbook.');}};
  function library() {
    const list=$('#libraryList');list.replaceChildren();
    if(!sketchbook.length){const e=document.createElement('div');e.className='empty-library';e.innerHTML='<span aria-hidden="true">▤</span><h3>Your ideas belong here.</h3><p>Save your first contraption and come back to it anytime.</p>';list.append(e);}
    for(const lv of sketchbook) {
      const card=document.createElement('article');card.className='saved-card';const text=document.createElement('div');const title=document.createElement('h3');title.textContent=lv.name;
      const meta=document.createElement('p');meta.textContent=lv.parts.length+' objects · '+(lv.hintVerified?'Solved hint included':lv.solution.length?'Hint included':'No hint yet');text.append(title,meta);
      const actions=document.createElement('div');actions.className='actions';
      const edit=document.createElement('button');edit.className='button';edit.textContent='Edit';edit.onclick=()=>{if(preserveDraft()){setLevel(lv);$('#libraryDialog').close();}};
      const play=document.createElement('a');play.className='button';play.textContent='Play ↗';play.target='_blank';play.rel='noopener';play.href='index.html#level='+Kit.encode(lv);
      const del=document.createElement('button');del.className='text-button danger';del.textContent='×';del.setAttribute('aria-label','Remove '+lv.name+' from sketchbook');
      del.onclick=()=>{const old=sketchbook;sketchbook=sketchbook.filter(l=>l.id!==lv.id);if(!writeLibrary())sketchbook=old;library();notify('Removed from sketchbook. The open draft is kept.');};
      actions.append(edit,play,del);card.append(text,actions);list.append(card);
    }
  }
  $('#openLibrary').onclick=()=>{library();$('#libraryDialog').showModal();};
  WORLDS.forEach((world,i)=>{const o=document.createElement('option');o.value=i;o.textContent=(i+1)+'. '+world.name;$('#worldFilter').append(o);});
  function remixList(){
    const list=$('#remixList');list.replaceChildren();
    LEVELS.filter(l=>l.world===Number($('#worldFilter').value)).forEach(lv=>{
      const b=document.createElement('button');b.className='remix-card';const c=document.createElement('canvas');c.width=320;c.height=180;c.setAttribute('aria-hidden','true');
      const name=document.createElement('strong');name.textContent=lv.n+'. '+lv.name;const note=document.createElement('small');note.textContent=(lv.live?'Live puzzle · ':'')+(lv.bossLevel?'Boss · ':'')+lv.parts.length+' objects';b.append(c,name,note);
      b.onclick=()=>{if(preserveDraft()){setLevel(Kit.remix(lv));$('#remixDialog').close();notify('Remix loaded. The original puzzle stays in the campaign.');}};
      list.append(b);drawTo(c,lv);
    });
  }
  $('#remixLevel').onclick=()=>{remixList();$('#remixDialog').showModal();};$('#worldFilter').onchange=remixList;
  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
  document.querySelectorAll('dialog.modal').forEach(d=>d.addEventListener('click',ev=>{if(ev.target===d){const r=d.getBoundingClientRect();if(ev.clientX<r.left||ev.clientX>r.right||ev.clientY<r.top||ev.clientY>r.bottom)d.close();}}));
  $('#importLevel').onclick=()=>$('#fileInput').click();
  $('#fileInput').onchange=async ev=>{
    const file=ev.target.files[0];if(!file)return;
    try{if(file.size>250000)throw new Error('Choose a level file smaller than 250 KB.');const next=Kit.validate(JSON.parse(await file.text()));if(preserveDraft()){setLevel(next);notify('Puzzle imported.');}}
    catch(e){notify('Could not import: '+e.message);}finally{ev.target.value='';}
  };
  $('#exportLevel').onclick=()=>{
    try{const lv=Kit.validate(level),blob=new Blob([JSON.stringify({format:'pochadraw',version:1,level:lv},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=(lv.name.replace(/[^a-z0-9-]/gi,'-').replace(/-+/g,'-').slice(0,60)||'puzzle')+'.pochadraw.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('Puzzle exported.');}catch(e){notify(e.message);}
  };
  $('#shareLevel').onclick=()=>{
    try{const url=new URL('index.html',location.href);url.hash='level='+Kit.encode(level);$('#shareUrl').value=url.href;$('#openShare').href=url.href;$('#shareDialog').showModal();}catch(e){notify(e.message);}
  };
  $('#copyShare').onclick=async()=>{try{await navigator.clipboard.writeText($('#shareUrl').value);notify('Playable link copied.');}catch(e){$('#shareUrl').focus();$('#shareUrl').select();notify('Select the link and copy it with Ctrl/Cmd C.');}};
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
  try{
    const hash=new URLSearchParams(location.hash.slice(1));
    if(hash.has('level'))level=Kit.decode(hash.get('level'));
    else if(new URLSearchParams(location.search).has('campaign'))level=Kit.remix(LEVELS[Math.max(0,Math.min(99,Number(new URLSearchParams(location.search).get('campaign'))||0))]);
    else level=Kit.validate(Kit.read('draft',null)||Kit.blank());
  }catch(e){level=Kit.blank();notify(e.message);}
  $('#savedCount').textContent=sketchbook.length;refresh();saveDraft();
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>{CC.clearSprites();cr.pats.clear();render();});
  if(new URLSearchParams(location.search).has('library')){library();$('#libraryDialog').showModal();}
})();
