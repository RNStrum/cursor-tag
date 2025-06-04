import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// The schema defines your data model for the database.
// For more information, see https://docs.convex.dev/database/schema
export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
  }).index("by_clerkId", ["clerkId"]),
  
  games: defineTable({
    status: v.union(v.literal("waiting"), v.literal("playing"), v.literal("finished")),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
    winnerId: v.optional(v.id("users")),
    gameRadius: v.number(), // Radius of the play area
  }),
  
  players: defineTable({
    gameId: v.id("games"),
    userId: v.id("users"),
    role: v.union(v.literal("it"), v.literal("runner")),
    position: v.object({
      x: v.number(),
      y: v.number(),
    }),
    isActive: v.boolean(),
    joinedAt: v.number(),
  })
    .index("by_game", ["gameId"])
    .index("by_user", ["userId"])
    .index("by_game_user", ["gameId", "userId"]),
});
