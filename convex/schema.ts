import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const stateKey = v.union(v.literal("draft"), v.literal("progress"));

export default defineSchema({
  // Accept legacy rows during deployment; public saves only accept stateKey.
  state: defineTable({ key: v.union(stateKey, v.literal("strokes"), v.literal("preferences")), json: v.string() }).index("by_key", ["key"]),
  puzzles: defineTable({ key: v.string(), name: v.string(), json: v.string(), updatedAt: v.number() })
    .index("by_key", ["key"])
    .index("by_updatedAt", ["updatedAt"]),
});
