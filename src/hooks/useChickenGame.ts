/**
 * 🎮 HOOK: useChickenGame
 * ========================
 * Hook principal para la lógica del juego del pollo.
 * Extraído del page.tsx monolítico.
 */

import { useState, useEffect, useCallback } from 'react';
import { MULTIPLICADORES_4_HUESOS } from '@/lib/multipliers';

export type CellState = 'hidden' | 'chicken' | 'bone' | 'suggested';

export interface GameState {
  // Board
  cells: CellState[][];
  revealedChickens: number[];
  revealedBones: number[];
  suggestedPosition: number | null;

  // Game
  gameActive: boolean;
  gameId: string | null;
  currentMultiplier: number;
  totalChickens: number;
  isCalculating: boolean;

  // Session
  sessionId: string;
  balanceInicial: number;
  apuestaActual: number;
  balanceActual: number;

  // Streaks
  rachaVictorias: number;
  rachaDerrotas: number;
  totalVictorias: number;
  totalDerrotas: number;

  // Config
  boneCount: number;
  tipoAsesor: 'original' | 'rentable';
  objetivoRentable: 2 | 3;
}

const MULTIPLIERS = MULTIPLICADORES_4_HUESOS;

export function useChickenGame() {
  const [cells, setCells] = useState<CellState[][]>(
    Array(5).fill(null).map(() => Array(5).fill('hidden'))
  );
  const [revealedChickens, setRevealedChickens] = useState<number[]>([]);
  const [revealedBones, setRevealedBones] = useState<number[]>([]);
  const [suggestedPosition, setSuggestedPosition] = useState<number | null>(null);
  const [gameActive, setGameActive] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [currentMultiplier, setCurrentMultiplier] = useState(1.0);
  const [totalChickens, setTotalChickens] = useState(0);
  const [isCalculating, setIsCalculating] = useState(false);

  // Session
  const [sessionId, setSessionId] = useState<string>('');
  const [balanceInicial, setBalanceInicial] = useState<number>(100);
  const [apuestaActual, setApuestaActual] = useState<number>(0.2);
  const [balanceActual, setBalanceActual] = useState<number>(100);

  // Streaks
  const [rachaVictorias, setRachaVictorias] = useState<number>(0);
  const [rachaDerrotas, setRachaDerrotas] = useState<number>(0);
  const [totalVictorias, setTotalVictorias] = useState<number>(0);
  const [totalDerrotas, setTotalDerrotas] = useState<number>(0);

  // Config
  const [boneCount, setBoneCount] = useState<number>(4);
  const [tipoAsesor, setTipoAsesor] = useState<'original' | 'rentable'>('original');
  const [objetivoRentable, setObjetivoRentable] = useState<2 | 3>(2);

  // Mark suggested position on board
  const markSuggestedPosition = useCallback((pos: number) => {
    setCells((prevCells) =>
      prevCells.map((row, rowIndex) =>
        row.map((cell, colIndex) => {
          const position = rowIndex * 5 + colIndex + 1;
          if (position === pos && cell !== 'chicken' && cell !== 'bone') {
            return 'suggested';
          }
          if (cell === 'suggested' && position !== pos) {
            return 'hidden';
          }
          return cell;
        })
      )
    );
  }, []);

  // Calculate and suggest next position
  const calculateAndSuggest = useCallback(async (
    chickensOverride?: number[],
    bonesOverride?: number[]
  ) => {
    setIsCalculating(true);
    await new Promise(resolve => setTimeout(resolve, 500));

    const chickens = chickensOverride || revealedChickens;
    const bones = bonesOverride || revealedBones;
    const revealed = [...chickens, ...bones];
    const availablePositions = Array.from({ length: 25 }, (_, i) => i + 1)
      .filter(pos => !revealed.includes(pos));

    if (availablePositions.length === 0) {
      setIsCalculating(false);
      return;
    }

    try {
      // Try Python ML first, then TypeScript fallback
      const predictResponse = await fetch('/api/chicken/predict-ml', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          revealedPositions: revealed,
          boneCount,
          tipoAsesor,
          objetivoRentable,
        }),
      });

      if (predictResponse.ok) {
        const predictData = await predictResponse.json();
        const suggestion = predictData.suggestion;
        if (suggestion) {
          setSuggestedPosition(suggestion.position);
        }
      }
    } catch (error) {
      console.error('Error calling predict API:', error);
    }

    setIsCalculating(false);
  }, [revealedChickens, revealedBones, boneCount, tipoAsesor, objetivoRentable]);

  // Confirm chicken
  const handleConfirmChicken = useCallback(async () => {
    const pos = suggestedPosition;
    if (!pos) return;

    const newChickens = [...revealedChickens, pos];
    const newCells = cells.map((r) => [...r]);
    const row = Math.floor((pos - 1) / 5);
    const col = (pos - 1) % 5;
    newCells[row][col] = 'chicken';
    setCells(newCells);
    setRevealedChickens(newChickens);
    setTotalChickens(newChickens.length);

    if (MULTIPLIERS[newChickens.length as keyof typeof MULTIPLIERS]) {
      setCurrentMultiplier(MULTIPLIERS[newChickens.length as keyof typeof MULTIPLIERS]);
    }

    setSuggestedPosition(null);

    // Submit to DB
    try {
      await fetch('/api/chicken/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boneCount,
          revealedPositions: [...newChickens, ...revealedBones],
          bonePositions: [],
          cashOutPosition: 0,
          hitBone: false,
          position: pos,
          isChicken: true,
        }),
      });
    } catch (error) {
      console.error('Error submitting position result:', error);
    }

    await calculateAndSuggest(newChickens, revealedBones);
  }, [suggestedPosition, revealedChickens, revealedBones, cells, boneCount, calculateAndSuggest]);

  // Confirm bone
  const handleConfirmBone = useCallback(async () => {
    const pos = suggestedPosition;
    if (!pos) return;

    const newBones = [...revealedBones, pos];
    const newCells = cells.map((r) => [...r]);
    const row = Math.floor((pos - 1) / 5);
    const col = (pos - 1) % 5;
    newCells[row][col] = 'bone';
    setCells(newCells);
    setRevealedBones(newBones);
    setSuggestedPosition(null);

    // Register loss in session
    try {
      const response = await fetch('/api/chicken/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId || `session-${Date.now()}`,
          tipo: 'PERDIDA',
          apuesta: apuestaActual,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setBalanceActual(data.balance.actual);
        if (data.estadisticas) {
          setRachaVictorias(data.estadisticas.rachaVictorias || 0);
          setRachaDerrotas(data.estadisticas.rachaDerrotas || 0);
          setTotalVictorias(data.estadisticas.totalVictorias || 0);
          setTotalDerrotas(data.estadisticas.totalDerrotas || 0);
        }
      }
    } catch (error) {
      console.error('Error registering loss:', error);
    }
  }, [suggestedPosition, revealedBones, cells, sessionId, apuestaActual]);

  // Start new game
  const iniciarNuevaPartida = useCallback(async () => {
    setGameId(`adv-${Date.now()}`);
    setGameActive(true);
    setCells(Array(5).fill(null).map(() => Array(5).fill('hidden')));
    setRevealedChickens([]);
    setRevealedBones([]);
    setTotalChickens(0);
    setCurrentMultiplier(1.0);
    setSuggestedPosition(null);
    await calculateAndSuggest([], []);
  }, [calculateAndSuggest]);

  // Withdraw
  const handleWithdraw = useCallback(async () => {
    if (totalChickens < 1) return;

    try {
      const response = await fetch('/api/chicken/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId || `session-${Date.now()}`,
          tipo: 'GANANCIA',
          apuesta: apuestaActual,
          posicionesDescubiertas: totalChickens,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setBalanceActual(data.balance.actual);
        if (data.estadisticas) {
          setRachaVictorias(data.estadisticas.rachaVictorias || 0);
          setRachaDerrotas(data.estadisticas.rachaDerrotas || 0);
          setTotalVictorias(data.estadisticas.totalVictorias || 0);
          setTotalDerrotas(data.estadisticas.totalDerrotas || 0);
        }
      }
    } catch (error) {
      console.error('Error registering win:', error);
    }

    await fetch('/api/chicken/result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        boneCount,
        revealedPositions: [...revealedChickens, ...revealedBones],
        bonePositions: [],
        cashOutPosition: totalChickens,
        hitBone: false,
      }),
    });
  }, [totalChickens, sessionId, apuestaActual, boneCount, revealedChickens, revealedBones]);

  // Reset everything
  const resetGame = useCallback(() => {
    setSessionId('');
    setBalanceInicial(100);
    setApuestaActual(0.2);
    setBalanceActual(100);
    setGameId(null);
    setGameActive(false);
    setCells(Array(5).fill(null).map(() => Array(5).fill('hidden')));
    setRevealedChickens([]);
    setRevealedBones([]);
    setTotalChickens(0);
    setCurrentMultiplier(1.0);
    setSuggestedPosition(null);
  }, []);

  // Mark suggested position when it changes
  useEffect(() => {
    if (suggestedPosition !== null && gameActive) {
      markSuggestedPosition(suggestedPosition);
    }
  }, [suggestedPosition, gameActive, markSuggestedPosition]);

  return {
    // State
    cells,
    revealedChickens,
    revealedBones,
    suggestedPosition,
    gameActive,
    gameId,
    currentMultiplier,
    totalChickens,
    isCalculating,
    sessionId,
    balanceInicial,
    apuestaActual,
    balanceActual,
    rachaVictorias,
    rachaDerrotas,
    totalVictorias,
    totalDerrotas,
    boneCount,
    tipoAsesor,
    objetivoRentable,

    // Actions
    setBoneCount,
    setTipoAsesor,
    setObjetivoRentable,
    setSessionId,
    setBalanceInicial,
    setApuestaActual,
    setBalanceActual,
    setRevealedBones,
    handleConfirmChicken,
    handleConfirmBone,
    handleWithdraw,
    iniciarNuevaPartida,
    resetGame,
    calculateAndSuggest,
  };
}
