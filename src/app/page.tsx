'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  AlertCircle,
  Flame,
  Snowflake,
  Target,
  TrendingUp,
  Zap,
  Crown,
  Skull,
  Play,
  RotateCcw,
  BarChart3,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RefreshCw,
  Info,
  Download,
  Moon,
  Sun,
  Wallet,
  TrendingUp as TrendingUpIcon,
  AlertTriangle,
} from 'lucide-react';

const MULTIPLIERS = {
  1: 1.17,
  2: 1.41,
  3: 1.71,
  4: 2.09,
  5: 2.58,
  6: 3.23,
  7: 4.09,
  8: 5.26,
  9: 6.88,
  10: 9.17,
  11: 12.50,
  12: 17.50,
  13: 25.00,
  14: 37.50,
  15: 58.33,
  16: 100.00,
  17: 183.33,
  18: 366.67,
  19: 825.00,
  20: 2062.50,
  21: 6187.50,
} as const;

type CellState = 'hidden' | 'chicken' | 'bone' | 'suggested';

interface PositionData {
  position: number;
  probability: number;
  reasons: string[];
}

interface GameState {
  totalGames: number;
  victories: number;
  avgMultiplier: number;
  hotZones: Array<{ position: number; percentage: number }>;
  coldZones: Array<{ position: number; percentage: number }>;
}

export default function ChickenAIAdvisor() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [boneCount, setBoneCount] = useState<number>(4);
  const [gameId, setGameId] = useState<string | null>(null);
  
  // Balance y apuesta
  const [sessionId, setSessionId] = useState<string>('');
  const [balanceInicial, setBalanceInicial] = useState<number>(100);
  const [apuestaActual, setApuestaActual] = useState<number>(0.2);
  const [balanceActual, setBalanceActual] = useState<number>(100);
  const [showBalanceDialog, setShowBalanceDialog] = useState<boolean>(false);
  
  // Rachas
  const [rachaVictorias, setRachaVictorias] = useState<number>(0);
  const [rachaDerrotas, setRachaDerrotas] = useState<number>(0);
  const [totalVictorias, setTotalVictorias] = useState<number>(0);
  const [totalDerrotas, setTotalDerrotas] = useState<number>(0);
  
  // Board state
  const [cells, setCells] = useState<CellState[][]>(
    Array(5).fill(null).map(() => Array(5).fill('hidden'))
  );
  const [revealedChickens, setRevealedChickens] = useState<number[]>([]);
  const [revealedBones, setRevealedBones] = useState<number[]>([]);
  const [suggestedPosition, setSuggestedPosition] = useState<number | null>(null);
  
  // Statistics
  const [hotZones, setHotZones] = useState<Array<{ position: number; percentage: number }>>([]);
  const [coldZones, setColdZones] = useState<Array<{ position: number; percentage: number }>>([]);
  const [positionProbabilities, setPositionProbabilities] = useState<Record<number, number>>({});
  const [gameStats, setGameStats] = useState<GameState | null>(null);
  
  // Dialog states
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showBoneRequestDialog, setShowBoneRequestDialog] = useState(false);
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  const [realBonePositionsInput, setRealBonePositionsInput] = useState('');
  const [gameEndedBy, setGameEndedBy] = useState<'withdraw' | 'bone' | null>(null);
  
  // Game state
  const [gameActive, setGameActive] = useState(false);
  const [currentMultiplier, setCurrentMultiplier] = useState(1.0);
  const [totalChickens, setTotalChickens] = useState(0);
  const [isCalculating, setIsCalculating] = useState(false);

  // Simulator state
  const [simulatorBoneCount, setSimulatorBoneCount] = useState<number>(4);
  const [simulationCount, setSimulationCount] = useState<number>(100);
  const [targetPositions, setTargetPositions] = useState<number>(5); // NUEVO: Objetivo de posiciones
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationProgress, setSimulationProgress] = useState(0);
  const [simulatedGames, setSimulatedGames] = useState(0);
  const [lastSimulationSummary, setLastSimulationSummary] = useState<string>('');

  // Training state
  const [useTrainedPatterns, setUseTrainedPatterns] = useState<boolean>(true);
  const [isTrainingSimulator, setIsTrainingSimulator] = useState(false);
  const [isTrainingAdvisor, setIsTrainingAdvisor] = useState(false);
  const [trainingStatus, setTrainingStatus] = useState<string>('');
  const [simulatorTrainingData, setSimulatorTrainingData] = useState<any>(null);
  const [advisorTrainingData, setAdvisorTrainingData] = useState<any>(null);

  // Asesor ML state
  const [tipoAsesor, setTipoAsesor] = useState<'original' | 'rentable'>('original');
  const [objetivoRentable, setObjetivoRentable] = useState<2 | 3>(2);

  // ML Patterns state
  interface MLPatterns {
    detectedPatterns: any[];
    frequentSequences: any[];
    predictionRules: any[];
  }
  interface ServerPatternAnalysis {
    analysis: {
      gamesAnalyzed: number;
      boneCount: number;
      serverBehavior: {
        isPredictable: boolean;
        predictabilityLevel: string;
        predictabilityScore: number;
        topRiskyPositions: Array<{ position: number; frequency: number; winRate: number }>;
        topSafePositions: Array<{ position: number; winRate: number }>;
        repeatingPatterns: any[];
        hotStreaks: any[];
      };
      insights: Array<{
        type: string;
        severity: string;
        message: string;
        data: any;
      }>;
    };
    positionAnalysis: {
      boneFrequency: Array<{ position: number; timesAsBone: number; percentage: number; winRate: number }>;
      riskyPositions: Array<{ position: number; frequency: number; winRate: number }>;
      safePositions: Array<{ position: number; winRate: number }>;
    };
    patternAnalysis: {
      repeatingBoneSets: Array<{
        boneSet: string;
        count: number;
        dates: Date[];
        avgGap: number;
      }>;
      hotStreaks: any[];
    };
  }
  const [mlPatterns, setMLPatterns] = useState<MLPatterns>({
    detectedPatterns: [],
    frequentSequences: [],
    predictionRules: [],
  });
  const [patternAnalysis, setPatternAnalysis] = useState<ServerPatternAnalysis | null>(null);

  // Advanced Analysis state
  interface AdvancedAnalysis {
    analysis: {
      gamesAnalyzed: number;
      recentGamesAnalyzed: number;
      overallWinProbability: number;
      safePositionProbability: number;
    };
    bonePositionFrequency: Array<{
      position: number;
      count: number;
      percentage: number;
      gamesBetweenOccurrence: number;
    }>;
    chickenPositionFrequency: Array<{
      position: number;
      count: number;
      percentage: number;
      gamesBetweenOccurrence: number;
    }>;
    transitionPatterns: Array<{
      count: number;
      from: string;
      to: string;
      examples: Array<{ gameId: number; from: number[]; to: number[] }>;
    }>;
    positionTransitions: Array<{
      position: number;
      safeToBone: number;
      boneToSafe: number;
      safeToSafe: number;
      boneToBone: number;
      total: number;
      boneProbability: number;
      transitionProbability: {
        safeToBone: number;
        boneToSafe: number;
      };
    }>;
    proximityAnalysis: Array<{
      distance: number;
      count: number;
      percentage: number;
    }>;
    adjacentBonePatterns: Array<{
      count: number;
      positions: number[];
    }>;
    cashOutAnalysis: Array<{
      position: number;
      growthFactor: number;
      successRate: number;
      expectedReturn: number;
      gamesReached: number;
      gamesWon: number;
      recommendation: string;
    }>;
    bettingStrategy: Array<{
      consecutiveWins: number;
      consecutiveLosses: number;
      recommendedMultiplier: number;
      explanation: string;
      riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    }>;
    profitablePatterns: Array<{
      pattern: string;
      frequency: number;
      successRate: number;
      expectedGrowth: number;
      confidence: 'ALTA' | 'MEDIA' | 'BAJA';
    }>;
    optimalStrategy: {
      targetCashOutPosition: number;
      expectedReturn: number;
      baseBetMultiplier: number;
      conservativeBetMultiplier: number;
      aggressiveBetMultiplier: number;
      strategyType: string;
      explanation: string;
      dailyGoal: string;
    };
    riskManagement: {
      maxConsecutiveLosses: number;
      maxConsecutiveWins: number;
      recommendedMaxBet: number;
      recommendedMinBet: number;
      emergencyStopThreshold: number;
    };
  }
  const [advancedAnalysis, setAdvancedAnalysis] = useState<AdvancedAnalysis | null>(null);
  const [isFetchingAdvancedAnalysis, setIsFetchingAdvancedAnalysis] = useState(false);

  // Betting Strategy state
  interface BettingStrategy {
    streak: {
      currentWins: number;
      currentLosses: number;
      last5Games: { wins: number; losses: number };
      last10Games: { wins: number; losses: number };
    };
    betting: {
      multiplier: number;
      riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';
      explanation: string;
      action: string;
      recommendedBet: number;
      minBet: number;
      maxBet: number;
    };
    positions: any;
  }
  const [bettingStrategy, setBettingStrategy] = useState<BettingStrategy | null>(null);

  // Initialize
  useEffect(() => {
    fetchStatistics();
    fetchPatternAnalysis();
    fetchAdvancedAnalysis();
  }, [boneCount]);

  const fetchAdvancedAnalysis = async () => {
    try {
      setIsFetchingAdvancedAnalysis(true);
      const response = await fetch('/api/chicken/advanced-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boneCount }),
      });

      if (response.ok) {
        const data = await response.json();
        if (!data.error) {
          setAdvancedAnalysis(data);
          // console.log('Advanced analysis loaded:', data);
        }
      }
    } catch (error) {
      console.error('Error fetching advanced analysis:', error);
    } finally {
      setIsFetchingAdvancedAnalysis(false);
    }
  };

  const fetchPatternAnalysis = async () => {
    try {
      const response = await fetch('/api/chicken/pattern-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boneCount,
          minGames: 10,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPatternAnalysis(data);
        // console.log('Pattern analysis loaded:', data);
        // Update position probabilities with server behavior insights
        if (data.positionAnalysis) {
          updatePositionsWithServerInsights(data.positionAnalysis);
        }
      }
    }
    } catch (error) {
      console.error('Error fetching pattern analysis:', error);
    }
  };

  const updatePositionsWithServerInsights = (positionAnalysis: any) => {
    // Adjust position probabilities based on Mystake's behavior patterns
    const adjustedProbabilities: Record<number, number> = {};

    for (let i = 1; i <= 25; i++) {
      let adjustedRate = positionProbabilities[i] || 0.5;

      // Penalize risky positions
      if (positionAnalysis.riskyPositions) {
        const isRisky = positionAnalysis.riskyPositions.some((rp: any) => rp.position === i);
        if (isRisky) {
          adjustedRate = Math.max(0, adjustedRate - 0.2); // Penalize risky positions
        }
      }

      // Boost safe positions
      if (positionAnalysis.safePositions) {
        const isSafe = positionAnalysis.safePositions.some((sp: any) => sp.position === i);
        if (isSafe) {
          adjustedRate = Math.min(1, adjustedRate + 0.1); // Boost safe positions slightly
        }
      }

      adjustedProbabilities[i] = adjustedRate;
    }

    setPositionProbabilities(adjustedProbabilities);
    // console.log('Position probabilities adjusted with server insights:', adjustedProbabilities);
  };

  const fetchStatistics = async () => {
    try {
      const [statsRes, patternsRes] = await Promise.all([
        fetch('/api/chicken/result'),
        fetch(`/api/chicken/patterns?boneCount=${boneCount}`),
      ]);

      // Parse stats and patterns first
      const statsData = await statsRes.json();
      const patternsData = await patternsRes.json();

      // Try to get predictions, but don't fail if it errors
      let predictData: any = { suggestion: null, ml: null };
      try {
        const predictRes = await fetch('/api/chicken/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ revealedPositions: [], boneCount: boneCount || 4 }),
        });

        if (predictRes.ok) {
          predictData = await predictRes.json();
          console.log("Debug: ML V5 predictData =", predictData);
        } else {
          console.warn("Predict endpoint returned error:", predictRes.status);
        }
      } catch (predictError) {
        console.warn("Predict endpoint failed, continuing without predictions:", predictError);
      }

      // Calculate position probabilities
      const probs: Record<number, number> = {};
      if (statsData.stats && Array.isArray(statsData.stats)) {
        statsData.stats.forEach((s: any) => {
          probs[s.position] = s.winRate;
        });
      }
      setPositionProbabilities(probs);

      // Extract hotZones and coldZones from predictionRules
      const hotZoneRule = patternsData.predictionRules?.find((r: any) => r.type === 'HOT_ZONES');
      const coldZoneRule = patternsData.predictionRules?.find((r: any) => r.type === 'COLD_ZONES');

      const hotZones = hotZoneRule?.positions?.map((pos: number, idx: number) => ({
        position: pos,
        percentage: hotZoneRule.percentages?.[idx] || 0
      })) || [];

      const coldZones = coldZoneRule?.positions?.map((pos: number, idx: number) => ({
        position: pos,
        percentage: coldZoneRule.percentages?.[idx] || 0
      })) || [];

      setHotZones(hotZones);
      setColdZones(coldZones);

      // Store ML patterns and rules
      setMLPatterns({
        detectedPatterns: patternsData.detectedPatterns || [],
        frequentSequences: patternsData.frequentSequences || [],
        predictionRules: patternsData.predictionRules || [],
      });

      // Store ML data from ML V5 API
      if (predictData.ml) {
        // ML V5 doesn't have bettingStrategy, but we can use the ML stats
        console.log("ML V5 Stats:", predictData.ml);
      }

      // Calculate game stats
      const totalGames = statsData.stats && Array.isArray(statsData.stats)
        ? statsData.stats.reduce((sum: number, s: any) => sum + s.totalGames, 0)
        : 0;
      setGameStats({
        totalGames,
        victories: 0, // Will be calculated from actual games
        avgMultiplier: 0,
        hotZones,
        coldZones,
      });
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  // Iniciar sesión completa (primera vez)
  const startAdvising = async () => {
    // Mostrar diálogo para solicitar balance y apuesta
    setShowBalanceDialog(true);
  };
  
  // Iniciar sesión con balance (primera vez)
  const iniciarPartidaConBalance = async () => {
    // Generar sessionId único si no existe
    if (!sessionId) {
      const newSessionId = `session-${Date.now()}`;
      setSessionId(newSessionId);
    }
    
    // Crear o actualizar sesión con balance inicial
    try {
      const response = await fetch(`/api/chicken/session?sessionId=${sessionId || `session-${Date.now()}`}&balanceInicial=${balanceInicial}`);
      const data = await response.json();
      
      if (data.success) {
        setBalanceActual(data.balance.actual);
        // Actualizar rachas
        if (data.estadisticas) {
          setRachaVictorias(data.estadisticas.rachaVictorias || 0);
          setRachaDerrotas(data.estadisticas.rachaDerrotas || 0);
          setTotalVictorias(data.estadisticas.totalVictorias || 0);
          setTotalDerrotas(data.estadisticas.totalDerrotas || 0);
        }
        console.log('✅ Sesión iniciada:', data);
      }
    } catch (error) {
      console.error('❌ Error al iniciar sesión:', error);
    }
    
    setShowBalanceDialog(false);
    
    console.log('🎮 Sesión iniciada con balance:', balanceInicial, 'y apuesta:', apuestaActual);
    
    // Iniciar primera partida
    await iniciarNuevaPartida();
  };
  
  // Actualizar rachas desde la sesión
  const actualizarRachas = async () => {
    try {
      const response = await fetch(`/api/chicken/session?sessionId=${sessionId}`);
      const data = await response.json();
      
      if (data.success && data.estadisticas) {
        setRachaVictorias(data.estadisticas.rachaVictorias || 0);
        setRachaDerrotas(data.estadisticas.rachaDerrotas || 0);
        setTotalVictorias(data.estadisticas.totalVictorias || 0);
        setTotalDerrotas(data.estadisticas.totalDerrotas || 0);
        setBalanceActual(data.balance.actual);
        console.log('📊 Rachas actualizadas:', data.estadisticas);
        
        // Stop-loss: Alertar después de 3 derrotas consecutivas
        if (data.estadisticas.rachaDerrotas >= 3) {
          const continuar = window.confirm(
            `⚠️ ALERTA DE STOP-LOSS\n\n` +
            `Has perdido ${data.estadisticas.rachaDerrotas} partidas consecutivas.\n` +
            `Balance actual: ${data.balance.actual.toFixed(2)}\n` +
            `Pérdidas acumuladas: ${data.balance.perdido.toFixed(2)}\n\n` +
            `Recomendaciones:\n` +
            `• Tomar un descanso\n` +
            `• Revisar estrategia\n` +
            `• Reducir apuesta\n\n` +
            `¿Deseas continuar jugando?`
          );
          
          if (!continuar) {
            await salirCompletamente();
          }
        }
      }
    } catch (error) {
      console.error('❌ Error al actualizar rachas:', error);
    }
  };
  
  // Iniciar nueva partida (mantiene rachas, balance y estadísticas)
  const iniciarNuevaPartida = async () => {
    console.log('🎮 ===== INICIANDO NUEVA PARTIDA =====');
    console.log('📊 Manteniendo: rachas, balance, estadísticas');
    console.log('🔄 Reseteando: solo tablero y partida actual');
    
    // Solo resetear el tablero y la partida actual
    setGameId(`adv-${Date.now()}`);
    setGameActive(true);
    setCells(Array(5).fill(null).map(() => Array(5).fill('hidden')));
    setRevealedChickens([]);
    setRevealedBones([]);
    setTotalChickens(0);
    setCurrentMultiplier(1.0);
    setSuggestedPosition(null);
    
    console.log('✅ Nueva partida iniciada. Balance actual:', balanceActual);
    
    // Calculate and suggest first position
    await calculateAndSuggest();
  };
  
  // Salir completamente y resetear todo el sistema
  const salirCompletamente = async () => {
    const confirmar = window.confirm(
      '¿Estás seguro de que quieres salir?\n\n' +
      'Esto reseteará:\n' +
      '• Balance y apuesta\n' +
      '• Rachas de victorias/derrotas\n' +
      '• Sesión actual\n' +
      '• Tablero y partida\n\n' +
      'Las estadísticas históricas se mantendrán en la base de datos.'
    );
    
    if (!confirmar) {
      return;
    }
    
    console.log('🚪 ===== SALIENDO COMPLETAMENTE =====');
    console.log('🔄 Reseteando todo el sistema...');
    
    // Resetear todo el estado
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
    setShowBalanceDialog(false);
    setShowConfirmDialog(false);
    setShowBoneRequestDialog(false);
    setGameEndedBy(null);
    
    console.log('✅ Sistema reseteado completamente');
    console.log('👋 Listo para iniciar nueva sesión');
  };

  const calculateAndSuggest = async (revealedChickensOverride?: number[], revealedBonesOverride?: number[]) => {
    setIsCalculating(true);

    // Simulate calculation delay for UX
    await new Promise(resolve => setTimeout(resolve, 500));

    // Get all available positions - use override values if provided
    const chickens = revealedChickensOverride || revealedChickens;
    const bones = revealedBonesOverride || revealedBones;
    const revealed = [...chickens, ...bones];

    // console.log('Calculating suggestion. Revealed chickens:', chickens);
    // console.log('Revealed bones:', bones);
    // console.log('Total revealed:', revealed);

    const availablePositions = Array.from({ length: 25 }, (_, i) => i + 1)
      .filter(pos => !revealed.includes(pos));

    // console.log('Available positions:', availablePositions);

    if (availablePositions.length === 0) {
      setIsCalculating(false);
      return;
    }

    try {
      // Call predict API with advanced strategy
      const predictResponse = await fetch('/api/chicken/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          revealedPositions: revealed,
          boneCount,
          tipoAsesor, // 'original' o 'rentable'
          objetivoRentable, // 2 o 3 posiciones
        }),
      });

      if (predictResponse.ok) {
        const predictData = await predictResponse.json();

        // console.log('Predict API response:', predictData);

        // Store ML data from ML V5 API
        if (predictData.ml) {
          console.log("ML V5 Stats:", predictData.ml);
        }

        // Get the prediction from ML V5 API
        const suggestion = predictData.suggestion;
        if (suggestion) {
          // console.log('Best position from ML V5 API:', suggestion);
          setSuggestedPosition(suggestion.position);
        }
      } else {
        // Fallback to local calculation
        // console.log('API prediction failed, using local calculation');
        fallbackToLocalCalculation(availablePositions, revealed);
      }
    } catch (error) {
      console.error('Error calling predict API:', error);
      // Fallback to local calculation
      fallbackToLocalCalculation(availablePositions, revealed);
    }

    setIsCalculating(false);
    // console.log('calculateAndSuggest completed');
  };

  const fallbackToLocalCalculation = (availablePositions: number[], revealed: number[]) => {
    // Score each position
    const scoredPositions = availablePositions.map(pos => {
      let score = 0;
      const reasons: string[] = [];

      // Factor 1: Historical win rate
      const winRate = positionProbabilities[pos] || 0.5;
      score += winRate * 50;
      if (winRate > 0.7) {
        reasons.push('Alto win rate histórico');
      } else if (winRate < 0.3) {
        reasons.push('Bajo win rate histórico');
      }

      // Factor 2: Hot zone penalty
      const isHotZone = hotZones.some((h) => h.position === pos && h.percentage > 30);
      if (isHotZone) {
        score -= 25;
        reasons.push('Zona caliente de huesos');
      }

      // Factor 3: Cold zone bonus
      const isColdZone = coldZones.some((c) => c.position === pos && c.percentage < 5);
      if (isColdZone) {
        score += 30;
        reasons.push('Zona fría (seguridad)');
      }

      // Factor 4: Avoid clustering
      const adjacentToChicken = revealedChickens.some(rc => {
        const diff = Math.abs(pos - rc);
        return diff === 1 || diff === 5 || diff === 6;
      });
      if (adjacentToChicken && revealedChickens.length > 2) {
        score -= 15;
        reasons.push('Cerca de pollo reciente');
      }

      return {
        position: pos,
        probability: Math.max(0, Math.min(100, score)),
        reasons,
      };
    });

    // Sort by probability and pick best
    scoredPositions.sort((a, b) => b.probability - a.probability);
    const bestPosition = scoredPositions[0];

    // console.log('Best position (fallback):', bestPosition);
    setSuggestedPosition(bestPosition.position);
  };

  // Mark suggested position on board when it changes - called when suggestedPosition changes
  useEffect(() => {
    if (suggestedPosition !== null && gameActive) {
      markSuggestedPosition(suggestedPosition);
    }
  }, [suggestedPosition, gameActive]);

  const markSuggestedPosition = (pos: number) => {
    setCells((prevCells) => {
      const newCells = prevCells.map((row, rowIndex) => row.map((cell, colIndex) => {
        const position = rowIndex * 5 + colIndex + 1;
        // Keep chicken/bone status, only mark new suggestion
        if (position === pos && cell !== 'chicken' && cell !== 'bone') {
          return 'suggested';
        }
        // Clear any old suggestion that's not current one
        if (cell === 'suggested' && position !== pos) {
          return 'hidden';
        }
        return cell;
      }));
      return newCells;
    });
  };

  const handleSuggestionClick = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmChicken = async () => {
    const pos = suggestedPosition;
    if (!pos) return;

    // Add new chicken BEFORE updating state
    const newChickens = [...revealedChickens, pos];
    
    // console.log('===== Confirming chicken =====');
    // console.log('Position:', pos);
    // console.log('Previous chickens:', revealedChickens);
    // console.log('New chickens:', newChickens);

    // Mark as chicken in cells
    const newCells = cells.map((r) => [...r]);
    const row = Math.floor((pos - 1) / 5);
    const col = (pos - 1) % 5;
    newCells[row][col] = 'chicken';
    setCells(newCells);

    setRevealedChickens(newChickens);
    setTotalChickens(newChickens.length);

    // Update multiplier
    if (MULTIPLIERS[newChickens.length as keyof typeof MULTIPLIERS]) {
      setCurrentMultiplier(MULTIPLIERS[newChickens.length as keyof typeof MULTIPLIERS]);
    }

    setSuggestedPosition(null);
    setShowConfirmDialog(false);

    // Submit result to database
    await submitPositionResult(pos, 'chicken');

    // console.log('===== Confirming chicken completed =====');
    // console.log('Current chickens:', newChickens);

    // Calculate and suggest next - pass updated chickens
    await calculateAndSuggest(newChickens, revealedBones);
  };

  const handleConfirmBone = async () => {
    const pos = suggestedPosition;
    if (!pos) return;

    // Add new bone BEFORE updating state
    const newBones = [...revealedBones, pos];
    
    console.log('❌ ===== DERROTA - Confirmando hueso =====');
    console.log('Position:', pos);
    console.log('Pollos descubiertos:', revealedChickens.length);
    console.log('Huesos encontrados:', newBones.length);
    
    // Registrar pérdida en la sesión
    try {
      const perdidaResponse = await fetch('/api/chicken/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId || `session-${Date.now()}`,
          tipo: 'PERDIDA',
          apuesta: apuestaActual
        })
      });
      
      const perdidaData = await perdidaResponse.json();
      if (perdidaData.success) {
        setBalanceActual(perdidaData.balance.actual);
        // Actualizar rachas
        if (perdidaData.estadisticas) {
          setRachaVictorias(perdidaData.estadisticas.rachaVictorias || 0);
          setRachaDerrotas(perdidaData.estadisticas.rachaDerrotas || 0);
          setTotalVictorias(perdidaData.estadisticas.totalVictorias || 0);
          setTotalDerrotas(perdidaData.estadisticas.totalDerrotas || 0);
        }
        console.log('💸 Pérdida registrada. Nuevo balance:', perdidaData.balance.actual);
        console.log('📊 Rachas actualizadas:', perdidaData.estadisticas);
      }
    } catch (error) {
      console.error('❌ Error al registrar pérdida:', error);
    }

    // Mark as bone in cells
    const newCells = cells.map((r) => [...r]);
    const row = Math.floor((pos - 1) / 5);
    const col = (pos - 1) % 5;
    newCells[row][col] = 'bone';
    setCells(newCells);

    setRevealedBones(newBones);
    setSuggestedPosition(null);
    setShowConfirmDialog(false);

    // DERROTA: Encontraste un hueso
    // Mostrar diálogo para ingresar TODAS las posiciones de huesos reales
    setShowBoneRequestDialog(true);
    setGameEndedBy('bone');
    
    console.log('❌ Partida terminada en DERROTA. Esperando posiciones reales de huesos...');
  };

  // Handle withdraw/restart (mantiene rachas y estadísticas)
  const handleWithdraw = async () => {
    if (totalChickens < 1) {
      return;
    }

    console.log('💰 ===== RETIRO EXITOSO =====');
    console.log('📊 Estado actual:', { totalChickens, currentMultiplier, revealedChickens, revealedBones });

    // GUARDAR valores antes del reset para mostrar en el mensaje
    const chickensAtWithdraw = totalChickens;
    const multiplierAtWithdraw = currentMultiplier;

    // Calculate current multiplier before reset
    const currentMultiplierValue = currentMultiplier;
    
    // Registrar ganancia en la sesión
    try {
      const gananciaResponse = await fetch('/api/chicken/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId || `session-${Date.now()}`,
          tipo: 'GANANCIA',
          apuesta: apuestaActual,
          posicionesDescubiertas: totalChickens
        })
      });
      
      const gananciaData = await gananciaResponse.json();
      if (gananciaData.success) {
        setBalanceActual(gananciaData.balance.actual);
        // Actualizar rachas
        if (gananciaData.estadisticas) {
          setRachaVictorias(gananciaData.estadisticas.rachaVictorias || 0);
          setRachaDerrotas(gananciaData.estadisticas.rachaDerrotas || 0);
          setTotalVictorias(gananciaData.estadisticas.totalVictorias || 0);
          setTotalDerrotas(gananciaData.estadisticas.totalDerrotas || 0);
        }
        console.log('💰 Ganancia registrada. Nuevo balance:', gananciaData.balance.actual);
        console.log('📊 Rachas actualizadas:', gananciaData.estadisticas);
      }
    } catch (error) {
      console.error('❌ Error al registrar ganancia:', error);
    }

    // Save game with cashOutPosition = totalChickens (victory)
    console.log('📊 Guardando partida como victoria:', {
      revealedCount: totalChickens,
      cashOutPosition: totalChickens,
      hitBone: false,
      multiplier: currentMultiplierValue,
    });

    try {
      const response = await fetch('/api/chicken/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boneCount,
          revealedPositions: [...revealedChickens, ...revealedBones],
          bonePositions: [],
          cashOutPosition: totalChickens, // Guardar con el número de pollos descubiertos
          hitBone: false,
        }),
      });

      const result = await response.json();
      console.log('✅ Partida guardada correctamente:', {
        gameId: result.gameId,
        revealedCount: totalChickens,
        cashOutPosition: totalChickens,
        hitBone: false,
        isVictory: result.analysis?.isVictory,
      });

      if (result.success) {
        console.log(`✅ Victoria! Retiro exitoso con ${totalChickens} pollos (${currentMultiplierValue.toFixed(2)}x)`);
      }
    } catch (error) {
      console.error('❌ Error guardando partida:', error);
    }

    // Guardar valores para el mensaje
    (window as any).lastWithdrawStats = {
      chickens: chickensAtWithdraw,
      multiplier: multiplierAtWithdraw
    };

    // Show bone request dialog after withdrawal
    setShowBoneRequestDialog(true);
    setGameEndedBy('withdraw');
  };

  const handleBoneRequestSubmit = async () => {
    // Parse the input
    const boneArray = realBonePositionsInput
      .split(',')
      .map(s => parseInt(s.trim()))
      .filter(n => !isNaN(n) && n >= 1 && n <= 25);

    console.log('📝 ===== VALIDANDO POSICIONES DE HUESOS =====');
    console.log('Input del usuario:', realBonePositionsInput);
    console.log('Posiciones parseadas:', boneArray);
    console.log('Huesos ya revelados:', revealedBones);
    console.log('Tipo de partida:', gameEndedBy === 'withdraw' ? 'VICTORIA' : 'DERROTA');

    // Determine how many bones should be entered
    const expectedBoneCount = gameEndedBy === 'withdraw'
      ? boneCount // When withdrawing: need ALL bones
      : boneCount - revealedBones.length; // When hitting bone: only REMAINING bones

    console.log('Huesos esperados:', expectedBoneCount);
    console.log('Huesos ingresados:', boneArray.length);

    // Validación 1: Cantidad correcta
    if (boneArray.length !== expectedBoneCount) {
      alert(gameEndedBy === 'withdraw'
        ? `❌ Error: Debes ingresar exactamente ${boneCount} posiciones de huesos (1-25), separadas por comas.\n\nEjemplo: 1,5,10,15`
        : `❌ Error: Debes ingresar exactamente ${expectedBoneCount} posiciones RESTANTES de huesos (1-25), separadas por comas.\n\nYa has revelado ${revealedBones.length} hueso(s) en: ${revealedBones.join(', ')}\n\nEjemplo: ${Array.from({length: expectedBoneCount}, (_, i) => (i + 1) * 3).join(',')}`);
      return;
    }

    // Validación 2: No repetir huesos ya revelados (solo en caso de derrota)
    if (gameEndedBy === 'bone') {
      const huesosRepetidos = boneArray.filter(pos => revealedBones.includes(pos));
      if (huesosRepetidos.length > 0) {
        alert(`❌ Error: Las siguientes posiciones ya fueron confirmadas como huesos:\n${huesosRepetidos.join(', ')}\n\nNo las incluyas nuevamente. Solo ingresa los ${expectedBoneCount} huesos RESTANTES.`);
        return;
      }
    }

    // Validación 3: No repetir posiciones en el input
    const posicionesUnicas = new Set(boneArray);
    if (posicionesUnicas.size !== boneArray.length) {
      alert(`❌ Error: Has ingresado posiciones duplicadas.\n\nCada posición debe aparecer solo una vez.`);
      return;
    }

    // Validación 4: No incluir posiciones de pollos
    const pollosIncluidos = boneArray.filter(pos => revealedChickens.includes(pos));
    if (pollosIncluidos.length > 0) {
      alert(`❌ Error: Las siguientes posiciones fueron pollos, no huesos:\n${pollosIncluidos.join(', ')}\n\nSolo ingresa posiciones que fueron huesos en Mystake.`);
      return;
    }

    console.log('✅ Validación exitosa. Guardando posiciones...');

    // Mark all entered bones on the board
    const newCells = cells.map((r) => [...r]);
    
    boneArray.forEach((bonePos) => {
      const row = Math.floor((bonePos - 1) / 5);
      const col = (bonePos - 1) % 5;
      newCells[row][col] = 'bone';
    });

    setCells(newCells);

    const newBones = [...revealedBones, ...boneArray];
    setRevealedBones(newBones);

    console.log('💾 Huesos totales guardados:', newBones);
    console.log('📊 Total de huesos:', newBones.length, '/', boneCount);

    // ANÁLISIS DE SUGERENCIA NO USADA (solo en retiros)
    let analisisSugerencia: {
      posicionSugerida: number;
      eraPollo: boolean;
      eraHueso: boolean;
      decision: string;
      mensaje: string;
    } | null = null;
    
    if (gameEndedBy === 'withdraw' && suggestedPosition) {
      const sugerenciaEraHueso = newBones.includes(suggestedPosition);
      const sugerenciaEraPollo = !sugerenciaEraHueso;
      
      analisisSugerencia = {
        posicionSugerida: suggestedPosition,
        eraPollo: sugerenciaEraPollo,
        eraHueso: sugerenciaEraHueso,
        decision: sugerenciaEraPollo ? 'RETIRO_PREMATURO' : 'RETIRO_INTELIGENTE',
        mensaje: sugerenciaEraPollo 
          ? `⚠️ La posición ${suggestedPosition} era POLLO - Retiro prematuro (perdiste ganancia potencial)`
          : `✅ La posición ${suggestedPosition} era HUESO - Retiro inteligente (evitaste perder)`
      };
      
      console.log('🔍 ===== ANÁLISIS DE SUGERENCIA NO USADA =====');
      console.log('Posición sugerida:', suggestedPosition);
      console.log('Era pollo:', sugerenciaEraPollo);
      console.log('Era hueso:', sugerenciaEraHueso);
      console.log('Decisión:', analisisSugerencia.decision);
      console.log('Mensaje:', analisisSugerencia.mensaje);
    }

    // Submit complete game to database
    await submitCompleteGame(newBones, gameEndedBy === 'withdraw', analisisSugerencia);

    // Refresh all statistics and strategies
    console.log('🔄 Actualizando estadísticas y estrategias...');
    await Promise.all([
      fetchStatistics(),
      fetchPatternAnalysis(),
      fetchAdvancedAnalysis(),
      actualizarRachas(), // Actualizar rachas también
    ]);
    console.log('✅ Estadísticas y estrategias actualizadas');

    setShowBoneRequestDialog(false);
    setRealBonePositionsInput('');
    setGameEndedBy(null);

    // Show completion message
    if (gameEndedBy === 'withdraw') {
      const withdrawStats = (window as any).lastWithdrawStats || { chickens: 0, multiplier: 1 };
      
      let mensaje = `¡Victoria! Te retiraste con ${withdrawStats.chickens} pollos y ${withdrawStats.multiplier.toFixed(2)}x.\n\n`;
      
      // Agregar análisis de sugerencia si existe
      if (analisisSugerencia) {
        mensaje += `📊 Análisis de Decisión:\n`;
        mensaje += `${analisisSugerencia.mensaje}\n\n`;
        
        if (analisisSugerencia.eraPollo) {
          const gananciaExtra = apuestaActual * (MULTIPLIERS[(withdrawStats.chickens + 1) as keyof typeof MULTIPLIERS] - withdrawStats.multiplier);
          mensaje += `💰 Ganancia potencial perdida: ${gananciaExtra.toFixed(2)}\n`;
          mensaje += `💡 Consejo: Considera jugar una posición más antes de retirarte.\n`;
        } else {
          mensaje += `🎯 ¡Excelente decisión! Evitaste perder tu ganancia.\n`;
          mensaje += `💡 Consejo: Tu instinto de retiro fue correcto.\n`;
        }
      }
      
      mensaje += `\nLas posiciones de huesos han sido guardadas.`;
      alert(mensaje);
      
      // Limpiar stats guardadas
      delete (window as any).lastWithdrawStats;
    } else {
      alert(`Has encontrado ${newBones.length} huesos. Las posiciones han sido guardadas en la base de datos.`);
    }
    
    // Iniciar nueva partida (mantiene rachas, balance y estadísticas)
    console.log('🎮 Iniciando nueva partida automáticamente...');
    await iniciarNuevaPartida();
  };

  const handleNewGameFromBoneRequest = () => {
    // console.log('===== Starting new game =====');

    setShowBoneRequestDialog(false);
    startAdvising();
  };

  // Submit complete game to database as a single record
  const submitCompleteGame = async (bonePositions: number[], isWithdraw: boolean, analisisSugerencia: any = null) => {
    try {
      // IMPORTANTE: Guardar TODAS las posiciones de pollos descubiertos
      const chickenPositions = [...revealedChickens];
      
      console.log('💾 ===== GUARDANDO PARTIDA COMPLETA =====');
      console.log('Tipo:', isWithdraw ? 'VICTORIA (Retiro)' : 'DERROTA (Hueso)');
      console.log('Pollos descubiertos:', chickenPositions);
      console.log('Posiciones de huesos:', bonePositions);
      console.log('Total revelado:', chickenPositions.length + bonePositions.length);
      
      if (analisisSugerencia) {
        console.log('📊 Análisis de sugerencia:', analisisSugerencia);
      }
      
      const response = await fetch('/api/chicken/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boneCount,
          revealedPositions: [...chickenPositions, ...bonePositions], // TODAS las posiciones reveladas
          chickenPositions: chickenPositions, // Posiciones de POLLOS
          bonePositions: bonePositions, // Posiciones de HUESOS
          cashOutPosition: isWithdraw ? totalChickens : null,
          hitBone: !isWithdraw,
          analisisSugerencia: analisisSugerencia, // NUEVO: Análisis de sugerencia no usada
        }),
      });
      
      const result = await response.json();
      
      console.log('✅ Partida guardada correctamente:', {
        gameId: result.gameId,
        pollosDescubiertos: chickenPositions.length,
        huesosReales: bonePositions.length,
        totalRevelado: chickenPositions.length + bonePositions.length,
        esVictoria: isWithdraw,
        cashOutPosition: isWithdraw ? totalChickens : null,
      });
      console.log('=========================================');
      
    } catch (error) {
      console.error('❌ Error guardando partida completa:', error);
    }
  };

  const submitPositionResult = async (position: number, result: 'chicken' | 'bone') => {
    // NO GUARDAR NADA AQUÍ - Solo guardar al final cuando tengamos TODAS las posiciones de huesos
    console.log(`📝 Posición ${position} marcada como ${result} (no guardado aún)`);
  };

  const handleStartSimulation = async () => {
    if (isSimulating || simulationCount < 1) return;

    setIsSimulating(true);
    setSimulationProgress(0);

    try {
      // Call the simulation API
      const response = await fetch('/api/chicken/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          count: simulationCount,
          boneCount: simulatorBoneCount,
          targetPositions, // NUEVO: Incluir objetivo
          useRealisticPatterns: useTrainedPatterns,
        }),
      });

      // console.log('Simulation response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Simulation error response:', errorText);
        throw new Error(`Error en simulación: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      // console.log('Simulation completed:', result);
      // console.log('Simulation stats6Positions:', result.stats6Positions);

      // Update progress
      setSimulationProgress(result.gamesProcessed || simulationCount);
      setSimulatedGames(prev => prev + (result.gamesProcessed || simulationCount));

      // Set summary with new format (target-based)
      if (result.detailedStatsByPositions) {
        const detailedStats = result.detailedStatsByPositions
          .map((stat: any) => 
            `• ${stat.positions} posiciones: ${stat.reached} alcanzadas, ${stat.victories} victorias (${stat.winRate}%)`
          )
          .join('\n');
        
        setLastSimulationSummary(
          `✅ Simulación completada con objetivo de ${result.targetPositions} posiciones\n\n` +
          `📊 Resultados:\n` +
          `• Juegos procesados: ${result.gamesProcessed}\n` +
          `• Victorias: ${result.summary.victories} (${result.summary.winRate}%)\n` +
          `• Derrotas: ${result.summary.defeats}\n` +
          `• Promedio revelado: ${result.summary.avgRevealedCount}\n\n` +
          `📈 Estadísticas detalladas por posición:\n${detailedStats}\n\n` +
          `${result.analysis.recommendation}`
        );
      } else {
        // Fallback to old format
        const targetStats = result.targetPositionStats || {};
        setLastSimulationSummary(
          `Se simularon ${result.gamesProcessed} partidas con ${simulatorBoneCount} huesos.\n` +
          `Total de posiciones analizadas: ${result.totalPositions || 0}\n\n` +
          `Tasa de éxito por posición:\n` +
          `• 4 posiciones: ${targetStats[4]?.reached || 0} alcanzadas, ${targetStats[4]?.cashedOut || 0} cashouts (${targetStats[4]?.percentage || 0}%)\n` +
          `• 5 posiciones: ${targetStats[5]?.reached || 0} alcanzadas, ${targetStats[5]?.cashedOut || 0} cashouts (${targetStats[5]?.percentage || 0}%)\n` +
          `• 6 posiciones: ${targetStats[6]?.reached || 0} alcanzadas, ${targetStats[6]?.cashedOut || 0} cashouts (${targetStats[6]?.percentage || 0}%)\n` +
          `• 7 posiciones: ${targetStats[7]?.reached || 0} alcanzadas, ${targetStats[7]?.cashedOut || 0} cashouts (${targetStats[7]?.percentage || 0}%)\n` +
          `• 8 posiciones: ${targetStats[8]?.reached || 0} alcanzadas, ${targetStats[8]?.cashedOut || 0} cashouts (${targetStats[8]?.percentage || 0}%)`
        );
      }

      // Refresh statistics to include simulation data
      await fetchStatistics();
    } catch (error) {
      console.error('Error running simulation:', error);
      alert(`Error al ejecutar la simulación: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleTrainSimulator = async () => {
    if (isTrainingSimulator) return;

    setIsTrainingSimulator(true);
    setTrainingStatus('Analizando partidas reales...');

    try {
      const response = await fetch('/api/ml/train-simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Error en el entrenamiento');
      }

      const result = await response.json();

      if (result.success) {
        setSimulatorTrainingData(result);
        setTrainingStatus('Simulador entrenado exitosamente');
        
        const mensaje = `✅ Simulador entrenado exitosamente\n\n` +
          `📊 Partidas analizadas: ${result.training.partidasReales}\n` +
          `🎯 Posiciones seguras: ${result.training.posicionesSeguras}\n` +
          `⚠️  Posiciones peligrosas: ${result.training.posicionesPeligrosas}\n` +
          `🔄 Overlap promedio: ${result.training.averageOverlap} (${result.training.overlapPercentage})\n\n` +
          `Top 5 posiciones seguras:\n` +
          result.patterns.topSeguras.slice(0, 5).map((p: any) => 
            `  Pos ${p.posicion}: ${p.tasaPollo}% pollos`
          ).join('\n');
        
        alert(mensaje);
      } else {
        throw new Error(result.error || 'Error desconocido');
      }
    } catch (error) {
      console.error('Error training simulator:', error);
      setTrainingStatus('Error en el entrenamiento');
      alert(`Error al entrenar el simulador: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsTrainingSimulator(false);
      setTimeout(() => setTrainingStatus(''), 3000);
    }
  };

  const handleTrainAdvisor = async () => {
    if (isTrainingAdvisor) return;

    // Verificar que el simulador esté entrenado primero
    if (!simulatorTrainingData) {
      alert('⚠️  Primero debes entrenar el simulador.\n\nHaz clic en "Entrenar Simulador" antes de entrenar el asesor.');
      return;
    }

    setIsTrainingAdvisor(true);
    setTrainingStatus('Entrenando asesor con partidas simuladas...');

    try {
      const trainingGames = simulationCount || 100;
      
      const response = await fetch('/api/ml/train-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainingGames,
          targetPositions: targetPositions || 5,
          validateAfter: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Error en el entrenamiento');
      }

      const result = await response.json();

      if (result.success) {
        setAdvisorTrainingData(result);
        setTrainingStatus('Asesor entrenado exitosamente');
        
        const mensaje = `✅ Asesor ML entrenado exitosamente\n\n` +
          `🎮 Partidas de entrenamiento: ${result.training.games}\n` +
          `✅ Victorias: ${result.training.victorias} (${result.training.tasaExito}%)\n` +
          `❌ Derrotas: ${result.training.derrotas}\n` +
          `📍 Promedio posiciones: ${result.training.promedioPosiciones}\n` +
          `🎯 Objetivo: ${result.training.targetPositions} pollos\n\n` +
          (result.validation ? 
            `🔍 Validación (${result.validation.games} partidas):\n` +
            `   Tasa de éxito: ${result.validation.tasaExito}%\n\n` : '') +
          `📊 Uso de posiciones seguras: ${result.analysis.porcentajeSeguras}%\n\n` +
          `${result.recommendation}`;
        
        alert(mensaje);

        // Refresh statistics to include newly learned patterns
        await fetchStatistics();
      } else {
        throw new Error(result.error || 'Error desconocido');
      }
    } catch (error) {
      console.error('Error training advisor:', error);
      setTrainingStatus('Error en el entrenamiento');
      alert(`Error al entrenar el asesor: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsTrainingAdvisor(false);
      setTimeout(() => setTrainingStatus(''), 3000);
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await fetch(`/api/chicken/export?boneCount=${boneCount}`);
      if (!response.ok) {
        throw new Error('Error al exportar CSV');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const timestamp = new Date().toISOString().split('T')[0];
      a.download = `chicken_games_${timestamp}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // console.log('CSV exported successfully');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Error al exportar el archivo CSV. Por favor intenta de nuevo.');
    }
  };

  const getCellColor = (row: number, col: number) => {
    const position = row * 5 + col + 1;

    if (cells[row][col] === 'bone') return 'bg-red-600';
    if (cells[row][col] === 'chicken') return 'bg-green-600';
    if (cells[row][col] === 'suggested') return 'bg-blue-600';

    // Hot zone
    if (hotZones.some((h) => h.position === position && h.percentage > 30)) {
      return 'bg-red-200 dark:bg-red-900/70';
    }

    // Cold zone
    if (coldZones.some((c) => c.position === position && c.percentage < 5)) {
      return 'bg-blue-200 dark:bg-blue-900/70';
    }

    return 'bg-gray-200 dark:bg-gray-600';
  };

  const getCellIcon = (row: number, col: number) => {
    if (cells[row][col] === 'bone') return <Skull className="w-5 h-5 sm:w-6 sm:h-6 text-white" />;
    if (cells[row][col] === 'chicken') return <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-white" />;
    if (cells[row][col] === 'suggested') return <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-white" />;
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div className="text-center flex-1">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-2">
              🐔 Asesor de IA para Chicken Game
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Sistema inteligente que sugiere posiciones seguras en el juego Chicken de Mystake
            </p>
          </div>
          {mounted && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="flex-shrink-0 ml-4"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
          )}
        </div>

        <Tabs defaultValue="advisor" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="advisor">Asesor</TabsTrigger>
            <TabsTrigger value="stats">Estadísticas</TabsTrigger>
            <TabsTrigger value="strategy">Estrategia Avanzada</TabsTrigger>
            <TabsTrigger value="simulator">Simulador</TabsTrigger>
            <TabsTrigger value="info">Información</TabsTrigger>
          </TabsList>

          <TabsContent value="advisor">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Game Board */}
              <div className="lg:col-span-2">
                <Card className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                      <Select 
                        value={boneCount.toString()} 
                        onValueChange={(v) => setBoneCount(parseInt(v))}
                        disabled={gameActive}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2">2 Huesos</SelectItem>
                          <SelectItem value="3">3 Huesos</SelectItem>
                          <SelectItem value="4">4 Huesos</SelectItem>
                        </SelectContent>
                      </Select>

                      {!gameActive ? (
                        <Button
                          onClick={startAdvising}
                          className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Comenzar Asesoría
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            onClick={handleWithdraw}
                            disabled={totalChickens < 1}
                            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                          >
                            <Crown className="w-4 h-4 mr-2" />
                            RETIRAR ({currentMultiplier.toFixed(2)}x)
                          </Button>
                          <Button
                            onClick={salirCompletamente}
                            variant="destructive"
                            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Salir
                          </Button>
                        </div>
                      )}
                      
                      {!gameActive && sessionId && (
                        <Button
                          onClick={salirCompletamente}
                          variant="outline"
                          className="border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Salir Completamente
                        </Button>
                      )}
                    </div>

                    <div className="flex items-center gap-4 flex-wrap">
                      <Badge variant="default" className="text-lg px-4 py-2">
                        {currentMultiplier}x
                      </Badge>
                      <Badge variant="secondary" className="px-4 py-2">
                        {totalChickens} Pollos
                      </Badge>
                      <Badge variant="outline" className="px-4 py-2 bg-green-50 dark:bg-green-900/20 border-green-500">
                        <Wallet className="w-4 h-4 mr-1" />
                        {balanceActual.toFixed(2)}
                      </Badge>
                      <Badge variant="outline" className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-blue-500">
                        Apuesta: {apuestaActual.toFixed(2)}
                      </Badge>
                      {sessionId && (
                        <>
                          <Badge variant="outline" className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500">
                            <TrendingUpIcon className="w-4 h-4 mr-1" />
                            Racha V: {rachaVictorias}
                          </Badge>
                          <Badge variant="outline" className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-red-500">
                            <TrendingUp className="w-4 h-4 mr-1 rotate-180" />
                            Racha D: {rachaDerrotas}
                          </Badge>
                          <Badge variant="outline" className="px-4 py-2 bg-gray-50 dark:bg-gray-900/20 border-gray-500">
                            Total: {totalVictorias}V / {totalDerrotas}D
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Info Banner */}
                  {gameActive && suggestedPosition && false && (
                    <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border-2 border-blue-500">
                      <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-blue-900 dark:text-blue-100">
                          <p className="font-semibold mb-1">Instrucciones:</p>
                          <ol className="list-decimal list-inside space-y-1">
                            <li>Ve a <strong>Mystake</strong> y abre el juego Chicken</li>
                            <li>Haz clic en la posición <strong>{suggestedPosition}</strong> sugerida</li>
                            <li>Regresa aquí y confirma si fue <strong>pollo o hueso</strong></li>
                          </ol>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 5x5 Grid - Board with visible grid lines */}
                  <div className="relative inline-block max-w-md mx-auto mb-6">
                    {/* Suggestion Overlay */}
                    {suggestedPosition !== null && gameActive && (
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm rounded-lg flex items-center justify-center z-10 p-4">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-2xl border-2 border-blue-500 max-w-sm w-full animate-in zoom-in-95 duration-300">
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-2 mb-4">
                              <Zap className="w-10 h-10 text-blue-600 animate-pulse" />
                              <h3 className="text-3xl font-bold text-blue-700 dark:text-blue-400">
                                Posición {suggestedPosition}
                              </h3>
                            </div>

                            <div className="space-y-3 mb-4">
                              <div className="flex justify-between items-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Probabilidad:</span>
                                <Badge variant="default" className="font-mono text-lg px-3 py-1">
                                  {Math.round((positionProbabilities[suggestedPosition] || 0.5) * 100)}%
                                </Badge>
                              </div>

                              <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Huesos restantes:</span>
                                <Badge variant="secondary" className="font-mono px-3 py-1">
                                  {boneCount - revealedBones.length}
                                </Badge>
                              </div>
                            </div>

                            <Button
                              onClick={handleSuggestionClick}
                              disabled={isCalculating}
                              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 py-3 text-lg"
                            >
                              <CheckCircle2 className="w-5 h-5 mr-2" />
                              Confirmar Posición
                            </Button>

                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                              Haz clic en la posición {suggestedPosition} en Mystake, luego confirma aquí
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Board Grid */}
                    <div className="grid grid-cols-5 bg-gray-400 dark:bg-gray-600 p-1 rounded-lg gap-1">
                      {cells.map((row, rowIndex) =>
                        row.map((cell, colIndex) => {
                          const position = rowIndex * 5 + colIndex + 1;
                          const isSuggested = cell === 'suggested';
                          const probability = positionProbabilities[position] || 0.5;

                          return (
                            <button
                              key={`${rowIndex}-${colIndex}`}
                              disabled={!gameActive || isCalculating}
                              className={`
                                w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center
                                transition-all duration-200 transform
                                ${getCellColor(rowIndex, colIndex)}
                                ${isSuggested ? 'ring-4 ring-blue-400' : ''}
                                ${cell === 'hidden' && !isSuggested ? 'opacity-60' : ''}
                                ${isCalculating && isSuggested ? 'opacity-50' : ''}
                              `}
                            >
                              {getCellIcon(rowIndex, colIndex) || (
                                <div className="text-center">
                                  <div className="text-[10px] sm:text-xs text-gray-800 dark:text-gray-200 font-bold">
                                    {position}
                                  </div>
                                  <div className="text-[10px] sm:text-xs text-gray-700 dark:text-gray-300">
                                    {Math.round(probability * 100)}%
                                  </div>
                                </div>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Progress */}
                  {gameActive && (
                    <div>
                      <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <span>Progreso</span>
                        <span>{totalChickens} pollos descubiertos</span>
                      </div>
                      <Progress value={(totalChickens / 21) * 100} />
                    </div>
                  )}
                </Card>
              </div>

              {/* AI Suggestions Panel */}
              <div>
                <Card className="p-6 sticky top-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Target className="w-5 h-5 text-orange-500" />
                    <h2 className="text-xl font-bold">Sugerencia IA</h2>
                  </div>

                  {suggestedPosition !== null && gameActive ? (
                    <div className="space-y-4">
                      <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-500">
                        <div className="text-center mb-4">
                          <div className="flex items-center justify-center gap-2 mb-3">
                            <Zap className="w-8 h-8 text-blue-600 animate-pulse" />
                            <span className="text-3xl font-bold text-blue-700 dark:text-blue-400">
                              Posición {suggestedPosition}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Probabilidad:</span>
                            <Badge variant="default" className="font-mono">
                              {Math.round((positionProbabilities[suggestedPosition] || 0.5) * 100)}%
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Huesos restantes:</span>
                            <Badge variant="secondary" className="font-mono">
                              {boneCount - revealedBones.length}
                            </Badge>
                          </div>
                        </div>

                        <Button
                          onClick={handleSuggestionClick}
                          disabled={isCalculating}
                          className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 py-4"
                        >
                          <HelpCircle className="w-5 h-5 mr-2" />
                          {isCalculating ? 'Calculando...' : 'Confirmar Posición'}
                        </Button>
                      </div>

                      {/* Safe Withdrawal Info */}
                      {totalChickens >= 4 && (
                        <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-4 h-4 text-green-600" />
                            <span className="font-semibold">Retirada Recomendada</span>
                          </div>
                          {Array.from({ length: 3 }, (_, i) => {
                            const pos = i + 4;
                            const mult = MULTIPLIERS[pos as keyof typeof MULTIPLIERS];
                            return (
                              <div key={pos} className="flex justify-between text-sm mt-1">
                                <span>{pos} posiciones: {mult}x</span>
                                <Badge variant={pos <= 5 ? 'default' : 'secondary'}>
                                  {pos <= 5 ? 'Riesgo Bajo' : 'Riesgo Medio'}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Zone Indicators */}
                      {(hotZones.length > 0 || coldZones.length > 0) && !isCalculating && (
                        <div className="space-y-3">
                          {hotZones.length > 0 && (
                            <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <Flame className="w-4 h-4 text-red-500" />
                                <span className="font-semibold text-sm">Zonas Calientes</span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {hotZones.slice(0, 5).map((zone) => (
                                  <Badge key={zone.position} variant="destructive" className="text-xs">
                                    {zone.position}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {coldZones.length > 0 && (
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <Snowflake className="w-4 h-4 text-blue-500" />
                                <span className="font-semibold text-sm">Zonas Frías (Seguras)</span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {coldZones.slice(0, 5).map((zone) => (
                                  <Badge key={zone.position} variant="outline" className="text-xs">
                                    {zone.position}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Betting Strategy Panel - NEW */}
                      {bettingStrategy && (
                        <div className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg border-2 border-purple-300 dark:border-purple-700">
                          <div className="flex items-center gap-2 mb-3">
                            <Wallet className="w-5 h-5 text-purple-600" />
                            <h3 className="font-bold text-base text-purple-900 dark:text-purple-100">Estrategia de Apuestas</h3>
                          </div>

                          {/* Streak Info */}
                          <div className="grid grid-cols-2 gap-2 mb-3">
                            <div className={`p-2 rounded-lg text-center ${
                              bettingStrategy.streak.currentWins > 0
                                ? 'bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700'
                                : 'bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600'
                            }`}>
                              <div className="text-xs text-gray-600 dark:text-gray-400">Racha Victorias</div>
                              <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                                {bettingStrategy.streak.currentWins}
                              </div>
                            </div>
                            <div className={`p-2 rounded-lg text-center ${
                              bettingStrategy.streak.currentLosses > 0
                                ? 'bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700'
                                : 'bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600'
                            }`}>
                              <div className="text-xs text-gray-600 dark:text-gray-400">Racha Pérdidas</div>
                              <div className="text-2xl font-bold text-red-700 dark:text-red-400">
                                {bettingStrategy.streak.currentLosses}
                              </div>
                            </div>
                          </div>

                          {/* Last Games Stats */}
                          <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                            <div className="p-2 bg-white dark:bg-gray-800 rounded">
                              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Últimos 5 juegos</div>
                              <div className="font-bold">
                                <span className="text-green-600">{bettingStrategy.streak.last5Games.wins}V</span> / 
                                <span className="text-red-600">{bettingStrategy.streak.last5Games.losses}P</span>
                              </div>
                            </div>
                            <div className="p-2 bg-white dark:bg-gray-800 rounded">
                              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Últimos 10 juegos</div>
                              <div className="font-bold">
                                <span className="text-green-600">{bettingStrategy.streak.last10Games.wins}V</span> / 
                                <span className="text-red-600">{bettingStrategy.streak.last10Games.losses}P</span>
                              </div>
                            </div>
                          </div>

                          {/* Betting Recommendation */}
                          <div className={`p-3 rounded-lg border-2 ${
                            bettingStrategy.betting.riskLevel === 'EMERGENCY'
                              ? 'bg-red-100 dark:bg-red-900/30 border-red-500 dark:border-red-700'
                              : bettingStrategy.betting.riskLevel === 'HIGH'
                              ? 'bg-orange-100 dark:bg-orange-900/30 border-orange-400 dark:border-orange-700'
                              : bettingStrategy.betting.riskLevel === 'MEDIUM'
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-400 dark:border-yellow-700'
                              : 'bg-green-100 dark:bg-green-900/30 border-green-400 dark:border-green-700'
                          }`}>
                            <div className="flex items-center gap-2 mb-2">
                              {bettingStrategy.betting.riskLevel === 'EMERGENCY' ? (
                                <AlertTriangle className="w-5 h-5 text-red-600" />
                              ) : (
                                <TrendingUpIcon className={`w-5 h-5 ${
                                  bettingStrategy.betting.riskLevel === 'HIGH' ? 'text-orange-600' :
                                  bettingStrategy.betting.riskLevel === 'MEDIUM' ? 'text-yellow-600' :
                                  'text-green-600'
                                }`} />
                              )}
                              <span className={`font-bold ${
                                bettingStrategy.betting.riskLevel === 'EMERGENCY' ? 'text-red-700 dark:text-red-400' :
                                bettingStrategy.betting.riskLevel === 'HIGH' ? 'text-orange-700 dark:text-orange-400' :
                                bettingStrategy.betting.riskLevel === 'MEDIUM' ? 'text-yellow-700 dark:text-yellow-400' :
                                'text-green-700 dark:text-green-400'
                              }`}>
                                {bettingStrategy.betting.action}
                              </span>
                              <Badge variant={
                                bettingStrategy.betting.riskLevel === 'EMERGENCY' ? 'destructive' :
                                bettingStrategy.betting.riskLevel === 'HIGH' ? 'default' :
                                'secondary'
                              } className="text-xs">
                                {bettingStrategy.betting.riskLevel}
                              </Badge>
                            </div>
                            <p className="text-sm mb-2">
                              {bettingStrategy.betting.explanation}
                            </p>
                            <div className="flex justify-between items-center">
                              <span className="text-sm">Multiplicador:</span>
                              <span className="text-2xl font-bold">
                                {bettingStrategy.betting.multiplier}x
                              </span>
                            </div>
                          </div>

                          {/* Recommended Bet Range */}
                          {bettingStrategy.betting.riskLevel !== 'EMERGENCY' && (
                            <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-700">
                              <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                Rango de apuesta recomendado (del capital):
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="text-center p-2 bg-gray-100 dark:bg-gray-700 rounded">
                                  <div className="text-xs mb-1">Mínimo</div>
                                  <div className="font-bold text-blue-600">
                                    {(bettingStrategy.betting.minBet * 100).toFixed(0)}%
                                  </div>
                                </div>
                                <div className="text-center p-2 bg-gray-100 dark:bg-gray-700 rounded">
                                  <div className="text-xs mb-1">Máximo</div>
                                  <div className="font-bold text-purple-600">
                                    {(bettingStrategy.betting.maxBet * 100).toFixed(0)}%
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Position Strategy */}
                          {bettingStrategy.positions && (
                            <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-700">
                              <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                Estrategia de Posiciones:
                              </div>
                              <div className="text-sm space-y-1">
                                <div className="flex justify-between">
                                  <span>Posición objetivo:</span>
                                  <span className="font-bold text-green-600">
                                    {bettingStrategy.positions.targetPositions?.optimal || 'N/A'}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Retorno esperado:</span>
                                  <span className="font-bold">
                                    {bettingStrategy.positions.targetPositions?.expectedReturn?.toFixed(2) || 'N/A'}x
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : !gameActive ? (
                    <div className="p-6 bg-gray-100 dark:bg-gray-800 rounded-lg text-center">
                      <p className="text-gray-600 dark:text-gray-400">
                        Selecciona el número de huesos y comienza la asesoría
                      </p>
                    </div>
                  ) : (
                    <div className="p-6 bg-gray-100 dark:bg-gray-800 rounded-lg text-center">
                      <RefreshCw className="w-8 h-8 mx-auto mb-3 text-gray-400 animate-spin" />
                      <p className="text-gray-600 dark:text-gray-400">
                        Calculando siguiente sugerencia...
                      </p>
                    </div>
                  )}
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="stats">
            <div className="space-y-6">
              {/* Resumen General */}
              <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                <div className="flex items-center gap-3 mb-4">
                  <TrendingUpIcon className="w-6 h-6 text-blue-600" />
                  <h2 className="text-2xl font-bold">Estadísticas en Tiempo Real</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Balance Actual</div>
                    <div className="text-3xl font-bold text-green-600">{balanceActual.toFixed(2)}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {balanceActual >= balanceInicial ? '↑' : '↓'} {((balanceActual - balanceInicial) / balanceInicial * 100).toFixed(2)}%
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Apuesta Actual</div>
                    <div className="text-3xl font-bold text-blue-600">{apuestaActual.toFixed(2)}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {Math.floor(balanceActual / apuestaActual)} partidas posibles
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Multiplicador</div>
                    <div className="text-3xl font-bold text-purple-600">{currentMultiplier.toFixed(2)}x</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {totalChickens} pollos descubiertos
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Ganancia Potencial</div>
                    <div className="text-3xl font-bold text-orange-600">
                      {(apuestaActual * currentMultiplier - apuestaActual).toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Si retiras ahora
                    </div>
                  </div>
                </div>
              </Card>

              {/* Indicador de Asesor Activo */}
              <Card className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-purple-300 dark:border-purple-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Target className="w-6 h-6 text-purple-600" />
                    <div>
                      <h3 className="text-lg font-bold text-purple-900 dark:text-purple-100">
                        {tipoAsesor === 'rentable' ? '💰 Asesor Rentable Activo' : '🎯 Asesor Original Activo'}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {tipoAsesor === 'rentable' 
                          ? `Objetivo: ${objetivoRentable} posiciones | Éxito: 75-85% | Exploración: 25%`
                          : 'Objetivo: 5 posiciones | Éxito: 50-55% | Exploración: 35%'
                        }
                      </p>
                    </div>
                  </div>
                  <Badge 
                    variant={tipoAsesor === 'rentable' ? 'default' : 'secondary'}
                    className={tipoAsesor === 'rentable' ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'}
                  >
                    {tipoAsesor === 'rentable' ? 'RENTABLE' : 'ORIGINAL'}
                  </Badge>
                </div>
                
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Estrategia</div>
                    <div className="text-sm font-semibold">
                      {tipoAsesor === 'rentable' ? 'Solo posiciones ultra seguras' : 'Todas las posiciones disponibles'}
                    </div>
                  </div>
                  
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Rentabilidad</div>
                    <div className="text-sm font-semibold">
                      {tipoAsesor === 'rentable' 
                        ? `${objetivoRentable === 2 ? '+41%' : '+71%'} por partida`
                        : 'Moderada, mayor riesgo'
                      }
                    </div>
                  </div>
                  
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Posiciones Seguras</div>
                    <div className="text-sm font-semibold">
                      {tipoAsesor === 'rentable' ? '10 posiciones (93%+ pollos)' : '25 posiciones (todas)'}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Posiciones Más Seguras */}
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <h2 className="text-xl font-bold">🎯 Top 10 Posiciones MÁS SEGURAS</h2>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Estas posiciones tienen la menor probabilidad de ser huesos
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {Array.from({ length: 25 }, (_, i) => i + 1)
                    .map(pos => ({
                      position: pos,
                      winRate: positionProbabilities[pos] || 0.5
                    }))
                    .sort((a, b) => b.winRate - a.winRate)
                    .slice(0, 10)
                    .map((item, idx) => (
                      <div
                        key={item.position}
                        className="relative p-4 rounded-lg bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 border-2 border-green-500 shadow-lg"
                      >
                        <div className="absolute top-1 right-1">
                          <Badge variant="default" className="text-xs bg-green-600">
                            #{idx + 1}
                          </Badge>
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-green-700 dark:text-green-400 mb-1">
                            {item.position}
                          </div>
                          <div className="text-lg font-semibold text-green-600 dark:text-green-300">
                            {Math.round(item.winRate * 100)}%
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            Seguridad
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </Card>

              {/* Posiciones Más Peligrosas */}
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <h2 className="text-xl font-bold">⚠️ Top 10 Posiciones MÁS PELIGROSAS</h2>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  EVITA estas posiciones - tienen alta probabilidad de ser huesos
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {Array.from({ length: 25 }, (_, i) => i + 1)
                    .map(pos => ({
                      position: pos,
                      winRate: positionProbabilities[pos] || 0.5
                    }))
                    .sort((a, b) => a.winRate - b.winRate)
                    .slice(0, 10)
                    .map((item, idx) => (
                      <div
                        key={item.position}
                        className="relative p-4 rounded-lg bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30 border-2 border-red-500 shadow-lg"
                      >
                        <div className="absolute top-1 right-1">
                          <Badge variant="destructive" className="text-xs">
                            #{idx + 1}
                          </Badge>
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-red-700 dark:text-red-400 mb-1">
                            {item.position}
                          </div>
                          <div className="text-lg font-semibold text-red-600 dark:text-red-300">
                            {Math.round((1 - item.winRate) * 100)}%
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            Peligro
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </Card>

              {/* Mapa de Calor Visual */}
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-5 h-5 text-orange-500" />
                  <h2 className="text-xl font-bold">🗺️ Mapa de Calor del Tablero</h2>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Verde = Seguro | Amarillo = Neutral | Rojo = Peligroso
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: 25 }, (_, i) => i + 1).map((pos) => {
                    const winRate = positionProbabilities[pos] || 0.5;
                    const isHot = hotZones.some((h) => h.position === pos && h.percentage > 30);
                    const isCold = coldZones.some((c) => c.position === pos && c.percentage < 5);

                    let bgColor = 'bg-yellow-100 dark:bg-yellow-900/30';
                    let textColor = 'text-gray-900 dark:text-white';
                    let borderColor = 'border-yellow-500';
                    
                    if (winRate > 0.7) {
                      bgColor = 'bg-green-200 dark:bg-green-900/50';
                      textColor = 'text-green-900 dark:text-green-100';
                      borderColor = 'border-green-600';
                    } else if (winRate < 0.3) {
                      bgColor = 'bg-red-200 dark:bg-red-900/50';
                      textColor = 'text-red-900 dark:text-red-100';
                      borderColor = 'border-red-600';
                    }

                    return (
                      <div
                        key={pos}
                        className={`
                          p-3 rounded-lg text-center border-2 ${bgColor} ${borderColor}
                          transition-all hover:scale-105 cursor-pointer
                        `}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className={`text-xs font-bold ${textColor}`}>{pos}</span>
                          <div className="flex gap-1">
                            {isHot && <Flame className="w-3 h-3 text-red-600" />}
                            {isCold && <Snowflake className="w-3 h-3 text-blue-600" />}
                          </div>
                        </div>
                        <div className={`text-xl font-bold ${textColor}`}>
                          {Math.round(winRate * 100)}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Botón de Exportar */}
              <div className="flex justify-center">
                <Button
                  onClick={handleExportCSV}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-lg px-6 py-3"
                >
                  <Download className="w-5 h-5" />
                  Exportar Datos Completos a CSV
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="patterns">
            <div className="space-y-6">
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Target className="w-5 h-5 text-purple-500" />
                  <h2 className="text-xl font-bold">Análisis de Patrones del ML</h2>
                </div>

                <div className="space-y-6">
                  {/* Prediction Rules */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-blue-600" />
                      Reglas de Predicción del Sistema
                    </h3>
                    <div className="space-y-4">
                      {mlPatterns.predictionRules.length === 0 ? (
                        <p className="text-sm text-gray-600 dark:text-gray-400 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                          No hay suficientes datos para generar reglas de predicción. Juega más partidas o simula algunas partidas para entrenar el modelo.
                        </p>
                      ) : (
                        mlPatterns.predictionRules.map((rule, idx) => (
                          <div key={idx} className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-semibold text-base">{rule.ruleName}</h4>
                              {rule.confidence && (
                                <Badge variant="default" className="text-xs">
                                  {rule.confidence}% conf.
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                              {rule.description}
                            </p>

                            {rule.positions && (
                              <div className="flex flex-wrap gap-2 mb-2">
                                {rule.positions.map((pos: number, i: number) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    Pos {pos}
                                  </Badge>
                                ))}
                              </div>
                            )}

                            {rule.patterns && (
                              <div className="space-y-2 mt-3">
                                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">Patrones detectados:</p>
                                {rule.patterns.map((pattern: any, i: number) => (
                                  <div key={i} className="text-sm p-2 bg-white dark:bg-gray-800 rounded border">
                                    <div className="flex justify-between items-center">
                                      <span className="font-mono text-xs">{pattern.sequence}</span>
                                      <Badge variant="secondary" className="text-xs">
                                        {pattern.frequency}x
                                      </Badge>
                                    </div>
                                    <div className="flex gap-3 mt-1 text-xs">
                                      {pattern.nextChicken && (
                                        <span className="text-green-600 dark:text-green-400">
                                          Siguiente pollo: {pattern.nextChicken}
                                        </span>
                                      )}
                                      {pattern.nextBone && (
                                        <span className="text-red-600 dark:text-red-400">
                                          Siguiente hueso: {pattern.nextBone}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {rule.clusters && (
                              <div className="grid grid-cols-2 gap-2 mt-3">
                                {rule.clusters.map((cluster: any, i: number) => (
                                  <div key={i} className="text-sm p-2 bg-white dark:bg-gray-800 rounded border">
                                    <div className="flex justify-between items-center">
                                      <span className="font-semibold">{cluster.identifier}</span>
                                      <Badge variant={
                                        cluster.riskLevel === 'HIGH' ? 'destructive' :
                                        cluster.riskLevel === 'MEDIUM' ? 'default' : 'secondary'
                                      } className="text-xs">
                                        {cluster.riskLevel}
                                      </Badge>
                                    </div>
                                    <div className="text-xs mt-1">
                                      Huesos: {cluster.bonePercentage}%
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {rule.recommendation && (
                              <div className="mt-2">
                                <Badge variant={
                                  rule.recommendation === 'EVITAR' ? 'destructive' : 'default'
                                } className="text-sm">
                                  {rule.recommendation}
                                </Badge>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Frequent Sequences */}
                  {mlPatterns.frequentSequences.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        Secuencias Frecuentes
                      </h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        {mlPatterns.frequentSequences.map((seq, idx) => (
                          <div key={idx} className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-mono text-sm font-semibold">{seq.sequence}</span>
                              <Badge variant="secondary" className="text-xs">
                                {seq.occurrences} veces
                              </Badge>
                            </div>
                            {seq.recommendation && (
                              <p className="text-xs text-gray-700 dark:text-gray-300">
                                Siguiente recomendado: <span className="font-bold text-green-600">{seq.recommendation}</span>
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Server Behavior Analysis - NEW */}
                  <div>
                    {!patternAnalysis ? (
                      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                          Cargando análisis de patrones del servidor...
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          El sistema analiza las últimas 200 partidas reales para detectar posiciones donde Mystake coloca huesos frecuentemente.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 mb-6">
                          <Snowflake className="w-5 h-5 text-blue-600" />
                          <h2 className="text-xl font-bold">Análisis del Servidor Mystake</h2>
                        </div>
                        <div className="space-y-4">
                        {/* Server Predictability */}
                        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <Target className="w-4 h-4 text-purple-600" />
                            Predecibilidad del Servidor
                          </h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                                Nivel de Predecibilidad
                              </p>
                              <Badge variant={patternAnalysis.analysis.serverBehavior.predictabilityLevel === 'HIGH' ? 'destructive' : 'default'} className="text-sm">
                                {patternAnalysis.analysis.serverBehavior.predictabilityLevel}
                              </Badge>
                              <p className="text-2xl font-bold mt-2">
                                {patternAnalysis.analysis.serverBehavior.predictabilityScore}%
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                                Partidas Analizadas
                              </p>
                              <p className="text-2xl font-bold mt-2">
                                {patternAnalysis.analysis.gamesAnalyzed}
                              </p>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-3">
                            {patternAnalysis.analysis.serverBehavior.isPredictable 
                              ? 'El servidor muestra patrones predecibles. Las sugerencias se ajustan automáticamente.'
                              : 'El servidor no muestra patrones claros. Se usan estadísticas normales.'}
                          </p>
                        </div>

                        {/* Critical Insights */}
                        {patternAnalysis.analysis.insights && patternAnalysis.analysis.insights.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="font-semibold mb-3">Alertas Críticas</h4>
                            {patternAnalysis.analysis.insights.map((insight, idx) => (
                              <div key={idx} className={`p-3 rounded-lg border ${
                                insight.severity === 'critical' ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800' :
                                insight.severity === 'high' ? 'bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800' :
                                'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800'
                              }`}>
                                <div className="flex items-start gap-2">
                                  <span className="text-lg mr-2">
                                    {insight.severity === 'critical' ? '💀' :
                                     insight.severity === 'high' ? '⚠️' : 'ℹ️'}
                                  </span>
                                  <div className="flex-1">
                                    <p className="font-semibold text-sm mb-1">{insight.message}</p>
                                    {insight.data && (
                                      <p className="text-xs text-gray-500">
                                        {insight.type === 'HIGH_RISK_POSITION' && `Posición ${insight.data.position}: ${insight.data.frequency}/${patternAnalysis.analysis.gamesAnalyzed} partidas (${Math.round(insight.data.percentage)}%)`}
                                        {insight.type === 'REPEATING_PATTERN' && `Patrón ${insight.data.boneSet}: ${insight.data.count} veces`}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Risky Positions */}
                        {patternAnalysis.positionAnalysis?.riskyPositions && patternAnalysis.positionAnalysis.riskyPositions.length > 0 && (
                          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border border-red-200 dark:border-red-800">
                            <h4 className="font-semibold mb-3 text-red-700 dark:text-red-400">Posiciones de Alto Riesgo - ¡Evitar!</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                              Estas posiciones son huesos con alta frecuencia. El asesor las penaliza automáticamente.
                            </p>
                            <div className="grid grid-cols-5 gap-2">
                              {patternAnalysis.positionAnalysis.riskyPositions.map((pos, idx) => (
                                <div key={idx} className="text-center p-2 bg-red-100 dark:bg-red-900/30 rounded">
                                  <div className="text-lg font-bold text-red-700 dark:text-red-400">{pos.position}</div>
                                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                    Freq: {pos.frequency}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Win: {Math.round(pos.winRate * 100)}%
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Safe Positions */}
                        {patternAnalysis.positionAnalysis?.safePositions && patternAnalysis.positionAnalysis.safePositions.length > 0 && (
                          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                            <h4 className="font-semibold mb-3 text-green-700 dark:text-green-400">Posiciones Seguras - ¡Prioridad!</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                              Estas posiciones tienen alta probabilidad de ser pollo. El asesor las prioriza automáticamente.
                            </p>
                            <div className="grid grid-cols-5 gap-2">
                              {patternAnalysis.positionAnalysis.safePositions.map((pos, idx) => (
                                <div key={idx} className="text-center p-2 bg-green-100 dark:bg-green-900/30 rounded">
                                  <div className="text-lg font-bold text-green-700 dark:text-green-400">{pos.position}</div>
                                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                    Segura
                                  </div>
                                  <div className="text-xs font-mono text-gray-500">
                                    {Math.round(pos.winRate * 100)}%
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Repeating Patterns */}
                        {patternAnalysis.patternAnalysis?.repeatingBoneSets && patternAnalysis.patternAnalysis.repeatingBoneSets.length > 0 && (
                          <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                            <h4 className="font-semibold mb-3">Patrones de Huesos que se Repiten</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                              Detectados en las últimas 50 partidas. Si un patrón se repite, Mystake puede estar usando algoritmos predecibles.
                            </p>
                            <div className="space-y-2">
                              {patternAnalysis.patternAnalysis.repeatingBoneSets.map((pattern, idx) => (
                                <div key={idx} className="flex justify-between items-center p-2 bg-white dark:bg-gray-800 rounded border">
                                  <span className="font-mono text-sm">{pattern.boneSet}</span>
                                  <Badge variant="secondary">{pattern.count}x</Badge>
                                  <span className="text-xs text-gray-500 ml-2">
                                    {pattern.avgGap > 0 
                                      ? `cada ${Math.round(pattern.avgGap)} días`
                                      : 'reciente'
                                    }
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="strategy">
            <div className="space-y-6">
              {!advancedAnalysis || isFetchingAdvancedAnalysis ? (
                <Card className="p-6">
                  <div className="flex items-center justify-center gap-4">
                    <RefreshCw className={`w-6 h-6 text-blue-600 ${isFetchingAdvancedAnalysis ? 'animate-spin' : ''}`} />
                    <p className="text-lg">
                      {isFetchingAdvancedAnalysis ? 'Analizando patrones avanzados...' : 'Cargando análisis...'}
                    </p>
                  </div>
                </Card>
              ) : (
                <>
                  {/* Overall Summary */}
                  <Card className="p-6">
                    <div className="flex items-center gap-2 mb-6">
                      <Target className="w-6 h-6 text-blue-600" />
                      <h2 className="text-2xl font-bold">Estrategia de Juego Optimizada</h2>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <h3 className="font-semibold mb-3 text-blue-700 dark:text-blue-400">Probabilidades Generales</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm">Probabilidad de Victoria:</span>
                            <span className="font-bold text-lg">{advancedAnalysis.analysis.overallWinProbability}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Probabilidad de Posición Segura:</span>
                            <span className="font-bold text-lg">{advancedAnalysis.analysis.safePositionProbability}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Partidas Analizadas:</span>
                            <span className="font-bold">{advancedAnalysis.analysis.gamesAnalyzed}</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <h3 className="font-semibold mb-3 text-green-700 dark:text-green-400">Estrategia Óptima</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm">Posición Objetivo:</span>
                            <span className="font-bold text-lg text-green-600">Posición {advancedAnalysis.optimalStrategy.targetCashOutPosition}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Retorno Esperado:</span>
                            <span className="font-bold text-lg">{advancedAnalysis.optimalStrategy.expectedReturn}x</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Tipo de Estrategia:</span>
                            <Badge variant="default">{advancedAnalysis.optimalStrategy.strategyType}</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Meta Diaria:</span>
                            <span className="font-semibold text-green-600">{advancedAnalysis.optimalStrategy.dailyGoal}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <strong className="text-yellow-700 dark:text-yellow-400">Explicación:</strong> {advancedAnalysis.optimalStrategy.explanation}
                      </p>
                    </div>
                  </Card>

                  {/* Cash Out Analysis */}
                  <Card className="p-6">
                    <div className="flex items-center gap-2 mb-6">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                      <h2 className="text-xl font-bold">Análisis de Retiro por Posición</h2>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Posición</th>
                            <th className="text-left p-2">Factor de Crecimiento</th>
                            <th className="text-left p-2">Tasa de Éxito</th>
                            <th className="text-left p-2">Retorno Esperado</th>
                            <th className="text-left p-2">Juegos Ganados/Total</th>
                            <th className="text-left p-2">Recomendación</th>
                          </tr>
                        </thead>
                        <tbody>
                          {advancedAnalysis.cashOutAnalysis.map((cashOut, idx) => (
                            <tr key={idx} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                              <td className="p-2 font-bold">{cashOut.position}</td>
                              <td className="p-2">{cashOut.growthFactor.toFixed(2)}x</td>
                              <td className="p-2">{cashOut.successRate}%</td>
                              <td className={`p-2 font-bold ${cashOut.expectedReturn > 1 ? 'text-green-600' : cashOut.expectedReturn < 1 ? 'text-red-600' : 'text-yellow-600'}`}>
                                {cashOut.expectedReturn.toFixed(2)}x
                              </td>
                              <td className="p-2">{cashOut.gamesWon}/{cashOut.gamesReached}</td>
                              <td className="p-2">
                                <Badge variant={
                                  cashOut.recommendation === 'EXCELENTE' ? 'default' :
                                  cashOut.recommendation === 'BUENA' ? 'secondary' :
                                  cashOut.recommendation === 'EVITAR' ? 'destructive' : 'outline'
                                }>
                                  {cashOut.recommendation}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>

                  {/* Betting Strategy */}
                  <Card className="p-6">
                    <div className="flex items-center gap-2 mb-6">
                      <Zap className="w-5 h-5 text-yellow-600" />
                      <h2 className="text-xl font-bold">Estrategia de Apuestas Dinámica</h2>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Win Strategy */}
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <h3 className="font-semibold mb-3 text-green-700 dark:text-green-400">Tras Victorias Consecutivas</h3>
                        <div className="space-y-3">
                          {advancedAnalysis.bettingStrategy
                            .filter(b => b.consecutiveWins > 0)
                            .map((strategy, idx) => (
                              <div key={idx} className="p-3 bg-white dark:bg-gray-800 rounded border">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="font-bold">{strategy.consecutiveWins} victoria(s)</span>
                                  <Badge variant="secondary" className="text-sm">
                                    {strategy.riskLevel}
                                  </Badge>
                                </div>
                                <div className="text-lg font-bold text-green-600 mb-1">
                                  {strategy.recommendedMultiplier}x
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  {strategy.explanation}
                                </p>
                              </div>
                            ))}
                        </div>
                      </div>

                      {/* Loss Strategy */}
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <h3 className="font-semibold mb-3 text-red-700 dark:text-red-400">Tras Pérdidas Consecutivas</h3>
                        <div className="space-y-3">
                          {advancedAnalysis.bettingStrategy
                            .filter(b => b.consecutiveLosses > 0)
                            .map((strategy, idx) => (
                              <div key={idx} className="p-3 bg-white dark:bg-gray-800 rounded border">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="font-bold">{strategy.consecutiveLosses} pérdida(s)</span>
                                  <Badge variant={
                                    strategy.riskLevel === 'HIGH' ? 'destructive' :
                                    strategy.riskLevel === 'MEDIUM' ? 'default' : 'secondary'
                                  } className="text-sm">
                                    {strategy.riskLevel}
                                  </Badge>
                                </div>
                                <div className="text-lg font-bold text-red-600 mb-1">
                                  {strategy.recommendedMultiplier}x
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  {strategy.explanation}
                                </p>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Position Frequency Analysis */}
                  <Card className="p-6">
                    <div className="flex items-center gap-2 mb-6">
                      <Skull className="w-5 h-5 text-red-600" />
                      <h2 className="text-xl font-bold">Análisis de Frecuencia de Posiciones</h2>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Bone Positions */}
                      <div>
                        <h3 className="font-semibold mb-3 text-red-700 dark:text-red-400">Posiciones con Huesos (Últimas 40 partidas)</h3>
                        <div className="grid grid-cols-5 gap-2">
                          {advancedAnalysis.bonePositionFrequency.map((pos, idx) => (
                            <div key={idx} className="p-2 bg-red-100 dark:bg-red-900/30 rounded text-center">
                              <div className="text-lg font-bold text-red-700 dark:text-red-400">{pos.position}</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">{pos.count}x</div>
                              <div className="text-xs font-semibold">{pos.percentage}%</div>
                              <div className="text-xs text-gray-500">cada {pos.gamesBetweenOccurrence} partidas</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Chicken Positions */}
                      <div>
                        <h3 className="font-semibold mb-3 text-green-700 dark:text-green-400">Posiciones con Pollos (Últimas 40 partidas)</h3>
                        <div className="grid grid-cols-5 gap-2">
                          {advancedAnalysis.chickenPositionFrequency.slice(0, 10).map((pos, idx) => (
                            <div key={idx} className="p-2 bg-green-100 dark:bg-green-900/30 rounded text-center">
                              <div className="text-lg font-bold text-green-700 dark:text-green-400">{pos.position}</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">{pos.count}x</div>
                              <div className="text-xs font-semibold">{pos.percentage}%</div>
                              <div className="text-xs text-gray-500">cada {pos.gamesBetweenOccurrence} partidas</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Position Transitions */}
                  <Card className="p-6">
                    <div className="flex items-center gap-2 mb-6">
                      <RotateCcw className="w-5 h-5 text-purple-600" />
                      <h2 className="text-xl font-bold">Transiciones de Posiciones entre Partidas</h2>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Análisis de qué posiciones cambian de pollo a hueso o viceversa entre partidas consecutivas.
                    </p>

                    <div className="space-y-3">
                      {advancedAnalysis.positionTransitions.map((trans, idx) => (
                        <div key={idx} className="p-4 bg-white dark:bg-gray-800 rounded border">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded flex items-center justify-center">
                                <span className="font-bold text-purple-700 dark:text-purple-400">{trans.position}</span>
                              </div>
                              <div>
                                <div className="font-bold">Probabilidad de hueso: {trans.boneProbability}%</div>
                                <div className="text-xs text-gray-500">
                                  Total transiciones: {trans.total}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-4 text-sm">
                              <div className="text-center">
                                <div className="text-xs text-gray-500">Pollo→Hueso</div>
                                <div className="font-bold text-red-600">{trans.transitionProbability.safeToBone}%</div>
                              </div>
                              <div className="text-center">
                                <div className="text-xs text-gray-500">Hueso→Pollo</div>
                                <div className="font-bold text-green-600">{trans.transitionProbability.boneToSafe}%</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Risk Management */}
                  <Card className="p-6">
                    <div className="flex items-center gap-2 mb-6">
                      <AlertCircle className="w-5 h-5 text-orange-600" />
                      <h2 className="text-xl font-bold">Gestión de Riesgos</h2>
                    </div>

                    <div className="grid md:grid-cols-4 gap-4">
                      <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-center">
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Máx Pérdidas Consecutivas</div>
                        <div className="text-3xl font-bold text-red-600">
                          {advancedAnalysis.riskManagement.maxConsecutiveLosses}
                        </div>
                      </div>
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Máx Victorias Consecutivas</div>
                        <div className="text-3xl font-bold text-green-600">
                          {advancedAnalysis.riskManagement.maxConsecutiveWins}
                        </div>
                      </div>
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Apuesta Máxima</div>
                        <div className="text-3xl font-bold text-blue-600">
                          {advancedAnalysis.riskManagement.recommendedMaxBet * 100}%
                        </div>
                      </div>
                      <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Stop de Emergencia</div>
                        <div className="text-3xl font-bold text-purple-600">
                          {advancedAnalysis.riskManagement.emergencyStopThreshold}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <h4 className="font-semibold mb-2">Recomendaciones de Gestión de Capital</h4>
                      <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
                        <li>• Apuesta mínima: {(advancedAnalysis.riskManagement.recommendedMinBet * 100).toFixed(0)}% del capital</li>
                        <li>• Apuesta máxima: {(advancedAnalysis.riskManagement.recommendedMaxBet * 100).toFixed(0)}% del capital</li>
                        <li>• Detenerse después de {advancedAnalysis.riskManagement.emergencyStopThreshold} pérdidas consecutivas</li>
                        <li>• Aumentar apuesta gradualmente tras victorias, reducir tras pérdidas</li>
                      </ul>
                    </div>
                  </Card>

                  {/* Profitable Patterns */}
                  <Card className="p-6">
                    <div className="flex items-center gap-2 mb-6">
                      <Crown className="w-5 h-5 text-yellow-600" />
                      <h2 className="text-xl font-bold">Patrones más Rentables</h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      {advancedAnalysis.profitablePatterns.map((pattern, idx) => (
                        <div key={idx} className={`p-4 rounded-lg border ${
                          pattern.confidence === 'ALTA' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' :
                          pattern.confidence === 'MEDIA' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' :
                          'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                        }`}>
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-lg">{pattern.pattern}</h3>
                            <Badge variant={
                              pattern.confidence === 'ALTA' ? 'default' :
                              pattern.confidence === 'MEDIA' ? 'secondary' : 'outline'
                            }>
                              {pattern.confidence}
                            </Badge>
                          </div>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Frecuencia:</span>
                              <span className="font-semibold">{pattern.frequency} partidas</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Tasa de Éxito:</span>
                              <span className="font-semibold">{pattern.successRate}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Crecimiento Esperado:</span>
                              <span className="font-bold text-green-600">{pattern.expectedGrowth}x</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="simulator">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <RefreshCw className="w-5 h-5 text-orange-500" />
                <h2 className="text-xl font-bold">Simulador Mystake con Entrenamiento</h2>
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                {/* Simulator Controls */}
                <div className="space-y-6">
                  <div>
                    <Label className="text-base font-semibold">Número de Huesos</Label>
                    <Select
                      value={simulatorBoneCount.toString()}
                      onValueChange={(v) => setSimulatorBoneCount(parseInt(v))}
                    >
                      <SelectTrigger className="w-full mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2 Huesos</SelectItem>
                        <SelectItem value="3">3 Huesos</SelectItem>
                        <SelectItem value="4">4 Huesos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-base font-semibold">Número de Partidas a Simular</Label>
                    <Input
                      type="number"
                      min="1"
                      max="1000"
                      value={simulationCount}
                      onChange={(e) => setSimulationCount(parseInt(e.target.value) || 1)}
                      className="mt-2"
                      placeholder="Ej: 100"
                    />
                  </div>

                  <div>
                    <Label className="text-base font-semibold">Objetivo de Posiciones Consecutivas</Label>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 mb-2">
                      Victoria = Alcanzar este número de pollos sin encontrar hueso
                    </p>
                    <Select
                      value={targetPositions.toString()}
                      onValueChange={(v) => setTargetPositions(parseInt(v))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 Posiciones (95% win rate - Muy Fácil)</SelectItem>
                        <SelectItem value="4">4 Posiciones (75% win rate - Fácil)</SelectItem>
                        <SelectItem value="5">5 Posiciones (45% win rate - Medio)</SelectItem>
                        <SelectItem value="6">6 Posiciones (20% win rate - Difícil)</SelectItem>
                        <SelectItem value="7">7 Posiciones (8% win rate - Muy Difícil)</SelectItem>
                        <SelectItem value="8">8 Posiciones (&lt;5% win rate - Extremo)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                    <div>
                      <Label className="text-base font-semibold">Usar Patrones Entrenados</Label>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {useTrainedPatterns 
                          ? '✅ Usando patrones REALES de 300 partidas' 
                          : 'Simulación aleatoria (no recomendado)'}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={useTrainedPatterns}
                      onChange={(e) => setUseTrainedPatterns(e.target.checked)}
                      className="w-5 h-5 rounded"
                    />
                  </div>

                  {useTrainedPatterns && (
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="w-4 h-4 text-indigo-600" />
                        <span className="font-semibold text-sm">Patrones Realistas Activos</span>
                      </div>
                      <div className="space-y-1 text-xs text-gray-700 dark:text-gray-300">
                        <div>• Frecuencias REALES de huesos por posición</div>
                        <div>• Rotación realista: 4.68% overlap</div>
                        <div>• Posiciones seguras: 19, 13, 7, 18, 11, 10, 6, 25, 22, 1</div>
                        <div>• Comportamiento de retiro: 45% en 5 pollos</div>
                        <div>• Basado en 300 partidas reales de Mystake</div>
                      </div>
                    </div>
                  )}

                  <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <Info className="w-4 h-4 text-blue-600" />
                      <span className="font-semibold text-sm">Estado del Simulador</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Partidas simuladas:</span>
                        <span className="font-mono font-bold">{simulatedGames}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Estado:</span>
                        <Badge variant={isSimulating ? 'default' : 'secondary'}>
                          {isSimulating ? 'Simulando...' : 'Listo'}
                        </Badge>
                      </div>
                      {trainingStatus && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Entrenamiento:</span>
                          <Badge variant="outline">{trainingStatus}</Badge>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={handleTrainSimulator}
                      disabled={isTrainingSimulator || isTrainingAdvisor}
                      variant="outline"
                      className="w-full"
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${isTrainingSimulator ? 'animate-spin' : ''}`} />
                      {isTrainingSimulator ? 'Entrenando...' : 'Entrenar Simulador'}
                    </Button>

                    <Button
                      onClick={handleTrainAdvisor}
                      disabled={isTrainingAdvisor || isTrainingSimulator || simulatedGames === 0}
                      variant="outline"
                      className="w-full"
                    >
                      <Zap className={`w-4 h-4 mr-2 ${isTrainingAdvisor ? 'animate-pulse' : ''}`} />
                      {isTrainingAdvisor ? 'Entrenando...' : 'Entrenar Asesor'}
                    </Button>
                  </div>

                  <Button
                    onClick={handleStartSimulation}
                    disabled={isSimulating || simulationCount < 1}
                    className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 py-4"
                  >
                    <RefreshCw className={`w-5 h-5 mr-2 ${isSimulating ? 'animate-spin' : ''}`} />
                    {isSimulating ? `Simulando... (${simulationProgress}/${simulationCount})` : 'Iniciar Simulación'}
                  </Button>

                  {simulationProgress > 0 && (
                    <div>
                      <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <span>Progreso</span>
                        <span>{simulationProgress} de {simulationCount}</span>
                      </div>
                      <Progress value={(simulationProgress / simulationCount) * 100} />
                    </div>
                  )}
                </div>

                {/* Simulation Results */}
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      Resultados de la Simulación
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Partidas completadas:</span>
                        <span className="font-mono font-bold">{simulationProgress}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Huesos seleccionados:</span>
                        <span className="font-mono font-bold">{simulatorBoneCount}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-600" />
                      Ciclo de Entrenamiento
                    </h3>
                    <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                      <li>• <strong>Paso 1:</strong> Juega con el asesor para generar partidas reales</li>
                      <li>• <strong>Paso 2:</strong> "Entrenar Simulador" aprende patrones de partidas reales</li>
                      <li>• <strong>Paso 3:</strong> "Iniciar Simulación" genera partidas basadas en patrones</li>
                      <li>• <strong>Paso 4:</strong> "Entrenar Asesor" aprende de partidas simuladas</li>
                      <li>• <strong>Paso 5:</strong> El asesor ahora está mejorado con más datos</li>
                    </ul>
                  </div>

                  {simulatorTrainingData && (
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-indigo-600" />
                        Datos de Entrenamiento del Simulador
                      </h3>
                      <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                        <div>• Partidas analizadas: {simulatorTrainingData.training?.partidasReales || 0}</div>
                        <div>• Posiciones seguras: {simulatorTrainingData.training?.posicionesSeguras || 0}</div>
                        <div>• Posiciones peligrosas: {simulatorTrainingData.training?.posicionesPeligrosas || 0}</div>
                        <div>• Overlap: {simulatorTrainingData.training?.overlapPercentage || '0%'}</div>
                      </div>
                    </div>
                  )}

                  {advisorTrainingData && (
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Datos de Entrenamiento del Asesor
                      </h3>
                      <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                        <div>• Partidas entrenamiento: {advisorTrainingData.training?.games || 0}</div>
                        <div>• Victorias: {advisorTrainingData.training?.victorias || 0}</div>
                        <div>• Tasa de éxito: {advisorTrainingData.training?.tasaExito || 0}%</div>
                        <div>• Uso posiciones seguras: {advisorTrainingData.analysis?.porcentajeSeguras || 0}%</div>
                      </div>
                    </div>
                  )}

                  {lastSimulationSummary && (
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-purple-600" />
                        Última Simulación Completada
                      </h3>
                      <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                        {lastSimulationSummary}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="info">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <Info className="w-5 h-5 text-orange-500" />
                <h2 className="text-xl font-bold">Cómo Funciona</h2>
              </div>

              <div className="space-y-6">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-600" />
                    1. Comenzar Asesoría
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                    <li>• Selecciona el número de huesos (2, 3 o 4)</li>
                    <li>• Haz clic en "Comenzar Asesoría"</li>
                    <li>• La IA calculará probabilidades basadas en datos históricos</li>
                  </ul>
                </div>

                <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-green-600" />
                    2. Ver Sugerencia
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                    <li>• La IA sugiere UNA posición con alta probabilidad de ser pollo</li>
                    <li>• Ve a Mystake y haz clic en esa posición</li>
                    <li>• El sistema analiza: zonas calientes/frías, patrones, win rates</li>
                  </ul>
                </div>

                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-yellow-600" />
                    3. Confirmar Resultado
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                    <li>• Regresa al sistema y haz clic en "Confirmar Posición"</li>
                    <li>• Selecciona si fue <strong>POLLO</strong> o <strong>HUESO</strong></li>
                    <li>• El sistema guarda el resultado y recalcula probabilidades</li>
                  </ul>
                </div>

                <div className="p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-purple-600" />
                    4. Continuar o Terminar
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                    <li>• Si es <strong>POLLO</strong>: se marca en el tablero y se sugiere la siguiente posición</li>
                    <li>• Si es <strong>HUESO</strong>: se termina el asesoramiento</li>
                    <li>• Puedes retirarte en cualquier momento después de 4+ pollos</li>
                  </ul>
                </div>

                <div className="p-4 bg-red-50 dark:bg-red-900/30 rounded-lg">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    Importante
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                    <li>• El sistema aprende con cada confirmación</li>
                    <li>• Más datos = mejores predicciones</li>
                    <li>• Las probabilidades se actualizan en tiempo real</li>
                  </ul>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Balance y Apuesta Dialog */}
        <Dialog open={showBalanceDialog} onOpenChange={setShowBalanceDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wallet className="w-6 h-6 text-green-600" />
                Configurar Balance, Apuesta y Asesor
              </DialogTitle>
              <DialogDescription>
                Configura tu sesión de juego y elige el tipo de asesor
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="balance">Balance Inicial</Label>
                <Input
                  id="balance"
                  type="number"
                  min="1"
                  step="1"
                  defaultValue={balanceInicial}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value) && value >= 1) {
                      setBalanceInicial(value);
                    }
                  }}
                  placeholder="100"
                  className="text-lg font-bold"
                />
                <p className="text-xs text-gray-500">Tu capital disponible para jugar</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="apuesta">Apuesta por Partida</Label>
                <Input
                  id="apuesta"
                  type="number"
                  min="0.2"
                  step="0.2"
                  defaultValue={apuestaActual}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value) && value >= 0.2) {
                      setApuestaActual(value);
                    }
                  }}
                  placeholder="0.2"
                  className="text-lg font-bold"
                />
                <p className="text-xs text-gray-500">Mínimo: 0.2, incremento: 0.2</p>
              </div>

              {/* Selector de Tipo de Asesor */}
              <div className="space-y-2 pt-2 border-t">
                <Label htmlFor="tipoAsesor" className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-600" />
                  Tipo de Asesor ML
                </Label>
                <Select
                  value={tipoAsesor}
                  onValueChange={(value: 'original' | 'rentable') => setTipoAsesor(value)}
                >
                  <SelectTrigger id="tipoAsesor" className="w-full">
                    <SelectValue placeholder="Selecciona el asesor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="original">
                      <div className="flex flex-col items-start">
                        <span className="font-semibold">🎯 Asesor Original (5 posiciones)</span>
                        <span className="text-xs text-gray-500">Objetivo: 5 pos | Éxito: 50-55% | Exploración: 35%</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="rentable">
                      <div className="flex flex-col items-start">
                        <span className="font-semibold">💰 Asesor Rentable (2-3 posiciones)</span>
                        <span className="text-xs text-gray-500">Objetivo: 2-3 pos | Éxito: 75-85% | Exploración: 25%</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                
                {/* Información del asesor seleccionado */}
                {tipoAsesor === 'original' && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs space-y-1">
                    <p className="font-semibold text-blue-700 dark:text-blue-300">Características del Asesor Original:</p>
                    <ul className="space-y-0.5 text-gray-700 dark:text-gray-300">
                      <li>• Objetivo: Llegar a 5 posiciones seguras</li>
                      <li>• Tasa de éxito: 50-55% de las partidas</li>
                      <li>• Exploración: 35% (más variedad)</li>
                      <li>• Usa todas las posiciones disponibles</li>
                      <li>• Rentabilidad: Moderada, mayor riesgo</li>
                    </ul>
                  </div>
                )}
                
                {tipoAsesor === 'rentable' && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-xs space-y-2">
                    <p className="font-semibold text-green-700 dark:text-green-300">Características del Asesor Rentable:</p>
                    <ul className="space-y-0.5 text-gray-700 dark:text-gray-300">
                      <li>• Objetivo: 2-3 posiciones seguras (configurable)</li>
                      <li>• Tasa de éxito: 75-85% de las partidas</li>
                      <li>• Exploración: 25% (más conservador)</li>
                      <li>• Solo posiciones ultra seguras (93%+ pollos)</li>
                      <li>• Rentabilidad: 41-71% por partida ganada</li>
                    </ul>
                    
                    {/* Selector de objetivo para asesor rentable */}
                    <div className="pt-2 space-y-2">
                      <Label htmlFor="objetivoRentable" className="text-xs">Objetivo de Posiciones:</Label>
                      <Select
                        value={objetivoRentable.toString()}
                        onValueChange={(value) => setObjetivoRentable(parseInt(value) as 2 | 3)}
                      >
                        <SelectTrigger id="objetivoRentable" className="w-full h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2">
                            <div className="flex flex-col items-start">
                              <span className="font-semibold">2 Posiciones</span>
                              <span className="text-xs text-gray-500">Más seguro | Mult: 1.41x | +41% ganancia</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="3">
                            <div className="flex flex-col items-start">
                              <span className="font-semibold">3 Posiciones</span>
                              <span className="text-xs text-gray-500">Equilibrado | Mult: 1.71x | +71% ganancia</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400">Balance:</span>
                  <span className="font-bold">{balanceInicial.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400">Apuesta:</span>
                  <span className="font-bold">{apuestaActual.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Partidas posibles:</span>
                  <span className="font-bold">{Math.floor(balanceInicial / apuestaActual)}</span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => setShowBalanceDialog(false)}
                variant="outline"
              >
                Cancelar
              </Button>
              <Button
                onClick={iniciarPartidaConBalance}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                disabled={apuestaActual > balanceInicial}
              >
                <Play className="w-4 h-4 mr-2" />
                Comenzar Partida
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Confirm Dialog */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <HelpCircle className="w-6 h-6 text-blue-600" />
                Confirmar Resultado de Posición {suggestedPosition}
              </DialogTitle>
              <DialogDescription>
                En Mystake, haz clic en la posición {suggestedPosition} y confirma qué había debajo
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-center text-gray-600 dark:text-gray-400">
                ¿Qué había en la posición {suggestedPosition}?
              </p>
              <div className="flex gap-4">
                <Button
                  onClick={handleConfirmChicken}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 py-6"
                >
                  <CheckCircle2 className="w-6 h-6 mr-2" />
                  <div className="text-left">
                    <div className="font-bold">🐔 POLLO</div>
                    <div className="text-xs">Posición segura</div>
                  </div>
                </Button>
                <Button
                  onClick={handleConfirmBone}
                  className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 py-6"
                >
                  <XCircle className="w-6 h-6 mr-2" />
                  <div className="text-left">
                    <div className="font-bold">💀 HUESO</div>
                    <div className="text-xs">Perdiste</div>
                  </div>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Bone Positions Request Dialog */}
        <Dialog open={showBoneRequestDialog} onOpenChange={setShowBoneRequestDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {gameEndedBy === 'withdraw' ? (
                  <>
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                    ¡Victoria! - Confirma Huesos
                  </>
                ) : (
                  <>
                    <XCircle className="w-6 h-6 text-red-600" />
                    Hueso Encontrado - Confirma Posiciones
                  </>
                )}
              </DialogTitle>
              <DialogDescription>
                {gameEndedBy === 'withdraw'
                  ? `¡Felicidades! Te retiraste con ${totalChickens} pollos y ${currentMultiplier}x de multiplicador. Por favor, ingresa las posiciones reales de los ${boneCount} huesos de tu partida en Mystake para mejorar el sistema.`
                  : `Has encontrado un hueso en la posición ${revealedBones[revealedBones.length - 1]}. Este hueso ya está guardado. Por favor, ingresa SOLO las posiciones de los ${boneCount - revealedBones.length} huesos RESTANTES que no se han revelado aún en tu partida.`
                }
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {gameEndedBy === 'bone' && revealedBones.length > 0 && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg border border-yellow-300">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                        ⚠️ Importante: NO incluyas estos huesos
                      </p>
                      <p className="text-yellow-700 dark:text-yellow-300">
                        Ya confirmaste {revealedBones.length} hueso(s) en: <span className="font-bold">{revealedBones.join(', ')}</span>
                      </p>
                      <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                        Solo ingresa los <span className="font-bold">{boneCount - revealedBones.length} huesos restantes</span> que no descubriste.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="bonePositions">
                  {gameEndedBy === 'withdraw'
                    ? `Posiciones de TODOS los Huesos (${boneCount} huesos)`
                    : `Posiciones de Huesos RESTANTES (${boneCount - revealedBones.length} de ${boneCount})`
                  }
                </Label>
                <Input
                  id="bonePositions"
                  placeholder={
                    gameEndedBy === 'withdraw'
                      ? `Ejemplo: 5,12,18,23 (${boneCount} posiciones)`
                      : `Ejemplo: 12,18,23 (${boneCount - revealedBones.length} posiciones restantes)`
                  }
                  value={realBonePositionsInput}
                  onChange={(e) => setRealBonePositionsInput(e.target.value)}
                  className="font-mono text-lg"
                />
                <p className="text-xs text-gray-500">
                  {gameEndedBy === 'withdraw'
                    ? `Ingresa exactamente ${boneCount} posiciones (1-25), separadas por comas.`
                    : `Ingresa exactamente ${boneCount - revealedBones.length} posiciones restantes (1-25), separadas por comas. NO incluyas la posición ${revealedBones[revealedBones.length - 1]} que ya confirmaste.`
                  }
                </p>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Esta información se usará para entrenar el modelo de IA y mejorar las predicciones futuras.
                  </p>
                </div>
              </div>

              <div className={`p-3 rounded-lg text-center ${
                gameEndedBy === 'withdraw' 
                  ? 'bg-green-100 dark:bg-green-900/30' 
                  : 'bg-red-100 dark:bg-red-900/30'
              }`}>
                <div className="text-3xl font-bold mb-2">
                  {gameEndedBy === 'withdraw' ? '🎉' : '💀'}
                </div>
                <div className="text-xl font-bold mb-1">
                  {gameEndedBy === 'withdraw' ? '¡Victoria!' : 'Hueso Encontrado'}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {gameEndedBy === 'withdraw' 
                    ? `${totalChickens} pollos retirados - ${currentMultiplier}x`
                    : `Hueso en posición ${suggestedPosition}`
                  }
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowBoneRequestDialog(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleBoneRequestSubmit}
                disabled={!realBonePositionsInput.trim()}
                className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
              >
                <Download className="w-4 h-4 mr-2" />
                Guardar y Continuar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-gray-600 dark:text-gray-400 sticky bottom-0 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 p-4">
          <p>Asesor de IA para el juego Chicken de Mystake</p>
          <p className="mt-1">Las sugerencias son probabilísticas - Juega responsablemente</p>
        </footer>
      </div>
    </div>
  );
}
