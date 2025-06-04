import { createFileRoute, useParams, useSearch } from '@tanstack/react-router';
import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { api } from '../../convex/_generated/api';
import { GameCanvas } from '../components/GameCanvas';
import { Id } from '../../convex/_generated/dataModel';
import { useEffect, useState } from 'react';
import { useMutation } from 'convex/react';

export const Route = createFileRoute('/game/$gameId')({
  validateSearch: (search: Record<string, unknown>) => ({
    playerId: (search.playerId as string) || undefined,
  }),
  component: GamePage,
});

function GamePage() {
  const { gameId } = useParams({ from: '/game/$gameId' });
  const { playerId } = useSearch({ from: '/game/$gameId' });
  
  return (
    <div className="container mx-auto px-4 py-8">
      <GameView gameId={gameId as Id<'games'>} initialPlayerId={playerId} />
    </div>
  );
}

function GameView({ gameId, initialPlayerId }: { gameId: Id<'games'>, initialPlayerId?: string }) {
  const gameQueryOptions = convexQuery(api.games.getGame, { gameId });
  const { data: game, refetch } = useSuspenseQuery({
    ...gameQueryOptions,
    refetchInterval: 1000, // Refetch every 1 second for game state updates
  });
  const [gameTime, setGameTime] = useState(0);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(initialPlayerId || null);
  const [playerName, setPlayerName] = useState("");
  const joinGame = useMutation(api.games.joinGame);
  const restartGame = useMutation(api.games.restartGame);

  // Check if user is already in the game (from URL playerId or existing player)
  const isPlayerInGame = currentPlayerId && game?.players.some(p => p._id === currentPlayerId);
  
  // Get the actual player ID to use (either from state or find in game players)
  // If no currentPlayerId but game has 2 players and we have no initialPlayerId, we're likely a spectator
  const activePlayerId = currentPlayerId;

  // Timer effect
  useEffect(() => {
    if (!game || game.status !== 'playing' || !game.startTime) return;

    const interval = setInterval(() => {
      setGameTime(Date.now() - game.startTime!);
    }, 100);

    return () => clearInterval(interval);
  }, [game?.status, game?.startTime]);

  const handleJoinGame = async () => {
    try {
      const playerId = await joinGame({ 
        gameId, 
        playerName: playerName.trim() || undefined 
      });
      setCurrentPlayerId(playerId);
      // Force refetch to get updated game state
      await refetch();
    } catch (error) {
      console.error("Failed to join game:", error);
      alert("Failed to join game. The game might be full or already started.");
    }
  };

  const handleRestartGame = async () => {
    try {
      await restartGame({ gameId });
      await refetch();
    } catch (error) {
      console.error("Failed to restart game:", error);
      alert("Failed to restart game.");
    }
  };

  if (!game) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold text-red-600">Game not found</h1>
        <p>This game doesn't exist or has been deleted.</p>
      </div>
    );
  }

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">2D Tag Game</h1>
        
        {game.status === 'playing' && (
          <div className="text-xl font-mono mt-2 text-blue-600">
            ⏱️ Time: {formatTime(gameTime)}
          </div>
        )}
        
        {game.status === 'finished' && game.startTime && game.endTime && (
          <div className="text-xl font-mono mt-2 text-green-600">
            🏁 Final Time: {formatTime(game.endTime - game.startTime)}
          </div>
        )}
        
        <div className="mt-4 space-y-2">
          <h2 className="text-lg font-semibold">Players:</h2>
          <div className="flex justify-center space-x-8">
            {game.players.map((player) => (
              <div key={player._id} className="text-center">
                <div className={`inline-block w-4 h-4 rounded-full mr-2 ${
                  player.role === 'it' ? 'bg-red-500' : 'bg-blue-500'
                }`}></div>
                <span className="font-medium">
                  {player.user?.name || 'Player'} ({player.role})
                </span>
              </div>
            ))}
          </div>
          
          {/* Debug info */}
          <div className="text-xs text-gray-500 mt-2">
            Status: {game.status} | Players: {game.players.length} | Current Player ID: {currentPlayerId || 'none'}
          </div>
        </div>
      </div>

      <GameCanvas
        gameId={gameId}
        gameRadius={game.gameRadius}
        players={game.players}
        gameStatus={game.status}
        currentPlayerId={activePlayerId || undefined}
      />

      {game.status === 'waiting' && game.players.length < 2 && !isPlayerInGame && (
        <div className="text-center space-y-4">
          <h3 className="text-xl font-semibold">Join this game</h3>
          <div className="max-w-sm mx-auto space-y-2">
            <input
              type="text"
              placeholder="Your name (optional)"
              className="input input-bordered w-full"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={20}
            />
            <button 
              className="btn btn-primary w-full"
              onClick={handleJoinGame}
            >
              Join Game
            </button>
          </div>
        </div>
      )}

      {game.status === 'playing' && !isPlayerInGame && (
        <div className="text-center">
          <p className="text-lg font-semibold text-green-600">Game in Progress</p>
          <p className="text-sm text-gray-600">You are spectating this game.</p>
        </div>
      )}

      {game.status === 'finished' && (
        <div className="text-center space-y-4">
          <p className="text-xl font-bold text-green-600">Game Over!</p>
          <p className="text-sm text-gray-600">The "It" player caught the runner!</p>
          {isPlayerInGame && (
            <button 
              className="btn btn-primary btn-lg"
              onClick={handleRestartGame}
            >
              🔄 Restart Game
            </button>
          )}
        </div>
      )}

      {game.status === 'waiting' && game.players.length < 2 && (
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Share this URL with a friend to start the game:
          </p>
          <code className="bg-gray-100 px-4 py-2 rounded text-sm">
            {window.location.href}
          </code>
        </div>
      )}
    </div>
  );
}