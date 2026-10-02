/* Keep generated campaign captions focused on the goal. */
function present(level) {
  const target = level.parts.find(p => ['cup', 'bell', 'balloon', 'lamp', 'boss', 'flag'].includes(p.type) && p.goal !== false);
  if (level.goal && level.goal.stars) {
    level.story = `Collect all ${level.goal.stars} stars`;
  } else if (target && target.type === 'cup') {
    const container = target.style || 'basket';
    if (level.goal && level.goal.need) {
      const items = target.accept === 'egg' ? 'fragile Pochacos' : 'Pochacos';
      level.story = `At least ${level.goal.need} ${items} into the ${container}`;
    } else {
      const item = { steel: 'Steel Pochaco', bowling: 'Heavy Pochaco', tennis: 'Bouncy Pochaco', meatball: 'Soft Pochaco', egg: 'Fragile Pochaco' }[target.accept] || 'Pochaco';
      level.story = `${item} into the ${container}`;
    }
  } else if (target && target.type === 'boss') {
    level.story = `${target.hp} hits on ${target.name}`;
  } else {
    const goals = { bell: 'Ring the bell', balloon: 'Pop the balloon', lamp: 'Light the lamp', flag: 'Car to the finish flag' };
    if (!target || !goals[target.type]) throw new Error(`Missing goal phrase for level ${level.n}`);
    level.story = goals[target.type];
  }
  if (level.tip) level.tip = level.tip.replace(/\bballs\b/gi, 'Pochacos').replace(/\bball\b/gi, 'Pochaco');
  level.parts = level.parts.filter(p => p.type !== 'label');
  for (const part of level.parts) {
    delete part.label;
    delete part.lx;
    delete part.ly;
  }
  return level;
}
module.exports = present;
