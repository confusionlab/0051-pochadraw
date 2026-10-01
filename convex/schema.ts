import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const stateKey = v.union(v.literal("draft"), v.literal("progress"), v.literal("strokes"), v.literal("preferences"));

export default defineSchema({
  state: defineTable({ key: stateKey, json: v.string() }).index("by_key", ["key"]),
  puzzles: defineTable({ key: v.string(), name: v.string(), json: v.string(), updatedAt: v.number() })
    .index("by_key", ["key"])
    .index("by_updatedAt", ["updatedAt"]),
});
