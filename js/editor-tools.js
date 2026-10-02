/* All campaign objects available in the studio. */
(function (root) {
  'use strict';
  const CC = root.CC || (root.CC = {});
  const tools = [
    ['ball', 'Pochaco', '', p => ({ type: 'ball', x: p[0], y: p[1], style: 'rubber', hold: 'start' })],
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
    ['lava', 'Lava', '<path d="m3 20 5-8 6 6 6-11 6 13 8-9 4 17H3Z" fill="#e89a62"/><path d="m8 24 6-4 6 4 6-3 7 3"/>', p => ({ type: 'lava', x: p[0]-1, y: p[1], w: 2, h: .4 })],
    ['gate', 'Gate', '<path d="M7 5h26v22H7Z" fill="#c2986b"/><path d="M12 5v22M20 5v22M28 5v22M7 12h26M7 22h26"/>', p => ({type:'gate',x1:p[0]-1,y1:p[1],x2:p[0]+1,y2:p[1],t:.16,when:'signal1'})],
    ['button', 'Button', '<path d="M6 24h28v5H6Z" fill="#a3a0a0"/><path d="M11 24v-6q9-9 18 0v6" fill="#e86252"/>', p => ({type:'button',x:p[0],y:p[1],w:.7,angle:0,fires:['signal1']})],
    ['lamp', 'Lamp', '<path d="M13 5h15l6 10H9ZM22 15l-5 7 8 8M14 30h19" fill="#94b696"/>', p => ({type:'lamp',x:p[0],y:p[1],when:'signal1'})],
    ['car', 'Car', '<path d="M5 24v-9h7l5-8h12l5 17Z" fill="#e86252"/><circle cx="12" cy="25" r="5" fill="#675b43"/><circle cx="29" cy="25" r="5" fill="#675b43"/>', p => ({type:'car',x:p[0],y:p[1],dir:1,speed:2.2,run:30,when:'start'})],
    ['conveyor', 'Conveyor', '<rect x="3" y="13" width="34" height="13" rx="6" fill="#b8b8b5"/><circle cx="10" cy="19" r="3"/><circle cx="20" cy="19" r="3"/><circle cx="30" cy="19" r="3"/><path d="M10 8h20m-5-4 5 4-5 4"/>', p => ({type:'conveyor',x1:p[0]-1.5,x2:p[0]+1.5,y:p[1],speed:2.5,when:'start'})],
    ['cannon', 'Cannon', '<path d="m10 23 18-18 7 7-18 18Z" fill="#767783"/><circle cx="12" cy="27" r="5" fill="#c2986b"/><path d="M8 23h20v7H8Z"/>', p => ({type:'cannon',x:p[0],y:p[1],angle:-45,speed:8,when:'start',ball:{style:'rubber'}})],
    ['dispenser', 'Dispenser', '<path d="M12 3h16v17H12Z" fill="#b8b8b5"/><path d="M12 8h16M12 16h16"/><circle cx="20" cy="27" r="4" fill="#fffaf0"/>', p => ({type:'dispenser',kind:'tube',x:p[0],y:p[1],count:5,every:2.5,first:.5,style:'rubber',when:'start'})],
    ['hen', 'Hen', '<ellipse cx="18" cy="19" rx="11" ry="9" fill="#fffaf0"/><circle cx="29" cy="12" r="5" fill="#fffaf0"/><path d="m33 12 5 2-5 2M27 7l2-4 2 4M13 27v5m8-5v5"/><circle cx="30" cy="11" r="1" fill="#675b43"/>', p => ({type:'dispenser',kind:'hen',x:p[0],x1:p[0]-1,x2:p[0]+1,y:p[1],speed:1,count:5,every:2.5,first:.5,style:'egg',when:'start'})],
    ['repeater', 'Repeating cannon', '<path d="m10 23 18-18 7 7-18 18Z" fill="#767783"/><circle cx="12" cy="27" r="5" fill="#c2986b"/><path d="M4 4h12m-4-3 4 3-4 3"/>', p => ({type:'dispenser',kind:'cannon',x:p[0],y:p[1],angle:-45,speed:8,count:5,every:2.5,first:.5,style:'rubber',when:'start'})],
    ['boss', 'Boss', '<path d="M7 6h26v24H7Z" fill="#c2986b"/><path d="m7 6-3-5 10 5m19 0 3-5-10 5M12 14h5m6 0h5M14 23q6-6 12 0"/>', p => ({type:'boss',look:'grumbox',name:'Grumbox',x:p[0],y:p[1],w:1.9,h:2.1,hp:3,minHit:1.1})],
    ['flag', 'Finish flag', '<path d="M10 32V3m0 0h23v15H10Z" fill="#fffaf0"/><path d="M10 3h6v5h-6m12-5h6v5h-6M16 8h6v5h-6m12-5h5v5h-5M10 13h6v5h-6m12-5h6v5h-6" fill="#675b43"/>', p => ({type:'flag',x:p[0],y:p[1]})],
    ['star', 'Star', '<path d="m20 3 4 10 11 1-8 8 3 11-10-6-10 6 3-11-8-8 11-1Z" fill="#eec95f"/>', p => ({type:'star',x:p[0],y:p[1]})],
    ['nodraw', 'No-draw zone', '<rect x="4" y="3" width="32" height="28" fill="#e8625225" stroke="#cc4939" stroke-dasharray="3 2"/><path d="m7 28 25-22M12 30 34 9M6 21 24 4" stroke="#cc4939"/>', p => ({type:'nodraw',x:p[0]-1,y:p[1]-1,w:2,h:2})],
    ['cloud', 'Cloud', '<path d="M6 26q-7-12 4-14 0-13 14-9 9-2 11 10 10 2 3 13Z" fill="#b5d8e9"/>', p => ({type:'deco',kind:'cloud',x:p[0],y:p[1],s:1})],
    ['sun', 'Sun', '<circle cx="20" cy="17" r="8" fill="#eec95f"/><path d="M20 2v4m0 23v4M4 17h4m24 0h4M8 5l4 4m16 16 4 4M8 29l4-4M28 9l4-4"/>', p => ({type:'deco',kind:'sun',x:p[0],y:p[1],s:1})],
    ['cat', 'Cat', '<path d="m9 12 1-9 8 7h8l6-7 1 11v14H9Z" fill="#eec95f"/><path d="M14 16h3m8 0h3m-10 5 3 2 3-2M4 20h9m15 0h9"/>', p => ({type:'cat',x:p[0],y:p[1]})],
    ['arrow', 'Arrow', '<path d="M7 28 31 6m-15 0h15v15"/>', p => ({type:'arrow',pts:[[p[0]-1,p[1]+.5],[p[0]+1,p[1]-.5]]})],
    ['wire', 'Wire', '<path d="M5 7q15 34 30 0" stroke-dasharray="3 2"/><circle cx="5" cy="7" r="3" fill="#767783"/><circle cx="35" cy="7" r="3" fill="#767783"/>', p => ({type:'wire',from:[p[0]-1,p[1]-.4],to:[p[0]+1,p[1]-.4]})]
  ];
  CC.EditorTools = tools;
})(typeof window !== 'undefined' ? window : globalThis);
