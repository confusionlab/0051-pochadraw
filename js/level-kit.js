/* Pochadraw — shared, DOM-free level format, geometry and share links. */
(function (root) {
  'use strict';
  const CC = root.CC || (root.CC = {});
  const clone = value => JSON.parse(JSON.stringify(value));
  const uid = () => 'pd-' + (root.crypto && root.crypto.randomUUID ? root.crypto.randomUUID() : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2));
  const crayons = ['solid', 'loose', 'bouncy', 'floaty', 'hinge', 'zoom', 'magnet'];
  const papers = ['graph', 'ruled', 'dots', 'sky', 'kraft', 'legal', 'pink', 'blueprint', 'newsprint', 'party'];
  function validate(input) {
    const source = input && input.format === 'pochadraw' ? input.level : input;
    if (!source || typeof source !== 'object' || Array.isArray(source)) throw new Error('Choose a Pochadraw level JSON file.');
    const raw = JSON.stringify(source);
    if (raw.length > 220000) throw new Error('This level is too large (maximum 220 KB).');
    const lv = JSON.parse(raw, (key, v) => {
      if (['__proto__', 'prototype', 'constructor'].includes(key)) throw new Error('Unsupported property in the level.');
      if (typeof v === 'number' && (!Number.isFinite(v) || Math.abs(v) > 10000)) throw new Error('A level value is outside the supported range.');
      return v;
    });
    for (const [key, fallback, max] of [['name', 'Untitled contraption', 80], ['story', 'Draw a path to complete the machine.', 600], ['tip', 'Try a ramp, a bridge, or a different crayon.', 300], ['verb', 'HOORAY!', 30]]) {
      lv[key] = typeof lv[key] === 'string' ? lv[key].slice(0, max) : fallback;
    }
    if (!Array.isArray(lv.parts) || lv.parts.length > 120) throw new Error('A level needs an object list with at most 120 objects.');
    for (const p of lv.parts) {
      if (!p || !Object.hasOwn(CC.PARTS, p.type)) throw new Error('An object type is not supported.');
      for (const k of ['w', 'h', 'r', 't', 'len', 'size', 'gap', 'density', 'period']) {
        if (p[k] != null && (typeof p[k] !== 'number' || p[k] <= 0 || p[k] > 100)) throw new Error('Object dimensions must be positive and at most 100.');
      }
      for (const k of ['x', 'y', 'x1', 'y1', 'x2', 'y2', 'baseY', 'angle']) {
        if (p[k] != null && (typeof p[k] !== 'number' || Math.abs(p[k]) > (k === 'angle' ? 360 : 100))) throw new Error('Object positions must be numbers within the canvas range.');
      }
      const required = ['plank','gate'].includes(p.type) ? ['x1','y1','x2','y2'] : ['block','crate','lava','nodraw'].includes(p.type) ? ['x','y','w','h'] : ['ball','cup','bell','balloon','fan','seesaw','pusher','car','cannon','trampoline','star'].includes(p.type) ? ['x','y'] : [];
      if (required.some(k => typeof p[k] !== 'number' || !Number.isFinite(p[k]))) throw new Error('An object is missing a required position or dimension.');
      if (['plank','gate'].includes(p.type) && Math.hypot(p.x2-p.x1,p.y2-p.y1) < .05) throw new Error('A platform must have two different endpoints.');
      if (p.type === 'ball' && p.style && !Object.hasOwn(CC.BALLS, p.style)) throw new Error('Unknown ball material.');
      if (p.n != null && (!Number.isInteger(p.n) || p.n < 1 || p.n > 100)) throw new Error('Object counts must be between 1 and 100.');
      if (p.type === 'dispenser' && (!Number.isInteger(p.count) || p.count < 1 || p.count > 100)) throw new Error('A dispenser can release between 1 and 100 balls.');
      if (p.type === 'dispenser' && p.style && !Object.hasOwn(CC.BALLS, p.style)) throw new Error('Unknown dispenser ball material.');
      if (p.ball && p.ball.style && !Object.hasOwn(CC.BALLS, p.ball.style)) throw new Error('Unknown cannon ball material.');
      if (p.type === 'cup' && (p.w != null && p.w < 0.35 || p.h != null && p.h < 0.2)) throw new Error('The basket must be at least 0.35 wide and 0.2 tall.');
      if (p.text != null && (typeof p.text !== 'string' || p.text.length > 300)) throw new Error('Object text must be under 300 characters.');
    }
    if (!Array.isArray(lv.crayons) || !lv.crayons.length || lv.crayons.some(c => !crayons.includes(c))) throw new Error('Choose at least one of the seven crayons.');
    lv.crayons = [...new Set(lv.crayons)];
    if (lv.goal) {
      if (typeof lv.goal !== 'object' || Array.isArray(lv.goal)) throw new Error('Invalid puzzle goal.');
      for (const k of ['need', 'of', 'stars']) if (lv.goal[k] != null && (!Number.isInteger(lv.goal[k]) || lv.goal[k] < 1 || lv.goal[k] > 200)) throw new Error('Goal counts must be whole numbers between 1 and 200.');
      if (lv.goal.need && (!lv.goal.of || lv.goal.need > lv.goal.of)) throw new Error('The delivery goal cannot exceed the number of balls.');
    }
    if (typeof lv.ink !== 'number' || lv.ink < 0.3 || lv.ink > 500) throw new Error('The ink budget must be between 0.3 and 500.');
    lv.par = Array.isArray(lv.par) && lv.par.length === 2 && lv.par.every(n => typeof n === 'number' && n >= 0 && n <= lv.ink) ? lv.par : [lv.ink * 0.5, lv.ink * 0.75];
    lv.solution = Array.isArray(lv.solution) ? lv.solution : [];
    if (lv.solution.length > 100) throw new Error('A hint can have at most 100 strokes.');
    let count = 0;
    for (const s of lv.solution) {
      if (!s || !crayons.includes(s.kind) || !Array.isArray(s.pts) || !s.pts.length) throw new Error('Invalid hint stroke.');
      count += s.pts.length;
      if (s.pts.some(p => !Array.isArray(p) || p.length !== 2 || p.some(n => typeof n !== 'number' || !Number.isFinite(n) || Math.abs(n) > 100))) throw new Error('Invalid hint coordinates.');
      if (s.at != null && (typeof s.at !== 'number' || s.at < 0 || s.at > 300)) throw new Error('Invalid hint timing.');
    }
    if (count > 6000) throw new Error('The hint has too many points.');
    if (lv.live && (typeof lv.live !== 'object' || !Number.isFinite(lv.live.ink) || lv.live.ink <= 0 || lv.live.ink > 500 || lv.live.time != null && (!Number.isFinite(lv.live.time) || lv.live.time <= 0 || lv.live.time > 300))) throw new Error('Invalid live level settings.');
    lv.id = /^pd-[a-z0-9-]{1,80}$/i.test(lv.id || '') ? lv.id : uid();
    lv.custom = true; lv.world = Number.isInteger(lv.world) && lv.world >= 0 && lv.world < 10 ? lv.world : 0;
    lv.paper = papers.includes(lv.paper) ? lv.paper : 'graph'; lv.n = 1;
    try { new CC.Sim(lv, lv.live ? [] : lv.solution); } catch (e) { throw new Error('An object has missing or invalid physics properties.'); }
    return lv;
  }
  const remix = lv => validate(Object.assign(clone(lv), { id: uid(), name: lv.name + ' (remix)', custom: true, paper: (CC.WORLDS[lv.world] || {}).paper || 'graph' }));
  function blank() {
    return validate({ id: uid(), name: 'My first contraption', story: 'Help the little red ball find its way into the basket.', tip: 'Draw a ramp from the shelf toward the basket.', verb: 'SWISH!', crayons: crayons.slice(), ink: 30, par: [15, 22.5], solution: [], parts: [
      { type: 'ball', x: 2, y: 2.2, style: 'rubber', hold: 'start' },
      { type: 'plank', x1: 0.4, y1: 2.5, x2: 3.5, y2: 3.1, t: 0.2 },
      { type: 'cup', x: 12.5, y: 7.8, w: 1.8, h: 1.1, style: 'basket' }
    ] });
  }
  function bounds(p) {
    if (p.x1 != null && p.x2 != null) return [Math.min(p.x1, p.x2), Math.min(p.y1 ?? p.y ?? 0, p.y2 ?? p.y ?? 0) - 0.1, Math.max(p.x1, p.x2), Math.max(p.y1 ?? p.y ?? 0, p.y2 ?? p.y ?? 0) + 0.1];
    if (p.pts && p.pts.length) return [Math.min(...p.pts.map(q => q[0])), Math.min(...p.pts.map(q => q[1])), Math.max(...p.pts.map(q => q[0])), Math.max(...p.pts.map(q => q[1]))];
    const x = p.x || 0, y = p.y || 0;
    if (p.type === 'ball') { const r = p.r || (CC.BALLS[p.style || 'rubber'] || {}).r || 0.24; return [x - r, y - r, x + r, y + r]; }
    if (['block', 'nodraw', 'lava'].includes(p.type)) return [x, y, x + (p.w || 1), y + (p.h || 1)];
    if (p.type === 'cup') return [x - (p.w || 1.3) / 2, y - Math.max(p.h || 0.8, p.backH || 0), x + (p.w || 1.3) / 2, y];
    if (p.type === 'dominoes') return [x - 0.15, y - (p.h || 0.8), x + ((p.n || 1) - 1) * (p.gap || 0.45) + 0.15, y];
    if (p.type === 'bell') return [x - 0.4 * (p.size || 1), y, x + 0.4 * (p.size || 1), y + 0.8 * (p.size || 1)];
    if (p.type === 'seesaw') return [x - (p.len || 3) / 2, y - 0.5, x + (p.len || 3) / 2, p.baseY || 8.7];
    if (p.type === 'note' || p.type === 'label') return [x - 0.2, y - 0.25, x + Math.max(0.6, (p.text || '').length * 0.14), y + 0.25];
    if (p.type === 'balloon') { const r = p.r || 0.45; return [x-r, y-r, x+r, y+r]; }
    if (p.type === 'boss') return [x - (p.w || 2) / 2, y - (p.h || 2), x + (p.w || 2) / 2, y];
    const w = p.w || p.len || 1, h = p.h || 1;
    return [x - w / 2, y - h / 2, x + w / 2, y + h / 2];
  }
  function move(p, dx, dy) {
    for (const key of ['x', 'x1', 'x2']) if (typeof p[key] === 'number') p[key] = Math.round((p[key] + dx) * 1000) / 1000;
    for (const key of ['y', 'y1', 'y2', 'baseY']) if (typeof p[key] === 'number') p[key] = Math.round((p[key] + dy) * 1000) / 1000;
    if (p.pts) p.pts = p.pts.map(q => [q[0] + dx, q[1] + dy]);
  }
  function encode(level) {
    const data = JSON.stringify({ format: 'pochadraw', version: 1, level: validate(level) });
    const bytes = new TextEncoder().encode(data);
    let bin = ''; for (const n of bytes) bin += String.fromCharCode(n);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function decode(encoded) {
    if (!encoded || encoded.length > 300000) throw new Error('The shared level link is missing or too large.');
    try { const bytes = Uint8Array.from(atob(encoded.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)); return validate(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))); }
    catch (e) { throw new Error('This shared level link is invalid. ' + e.message); }
  }
  function read(key, fallback) { try { return JSON.parse(localStorage.getItem('pochadraw-' + key)) ?? fallback; } catch (e) { return fallback; } }
  function write(key, value) { localStorage.setItem('pochadraw-' + key, JSON.stringify(value)); }
  CC.LevelKit = { clone, uid, crayons, papers, validate, remix, blank, bounds, move, encode, decode, read, write };
})(typeof globalThis !== 'undefined' ? globalThis : this);
