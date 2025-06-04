import { createFileRoute, useParams } from '@tanstack/react-router';
import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Authenticated, Unauthenticated } from 'convex/react';
import { SignInButton } from '@clerk/clerk-react';
import { api } from '../../convex/_generated/api';
import { GameCanvas } from '../components/GameCanvas';
import { Id } from '../../convex/_generated/dataModel';
import { useEffect, useState } from 'react';

export const Route = createFileRoute('/game/$gameId')({
  component: GamePage,
});

function GamePage() {
  const { gameId } = useParams({ from: '/game/$gameId' });
  
  return (
    <div className="container mx-auto px-4 py-8">
      <Unauthenticated>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Sign in to play!</h1>
          <SignInButton mode="modal">
            <button className="btn btn-primary btn-lg">Sign In</button>
          </SignInButton>
        </div>
      </Unauthenticated>

      <Authenticated>
        <GameView gameId={gameId as Id<'games'>} />
      </Authenticated>
    </div>
  );
}

function GameView({ gameId }: { gameId: Id<'games'> }) {
  const gameQueryOptions = convexQuery(api.games.getGame, { gameId });
  const { data: game } = useSuspenseQuery(gameQueryOptions);
  const [gameTime, setGameTime] = useState(0);

  // Timer effect
  useEffect(() => {
    if (!game || game.status !== 'playing' || !game.startTime) return;

    const interval = setInterval(() => {
      setGameTime(Date.now() - game.startTime!);
    }, 100);

    return () => clearInterval(interval);
  }, [game?.status, game?.startTime]);

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
          <div className="text-xl font-mono mt-2">
            Time: {formatTime(gameTime)}
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
        </div>
      </div>

      <GameCanvas
        gameId={gameId}
        gameRadius={game.gameRadius}
        players={game.players}
        gameStatus={game.status}
      />

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