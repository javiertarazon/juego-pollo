import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MULTIPLICADORES_4_HUESOS } from '@/lib/multipliers';
import type { GameOutcome } from './metrics';

export interface SimulatorConfig {
  boneFrequencyWeights: Record<string, number>;
  overlapPercentage?: number;
  safePositions?: number[];
  mostRevealedPositions?: number[];
}

export type StrategyType = 'rentable_2' | 'rentable_3' | 'baseline_5';

export interface SimulationParams {
  games: number;
  stake: number;
  seed: number;
  strategy: StrategyType;
  configPath?: string;
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export function loadSimulatorConfigFromFile(configPath?: string): SimulatorConfig {
  const resolved = configPath ?? join(process.cwd(), 'ml-simulator-config.json');
  return JSON.parse(readFileSync(resolved, 'utf-8')) as SimulatorConfig;
}

function weightedChoice(rng: () => number, candidates: Array<{ pos: number; weight: number }>): number {
  const total = candidates.reduce((sum, c) => sum + c.weight, 0);
  let r = rng() * total;
  for (const c of candidates) {
    r -= c.weight;
    if (r <= 0) return c.pos;
  }
  return candidates[candidates.length - 1].pos;
}

export function generateBonesWeighted(params: {
  rng: () => number;
  boneCount: number;
  weights: Record<string, number>;
  previousBones?: number[];
  overlapPercentage?: number;
}): number[] {
  const { rng, boneCount, weights, previousBones = [], overlapPercentage = 4.68 } = params;
  const overlapFactor = Math.max(0, Math.min(1, overlapPercentage / 100));

  const bones: number[] = [];
  const allPositions = Array.from({ length: 25 }, (_, i) => i + 1);

  while (bones.length < boneCount) {
    const available = allPositions
      .filter((p) => !bones.includes(p))
      .map((pos) => {
        const base = weights[String(pos)] ?? 0.04;
        const rotated = previousBones.includes(pos) ? base * overlapFactor : base;
        return { pos, weight: Math.max(0.0000001, rotated) };
      });

    bones.push(weightedChoice(rng, available));
  }

  bones.sort((a, b) => a - b);
  return bones;
}

function strategyToMoveOrder(strategy: StrategyType, config: SimulatorConfig): { order: number[]; target: number } {
  if (strategy === 'rentable_2') {
    return { order: config.safePositions ?? [19, 13, 7, 18, 11, 10, 6, 25, 22, 1], target: 2 };
  }
  if (strategy === 'rentable_3') {
    return { order: config.safePositions ?? [19, 13, 7, 18, 11, 10, 6, 25, 22, 1], target: 3 };
  }

  // Baseline: objetivo 5 y orden basado en lo más revelado por humanos (tiende a ser más riesgoso)
  return {
    order: config.mostRevealedPositions ?? [2, 4, 7, 9, 6, 17, 14, 1, 3, 20, 18, 21, 5, 23, 10],
    target: 5,
  };
}

export function simulateOneGame(params: {
  bonePositions: number[];
  stake: number;
  strategy: StrategyType;
  config: SimulatorConfig;
}): GameOutcome {
  const { bonePositions, stake, strategy, config } = params;
  const { order, target } = strategyToMoveOrder(strategy, config);

  let revealed = 0;
  for (const pos of order) {
    revealed++;
    if (bonePositions.includes(pos)) {
      return {
        stake,
        cashOutPosition: 0,
        hitBone: true,
        multiplier: 0,
      };
    }
    if (revealed >= target) {
      const multiplier = MULTIPLICADORES_4_HUESOS[revealed] ?? 0;
      return {
        stake,
        cashOutPosition: revealed,
        hitBone: false,
        multiplier,
      };
    }
  }

  // Si se agota el orden, retirar en lo alcanzado
  const multiplier = revealed > 0 ? (MULTIPLICADORES_4_HUESOS[revealed] ?? 0) : 0;
  return {
    stake,
    cashOutPosition: revealed,
    hitBone: false,
    multiplier,
  };
}

export function runSimulation(params: SimulationParams): GameOutcome[] {
  const config = loadSimulatorConfigFromFile(params.configPath);
  const rng = mulberry32(params.seed);

  const outcomes: GameOutcome[] = [];
  let previousBones: number[] = [];

  for (let i = 0; i < params.games; i++) {
    const bones = generateBonesWeighted({
      rng,
      boneCount: 4,
      weights: config.boneFrequencyWeights,
      previousBones,
      overlapPercentage: config.overlapPercentage,
    });

    previousBones = bones;
    outcomes.push(
      simulateOneGame({
        bonePositions: bones,
        stake: params.stake,
        strategy: params.strategy,
        config,
      })
    );
  }

  return outcomes;
}

