import React, { useRef, useEffect, useCallback } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

interface Player {
  _id: string;
  role: 'it' | 'runner';
  position: { x: number; y: number };
  user: { name: string } | null;
}

interface GameCanvasProps {
  gameId: Id<'games'>;
  gameRadius: number;
  players: Player[];
  gameStatus: 'waiting' | 'playing' | 'finished';
  currentPlayerId?: string;
}

export function GameCanvas({ 
  gameId, 
  gameRadius, 
  players, 
  gameStatus,
  currentPlayerId 
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const updatePosition = useMutation(api.games.updatePosition);
  const lastUpdateRef = useRef(0);
  const lastPositionRef = useRef({ x: 0, y: 0 });
  
  const canvasSize = 600;
  const scale = canvasSize / (gameRadius * 2);
  const playerRadius = 20;
  
  // Performance and gameplay settings
  const THROTTLE_MS = 100; // Reduce to 10 FPS for less lag
  const MAX_SPEED = 3; // Maximum pixels per frame movement

  // Convert game coordinates to canvas coordinates
  const gameToCanvas = useCallback((gameX: number, gameY: number) => {
    return {
      x: (gameX + gameRadius) * scale,
      y: (gameY + gameRadius) * scale,
    };
  }, [gameRadius, scale]);

  // Convert canvas coordinates to game coordinates
  const canvasToGame = useCallback((canvasX: number, canvasY: number) => {
    return {
      x: (canvasX / scale) - gameRadius,
      y: (canvasY / scale) - gameRadius,
    };
  }, [gameRadius, scale]);

  // Handle mouse movement with throttling and speed limiting
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameStatus !== 'playing' || !currentPlayerId) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const canvasX = event.clientX - rect.left;
    const canvasY = event.clientY - rect.top;
    
    const targetGamePos = canvasToGame(canvasX, canvasY);
    
    // Apply speed limiting
    const dx = targetGamePos.x - lastPositionRef.current.x;
    const dy = targetGamePos.y - lastPositionRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    let newPos = targetGamePos;
    if (distance > MAX_SPEED) {
      // Limit movement to MAX_SPEED pixels
      newPos = {
        x: lastPositionRef.current.x + (dx / distance) * MAX_SPEED,
        y: lastPositionRef.current.y + (dy / distance) * MAX_SPEED,
      };
    }
    
    // Constrain to circle boundary
    const boundaryDistance = Math.sqrt(newPos.x * newPos.x + newPos.y * newPos.y);
    const constrainedPos = boundaryDistance > gameRadius 
      ? {
          x: (newPos.x / boundaryDistance) * gameRadius,
          y: (newPos.y / boundaryDistance) * gameRadius,
        }
      : newPos;

    // Throttle database updates
    const now = Date.now();
    if (now - lastUpdateRef.current >= THROTTLE_MS) {
      lastUpdateRef.current = now;
      lastPositionRef.current = constrainedPos;
      
      // Update position in database
      updatePosition({ 
        gameId, 
        playerId: currentPlayerId as Id<'players'>, 
        position: constrainedPos 
      });
    } else {
      // Update local position immediately for smooth movement
      lastPositionRef.current = constrainedPos;
    }
  }, [gameStatus, gameId, gameRadius, canvasToGame, updatePosition, currentPlayerId, THROTTLE_MS, MAX_SPEED]);

  // Render the game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvasSize, canvasSize);

    // Draw game boundary
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(canvasSize / 2, canvasSize / 2, gameRadius * scale, 0, 2 * Math.PI);
    ctx.stroke();

    // Draw players
    players.forEach((player) => {
      const canvasPos = gameToCanvas(player.position.x, player.position.y);
      
      ctx.beginPath();
      ctx.arc(canvasPos.x, canvasPos.y, playerRadius, 0, 2 * Math.PI);
      
      // Color based on role
      if (player.role === 'it') {
        ctx.fillStyle = '#ef4444'; // red
      } else {
        ctx.fillStyle = '#3b82f6'; // blue
      }
      
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw player name
      ctx.fillStyle = '#000000';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        player.user?.name || 'Player',
        canvasPos.x,
        canvasPos.y - playerRadius - 5
      );
    });

    // Draw center dot for reference
    ctx.fillStyle = '#9ca3af';
    ctx.beginPath();
    ctx.arc(canvasSize / 2, canvasSize / 2, 3, 0, 2 * Math.PI);
    ctx.fill();

  }, [players, gameRadius, scale, gameToCanvas]);

  return (
    <div className="flex flex-col items-center space-y-4">
      <canvas
        ref={canvasRef}
        width={canvasSize}
        height={canvasSize}
        onMouseMove={handleMouseMove}
        className="border-2 border-gray-300 rounded-lg cursor-crosshair bg-gray-50"
        style={{ maxWidth: '100%', height: 'auto' }}
      />
      
      {gameStatus === 'waiting' && (
        <div className="text-center">
          <p className="text-lg font-semibold">Waiting for another player...</p>
          <p className="text-sm text-gray-600">Share this game to invite someone!</p>
        </div>
      )}
      
      {gameStatus === 'playing' && (
        <div className="text-center">
          <p className="text-lg font-semibold">Game in progress!</p>
          <p className="text-sm text-gray-600">
            <span className="text-red-500">Red (It)</span> tries to catch <span className="text-blue-500">Blue (Runner)</span>
          </p>
        </div>
      )}
      
      {gameStatus === 'finished' && (
        <div className="text-center">
          <p className="text-xl font-bold text-green-600">Game Over!</p>
          <p className="text-sm text-gray-600">The "It" player won by catching the runner!</p>
        </div>
      )}
    </div>
  );
}