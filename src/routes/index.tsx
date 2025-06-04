import { SignInButton } from "@clerk/clerk-react";
import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Authenticated, Unauthenticated, useMutation } from "convex/react";
import { Target, Play, Users } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";

const myGamesQueryOptions = convexQuery(api.games.getMyGames, {});

export const Route = createFileRoute("/")({
  loader: async ({ context: { queryClient } }) =>
    await queryClient.ensureQueryData(myGamesQueryOptions),
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

      <Unauthenticated>
        <div className="text-center">
          <p className="text-lg mb-6">Sign in to start playing!</p>
          <div className="not-prose">
            <SignInButton mode="modal">
              <button className="btn btn-primary btn-lg">
                <Play className="w-5 h-5 mr-2" />
                Get Started
              </button>
            </SignInButton>
          </div>
        </div>
      </Unauthenticated>

      <Authenticated>
        <GameLobby />
      </Authenticated>
    </div>
  );
}

function GameLobby() {
  const { data: myGames } = useSuspenseQuery(myGamesQueryOptions);
  const createGame = useMutation(api.games.createGame);
  const joinGame = useMutation(api.games.joinGame);
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [gameIdToJoin, setGameIdToJoin] = useState("");

  const handleCreateGame = async () => {
    setIsCreating(true);
    try {
      const gameId = await createGame({ gameRadius: 250 });
      navigate({ to: `/game/${gameId}` });
    } catch (error) {
      console.error("Failed to create game:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinGame = async () => {
    if (!gameIdToJoin.trim()) return;
    
    try {
      await joinGame({ gameId: gameIdToJoin as any });
      navigate({ to: `/game/${gameIdToJoin}` });
    } catch (error) {
      console.error("Failed to join game:", error);
      alert("Failed to join game. Make sure the game ID is correct and the game is waiting for players.");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
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

      {/* My Games Section */}
      {myGames.length > 0 && (
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-4">My Games</h2>
            <div className="space-y-2">
              {myGames.map((game) => (
                <div 
                  key={game?._id} 
                  className="flex justify-between items-center p-3 bg-base-200 rounded-lg"
                >
                  <div>
                    <span className="font-medium">Game {game?._id}</span>
                    <span className={`ml-2 badge ${
                      game?.status === 'waiting' ? 'badge-warning' :
                      game?.status === 'playing' ? 'badge-success' :
                      'badge-neutral'
                    }`}>
                      {game?.status}
                    </span>
                  </div>
                  <button 
                    className="btn btn-sm btn-outline"
                    onClick={() => navigate({ to: `/game/${game?._id}` })}
                  >
                    View
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
