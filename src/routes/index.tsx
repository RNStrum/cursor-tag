import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { Target, Play, Users } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";

const recentGamesQueryOptions = convexQuery(api.games.getRecentGames, {});

export const Route = createFileRoute("/")({
  loader: async ({ context: { queryClient } }) =>
    await queryClient.ensureQueryData(recentGamesQueryOptions),
  component: HomePage,
});

function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <div className="not-prose flex justify-center mb-4">
          <Target className="w-16 h-16 text-primary" />
        </div>
        <h1 className="text-4xl font-bold">2D Tag</h1>
        <p className="text-lg text-gray-600 mt-2">
          Real-time multiplayer tag game
        </p>
      </div>

      <GameLobby />
    </div>
  );
}

function GameLobby() {
  const { data: recentGames } = useSuspenseQuery(recentGamesQueryOptions);
  const createGame = useMutation(api.games.createGame);
  const joinGame = useMutation(api.games.joinGame);
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [gameIdToJoin, setGameIdToJoin] = useState("");
  const [playerName, setPlayerName] = useState("");

  const handleCreateGame = async () => {
    setIsCreating(true);
    try {
      const result = await createGame({ 
        gameRadius: 250, 
        playerName: playerName.trim() || undefined 
      });
      navigate({ 
        to: `/game/${result.gameId}`,
        search: { playerId: result.playerId }
      });
    } catch (error) {
      console.error("Failed to create game:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinGame = async () => {
    if (!gameIdToJoin.trim()) return;
    
    try {
      const playerId = await joinGame({ 
        gameId: gameIdToJoin as any, 
        playerName: playerName.trim() || undefined 
      });
      navigate({ 
        to: `/game/${gameIdToJoin}`,
        search: { playerId }
      });
    } catch (error) {
      console.error("Failed to join game:", error);
      alert("Failed to join game. Make sure the game ID is correct and the game is waiting for players.");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Player Name Input */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <h2 className="card-title justify-center text-xl">Your Name (Optional)</h2>
          <input
            type="text"
            placeholder="Enter your name"
            className="input input-bordered w-full"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            maxLength={20}
          />
        </div>
      </div>

      {/* Create Game Section */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body text-center">
          <h2 className="card-title justify-center text-2xl">
            <Target className="w-6 h-6" />
            Start New Game
          </h2>
          <p className="text-gray-600">
            Create a new game and invite a friend to play!
          </p>
          <div className="card-actions justify-center mt-4">
            <button 
              className="btn btn-primary btn-lg"
              onClick={handleCreateGame}
              disabled={isCreating}
            >
              {isCreating ? (
                <span className="loading loading-spinner"></span>
              ) : (
                <Play className="w-5 h-5 mr-2" />
              )}
              Create Game
            </button>
          </div>
        </div>
      </div>

      {/* Join Game Section */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <h2 className="card-title justify-center text-2xl">
            <Users className="w-6 h-6" />
            Join Game
          </h2>
          <p className="text-center text-gray-600 mb-4">
            Enter a game ID to join an existing game
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Game ID"
              className="input input-bordered flex-1"
              value={gameIdToJoin}
              onChange={(e) => setGameIdToJoin(e.target.value)}
            />
            <button 
              className="btn btn-secondary"
              onClick={handleJoinGame}
              disabled={!gameIdToJoin.trim()}
            >
              Join
            </button>
          </div>
        </div>
      </div>

      {/* Recent Games Section */}
      {recentGames.length > 0 && (
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-4">Recent Games</h2>
            <div className="space-y-2">
              {recentGames.slice(0, 5).map((game) => (
                <div 
                  key={game._id} 
                  className="flex justify-between items-center p-3 bg-base-200 rounded-lg"
                >
                  <div>
                    <span className="font-medium">Game {game._id.slice(-6)}</span>
                    <span className={`ml-2 badge ${
                      game.status === 'waiting' ? 'badge-warning' :
                      game.status === 'playing' ? 'badge-success' :
                      'badge-neutral'
                    }`}>
                      {game.status}
                    </span>
                  </div>
                  <button 
                    className="btn btn-sm btn-outline"
                    onClick={() => navigate({ to: `/game/${game._id}` })}
                  >
                    {game.status === 'waiting' ? 'Join' : 'View'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* How to Play */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <h2 className="card-title text-xl">How to Play</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-600">
            <li><span className="text-blue-500 font-semibold">Runner (Blue)</span> starts in the center</li>
            <li><span className="text-red-500 font-semibold">"It" (Red)</span> starts at a random edge position</li>
            <li>Move your circle with your mouse</li>
            <li>Stay within the circular boundary</li>
            <li>Game ends when "It" catches the Runner</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
