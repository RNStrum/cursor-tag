import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a new game and join as first player
export const createGame = mutation({
  args: {
    gameRadius: v.number(),
    playerName: v.optional(v.string()),
  },
  handler: async (ctx, { gameRadius, playerName }) => {
    // Create anonymous user
    const userId = await ctx.db.insert("users", {
      clerkId: `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: playerName || "Player 1",
    });
    
    const userDoc = (await ctx.db.get(userId))!;

    // Create the game
    const gameId = await ctx.db.insert("games", {
      status: "waiting",
      gameRadius,
    });

    // Assign runner role to first player (starts in center)
    const playerId = await ctx.db.insert("players", {
      gameId,
      userId: userDoc!._id,
      role: "runner",
      position: { x: 0, y: 0 }, // Center of circle
      isActive: true,
      joinedAt: Date.now(),
    });

    return { gameId, playerId };
  },
});

// Join an existing game
export const joinGame = mutation({
  args: {
    gameId: v.id("games"),
    playerName: v.optional(v.string()),
  },
  handler: async (ctx, { gameId, playerName }) => {
    const game = await ctx.db.get(gameId);
    if (!game) throw new ConvexError("Game not found");
    if (game.status !== "waiting") throw new ConvexError("Game already started");

    // Create anonymous user
    const userId = await ctx.db.insert("users", {
      clerkId: `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: playerName || "Player 2",
    });
    
    const userDoc = (await ctx.db.get(userId))!;

    // Check if already in game
    const existingPlayer = await ctx.db
      .query("players")
      .withIndex("by_game_user", (q) => q.eq("gameId", gameId).eq("userId", userDoc!._id))
      .unique();

    if (existingPlayer) throw new ConvexError("Already in this game");

    // Count current players
    const playerCount = await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", gameId))
      .collect()
      .then((players) => players.length);

    if (playerCount >= 2) throw new ConvexError("Game is full");

    // Random position on edge for "it" player
    const angle = Math.random() * 2 * Math.PI;
    const edgePosition = {
      x: game.gameRadius * Math.cos(angle),
      y: game.gameRadius * Math.sin(angle),
    };

    // Join as "it" player
    const playerId = await ctx.db.insert("players", {
      gameId,
      userId: userDoc!._id,
      role: "it",
      position: edgePosition,
      isActive: true,
      joinedAt: Date.now(),
    });

    // Start the game
    await ctx.db.patch(gameId, {
      status: "playing",
      startTime: Date.now(),
    });

    return playerId;
  },
});

// Update player position
export const updatePosition = mutation({
  args: {
    gameId: v.id("games"),
    playerId: v.id("players"),
    position: v.object({ x: v.number(), y: v.number() }),
  },
  handler: async (ctx, { gameId, playerId, position }) => {
    const player = await ctx.db.get(playerId);

    if (!player) throw new ConvexError("Player not in game");

    const game = await ctx.db.get(gameId);
    if (!game) throw new ConvexError("Game not found");
    if (game.status !== "playing") throw new ConvexError("Game not active");

    // Constrain position to circle boundary
    const distance = Math.sqrt(position.x * position.x + position.y * position.y);
    const constrainedPosition = distance > game.gameRadius 
      ? {
          x: (position.x / distance) * game.gameRadius,
          y: (position.y / distance) * game.gameRadius,
        }
      : position;

    await ctx.db.patch(player._id, {
      position: constrainedPosition,
    });

    // Check for collision (both players in same game)
    const allPlayers = await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", gameId))
      .collect();

    if (allPlayers.length === 2) {
      const [player1, player2] = allPlayers;
      const dx = player1.position.x - player2.position.x;
      const dy = player1.position.y - player2.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Player radius for collision (assume 20px radius)
      const playerRadius = 20;
      if (distance < playerRadius * 2) {
        // Collision! "It" player wins
        const itPlayer = allPlayers.find(p => p.role === "it");
        await ctx.db.patch(gameId, {
          status: "finished",
          endTime: Date.now(),
          winnerId: itPlayer?.userId,
        });
      }
    }
  },
});

// Get game state
export const getGame = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const game = await ctx.db.get(gameId);
    if (!game) return null;

    const players = await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", gameId))
      .collect();

    const playersWithUsers = await Promise.all(
      players.map(async (player) => {
        const user = await ctx.db.get(player.userId);
        return { ...player, user };
      })
    );

    return {
      ...game,
      players: playersWithUsers,
    };
  },
});

// Restart a finished game
export const restartGame = mutation({
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, { gameId }) => {
    const game = await ctx.db.get(gameId);
    if (!game) throw new ConvexError("Game not found");
    if (game.status !== "finished") throw new ConvexError("Game is not finished");

    // Get all players in the game
    const players = await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", gameId))
      .collect();

    if (players.length !== 2) throw new ConvexError("Need exactly 2 players to restart");

    // Reset player positions
    for (const player of players) {
      if (player.role === "runner") {
        // Runner goes back to center
        await ctx.db.patch(player._id, {
          position: { x: 0, y: 0 },
        });
      } else {
        // "It" player gets new random edge position
        const angle = Math.random() * 2 * Math.PI;
        const edgePosition = {
          x: game.gameRadius * Math.cos(angle),
          y: game.gameRadius * Math.sin(angle),
        };
        await ctx.db.patch(player._id, {
          position: edgePosition,
        });
      }
    }

    // Reset game state
    await ctx.db.patch(gameId, {
      status: "playing",
      startTime: Date.now(),
      endTime: undefined,
      winnerId: undefined,
    });

    return gameId;
  },
});

// Get recent games (last 10)
export const getRecentGames = query({
  args: {},
  handler: async (ctx) => {
    const games = await ctx.db
      .query("games")
      .order("desc")
      .take(10);

    return games;
  },
});