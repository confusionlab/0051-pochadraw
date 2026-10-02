import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { stateKey } from "./schema";

const jsonObject = (json: string, limit: number) => {
  if (new TextEncoder().encode(json).length > limit) throw new Error("This save is too large. Export a JSON copy instead.");
  const value = JSON.parse(json);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid save.");
  return value;
};

const puzzle = (json: string) => {
  const value = jsonObject(json, 220000);
  if (!/^pd-[a-z0-9-]{1,80}$/i.test(value.id) || typeof value.name !== "string" || value.name.length > 80 ||
      !Array.isArray(value.parts) || value.parts.length > 120 || !Array.isArray(value.crayons) || !value.crayons.length ||
      typeof value.ink !== "number" || value.ink < 0.3 || value.ink > 500) throw new Error("Invalid puzzle.");
  return value;
};

export const snapshot = query({
  args: {},
  returns: v.array(v.object({ key: stateKey, json: v.string() })),
  handler: async ctx => {
    const rows = await Promise.all((["draft", "progress"] as const).map(async key => {
      const row = await ctx.db.query("state").withIndex("by_key", q => q.eq("key", key)).unique();
      return row ? { key, json: row.json } : null;
    }));
    return rows.filter(row => row !== null);
  },
});

export const saveState = mutation({
  args: { key: stateKey, json: v.string() },
  returns: v.null(),
  handler: async (ctx, { key, json }) => {
    const value = jsonObject(json, key === "draft" ? 220000 : 12000);
    const existing = await ctx.db.query("state").withIndex("by_key", q => q.eq("key", key)).unique();
    if (key === "draft") puzzle(json);
    if (key === "progress") {
      for (const [id, stars] of Object.entries(value)) {
        if (!/^[a-z0-9-]{1,100}$/i.test(id) || !Number.isInteger(stars) || Number(stars) < 0 || Number(stars) > 3) throw new Error("Invalid star count.");
      }
      const saved = existing ? JSON.parse(existing.json) : {};
      for (const [id, stars] of Object.entries(value)) saved[id] = Math.max(saved[id] || 0, Number(stars));
      json = JSON.stringify(saved);
    }
    if (existing) await ctx.db.patch(existing._id, { json });
    else await ctx.db.insert("state", { key, json });
    return null;
  },
});

export const listPuzzles = query({
  args: {},
  returns: v.array(v.object({ key: v.string(), name: v.string(), updatedAt: v.number() })),
  handler: async ctx => {
    const rows = await ctx.db.query("puzzles").withIndex("by_updatedAt").order("desc").take(100);
    return rows.map(({ key, name, updatedAt }) => ({ key, name, updatedAt }));
  },
});

export const getPuzzle = query({
  args: { key: v.string() },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { key }) => (await ctx.db.query("puzzles").withIndex("by_key", q => q.eq("key", key)).unique())?.json ?? null,
});

export const savePuzzle = mutation({
  args: { key: v.string(), json: v.union(v.string(), v.null()) },
  returns: v.null(),
  handler: async (ctx, { key, json }) => {
    const existing = await ctx.db.query("puzzles").withIndex("by_key", q => q.eq("key", key)).unique();
    if (json === null) {
      if (existing) await ctx.db.delete(existing._id);
      return null;
    }
    const value = puzzle(json);
    if (value.id !== key) throw new Error("Puzzle ID does not match.");
    if (!existing && (await ctx.db.query("puzzles").withIndex("by_updatedAt").take(100)).length >= 100) throw new Error("Your sketchbook has 100 puzzles. Remove one before saving another.");
    const fields = { key, name: value.name, json, updatedAt: Date.now() };
    if (existing) await ctx.db.patch(existing._id, fields);
    else await ctx.db.insert("puzzles", fields);
    return null;
  },
});

// One-time administrative cleanup for saves made before the cloud policy changed.
export const discardTemporaryState = internalMutation({
  args: {},
  returns: v.number(),
  handler: async ctx => {
    let removed = 0;
    for (const key of ["strokes", "preferences"] as const) {
      const row = await ctx.db.query("state").withIndex("by_key", q => q.eq("key", key)).unique();
      if (row) { await ctx.db.delete(row._id); removed++; }
    }
    return removed;
  },
});
