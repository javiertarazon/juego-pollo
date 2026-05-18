/**
 * 🎲 COMPONENTE: GameBoard
 * =========================
 * Tablero 5x5 del juego del pollo
 */

'use client';

import { CellState } from '@/hooks/useChickenGame';
import { Flame, Snowflake, Crosshair, Crown, Skull } from 'lucide-react';

interface GameBoardProps {
  cells: CellState[][];
  suggestedPosition: number | null;
  hotZones: Array<{ position: number; percentage: number }>;
  coldZones: Array<{ position: number; percentage: number }>;
  onSuggestionClick: () => void;
}

const cellStyles: Record<CellState, string> = {
  hidden: 'bg-gray-800/50 border-gray-600/30 hover:bg-gray-700/50',
  chicken: 'bg-emerald-500/20 border-emerald-500/50',
  bone: 'bg-red-500/20 border-red-500/50',
  suggested: 'bg-blue-500/20 border-blue-500/50 animate-pulse',
};

export default function GameBoard({
  cells,
  suggestedPosition,
  hotZones,
  coldZones,
  onSuggestionClick,
}: GameBoardProps) {
  return (
    <div className="grid grid-cols-5 gap-1.5 sm:gap-2 max-w-[320px] sm:max-w-[360px] mx-auto">
      {cells.flat().map((cell, index) => {
        const position = index + 1;
        const isHot = hotZones.some(h => h.position === position && h.percentage > 30);
        const isCold = coldZones.some(c => c.position === position && c.percentage < 5);
        const isSuggested = position === suggestedPosition;

        return (
          <button
            key={index}
            className={`
              aspect-square rounded-lg border-2 flex flex-col items-center justify-center
              transition-all duration-200 text-sm font-medium relative
              ${cellStyles[cell]}
              ${isSuggested ? 'cursor-pointer hover:scale-105 ring-2 ring-blue-400/50' : 'cursor-default'}
            `}
            onClick={isSuggested ? onSuggestionClick : undefined}
            disabled={cell !== 'suggested'}
          >
            {/* Position number */}
            <span className="text-xs text-gray-400 absolute top-0.5 left-1">
              {position}
            </span>

            {/* Cell icon */}
            {cell === 'chicken' && <Crown className="w-5 h-5 text-emerald-400" />}
            {cell === 'bone' && <Skull className="w-5 h-5 text-red-400" />}
            {cell === 'suggested' && (
              <Crosshair className="w-5 h-5 text-blue-400 animate-bounce" />
            )}

            {/* Zone indicators */}
            {cell === 'hidden' && isHot && (
              <Flame className="w-3 h-3 text-orange-400 absolute bottom-0.5 right-0.5" />
            )}
            {cell === 'hidden' && isCold && (
              <Snowflake className="w-3 h-3 text-cyan-400 absolute bottom-0.5 right-0.5" />
            )}
          </button>
        );
      })}
    </div>
  );
}
