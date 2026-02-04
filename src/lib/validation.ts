// Validation utilities for Chicken AI Advisor
import { z } from 'zod';

// Position validation (1-25 for 5x5 grid)
export const positionSchema = z.number().int().min(1).max(25);

// Bone count validation (2, 3, or 4)
export const boneCountSchema = z.number().int().min(2).max(4);

// Revealed positions array validation
export const revealedPositionsSchema = z.array(positionSchema).max(25);

// Win rate validation (0.0 to 1.0)
export const winRateSchema = z.number().min(0).max(1);

// Multiplier validation (must be >= 1.0)
export const multiplierSchema = z.number().min(1.0);

// Cash out position validation (1-21)
export const cashOutPositionSchema = z.number().int().min(1).max(21);

// Prediction request schema
export const predictionRequestSchema = z.object({
  revealedPositions: revealedPositionsSchema.default([]),
  boneCount: boneCountSchema.default(4),
});

// Simulation request schema
export const simulationRequestSchema = z.object({
  count: z.number().int().min(1).max(1000).default(10),
  boneCount: boneCountSchema.default(3),
  useTrainedPatterns: z.boolean().default(true),
});

// Training request schema
export const trainingRequestSchema = z.object({
  boneCount: boneCountSchema.default(3),
  gameCount: z.number().int().min(1).max(10000).default(100),
  minRevealedCount: z.number().int().min(1).max(25).default(2),
});

// Game creation schema
export const gameCreationSchema = z.object({
  boneCount: boneCountSchema,
  positions: z.array(z.object({
    position: positionSchema,
    isChicken: z.boolean(),
  })).length(25),
});

// Validation helper functions
export function validatePositions(positions: unknown[]): number[] {
  const result = revealedPositionsSchema.safeParse(positions);
  if (!result.success) {
    throw new Error(`Invalid positions: ${result.error.message}`);
  }
  return result.data;
}

export function validateBoneCount(boneCount: unknown): number {
  const result = boneCountSchema.safeParse(boneCount);
  if (!result.success) {
    throw new Error(`Invalid bone count: ${result.error.message}`);
  }
  return result.data;
}

export function validateWinRate(winRate: unknown): number {
  const result = winRateSchema.safeParse(winRate);
  if (!result.success) {
    throw new Error(`Invalid win rate: ${result.error.message}`);
  }
  return result.data;
}

// Safe property access helpers
export function safeNumber(value: unknown, defaultValue: number = 0): number {
  if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
    return value;
  }
  return defaultValue;
}

export function safeArray<T>(value: unknown, defaultValue: T[] = []): T[] {
  if (Array.isArray(value)) {
    return value;
  }
  return defaultValue;
}

export function safeObject<T extends Record<string, any>>(
  value: unknown, 
  defaultValue: T
): T {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as T;
  }
  return defaultValue;
}

// Score normalization and clamping
export function normalizeScore(score: number, min: number = 0, max: number = 100): number {
  return Math.max(min, Math.min(max, score));
}

// Probability validation and clamping
export function normalizeProbability(prob: number): number {
  return Math.max(0, Math.min(1, prob));
}