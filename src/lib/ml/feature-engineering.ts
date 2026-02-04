// Advanced Feature Engineering for Chicken AI Advisor
import { db } from '@/lib/db';

export interface GameFeatures {
  // Basic features
  position: number;
  boneCount: number;
  revealedCount: number;
  
  // Historical features
  historicalWinRate: number;
  recentWinRate: number; // Last 10 games
  positionFrequency: number;
  
  // Spatial features
  adjacentBoneCount: number;
  distanceToNearestBone: number;
  clusterDensity: number;
  
  // Temporal features
  hourOfDay: number;
  dayOfWeek: number;
  gameSequenceNumber: number;
  timeSinceLastBone: number; // Minutes
  
  // Pattern features
  sequencePatternScore: number;
  markovChainProbability: number;
  patternMatchConfidence: number;
  
  // Advanced statistical features
  positionEntropy: number;
  correlationScore: number;
  volatilityIndex: number;
  
  // Meta features
  modelConfidence: number;
  dataQuality: number;
  sampleSize: number;
}

export interface AdvancedMLFeatures {
  features: GameFeatures;
  engineeredFeatures: {
    // Interaction features
    positionTimeInteraction: number;
    boneCountPositionInteraction: number;
    sequenceComplexity: number;
    
    // Polynomial features
    positionSquared: number;
    winRateSquared: number;
    
    // Binned features
    positionZone: 'corner' | 'edge' | 'center';
    timeOfDayBin: 'morning' | 'afternoon' | 'evening' | 'night';
    frequencyBin: 'rare' | 'common' | 'frequent';
    
    // Derived features
    riskScore: number;
    opportunityScore: number;
    stabilityScore: number;
  };
}

export class FeatureEngineer {
  private static instance: FeatureEngineer;
  
  static getInstance(): FeatureEngineer {
    if (!FeatureEngineer.instance) {
      FeatureEngineer.instance = new FeatureEngineer();
    }
    return FeatureEngineer.instance;
  }

  // Extract comprehensive features for a position
  async extractFeatures(
    position: number,
    boneCount: number,
    revealedPositions: number[],
    gameContext?: {
      timestamp?: Date;
      gameSequence?: number;
    }
  ): Promise<AdvancedMLFeatures> {
    
    const [
      historicalData,
      spatialData,
      temporalData,
      patternData
    ] = await Promise.all([
      this.extractHistoricalFeatures(position, boneCount),
      this.extractSpatialFeatures(position, revealedPositions),
      this.extractTemporalFeatures(position, gameContext?.timestamp),
      this.extractPatternFeatures(position, revealedPositions, boneCount)
    ]);

    const basicFeatures: GameFeatures = {
      position,
      boneCount,
      revealedCount: revealedPositions.length,
      ...historicalData,
      ...spatialData,
      ...temporalData,
      ...patternData,
    };

    const engineeredFeatures = this.engineerAdvancedFeatures(basicFeatures);

    return {
      features: basicFeatures,
      engineeredFeatures,
    };
  }

  // Extract historical performance features
  private async extractHistoricalFeatures(position: number, boneCount: number) {
    // Get position statistics
    const positionStats = await db.chickenPositionStats.findUnique({
      where: { position_isSimulated: { position, isSimulated: false } }
    });

    // Get recent games for this position
    const recentGames = await db.chickenGame.findMany({
      where: {
        boneCount,
        isSimulated: false,
        positions: {
          some: { position }
        }
      },
      include: {
        positions: {
          where: { position }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    const historicalWinRate = positionStats?.winRate || 0.5;
    const recentWinRate = recentGames.length > 0 
      ? recentGames.filter(g => g.positions[0]?.isChicken).length / recentGames.length
      : historicalWinRate;

    const positionFrequency = positionStats?.totalGames || 0;

    return {
      historicalWinRate,
      recentWinRate,
      positionFrequency,
      dataQuality: Math.min(1, positionFrequency / 50), // Quality based on sample size
      sampleSize: positionFrequency,
    };
  }

  // Extract spatial relationship features
  private async extractSpatialFeatures(position: number, revealedPositions: number[]) {
    const adjacentPositions = this.getAdjacentPositions(position);
    const adjacentBoneCount = revealedPositions.filter(pos => 
      adjacentPositions.includes(pos)
    ).length;

    // Calculate distance to nearest revealed bone
    let distanceToNearestBone = Infinity;
    for (const revealedPos of revealedPositions) {
      const distance = this.calculateDistance(position, revealedPos);
      distanceToNearestBone = Math.min(distanceToNearestBone, distance);
    }
    
    if (distanceToNearestBone === Infinity) {
      distanceToNearestBone = 5; // Max distance on 5x5 grid
    }

    // Calculate cluster density
    const clusterDensity = this.calculateClusterDensity(position, revealedPositions);

    return {
      adjacentBoneCount,
      distanceToNearestBone,
      clusterDensity,
    };
  }

  // Extract temporal features
  private async extractTemporalFeatures(position: number, timestamp?: Date) {
    const now = timestamp || new Date();
    const hourOfDay = now.getHours();
    const dayOfWeek = now.getDay();

    // Get time since last bone in this position
    const lastBoneGame = await db.chickenGame.findFirst({
      where: {
        isSimulated: false,
        positions: {
          some: {
            position,
            isChicken: false
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const timeSinceLastBone = lastBoneGame 
      ? (now.getTime() - lastBoneGame.createdAt.getTime()) / (1000 * 60) // Minutes
      : 10080; // 1 week in minutes

    return {
      hourOfDay,
      dayOfWeek,
      gameSequenceNumber: 0, // Would be provided by game context
      timeSinceLastBone,
    };
  }

  // Extract pattern-based features
  private async extractPatternFeatures(
    position: number, 
    revealedPositions: number[], 
    boneCount: number
  ) {
    // Sequence pattern analysis
    const sequencePatternScore = await this.calculateSequencePatternScore(
      revealedPositions, 
      position, 
      boneCount
    );

    // Markov chain probability
    const markovChainProbability = await this.calculateMarkovProbability(
      revealedPositions, 
      position, 
      boneCount
    );

    // Pattern match confidence
    const patternMatchConfidence = await this.calculatePatternMatchConfidence(
      revealedPositions, 
      position, 
      boneCount
    );

    // Position entropy (randomness measure)
    const positionEntropy = await this.calculatePositionEntropy(position, boneCount);

    // Correlation with other positions
    const correlationScore = await this.calculateCorrelationScore(position, boneCount);

    // Volatility index
    const volatilityIndex = await this.calculateVolatilityIndex(position, boneCount);

    return {
      sequencePatternScore,
      markovChainProbability,
      patternMatchConfidence,
      positionEntropy,
      correlationScore,
      volatilityIndex,
      modelConfidence: (sequencePatternScore + markovChainProbability + patternMatchConfidence) / 3,
    };
  }

  // Engineer advanced features from basic features
  private engineerAdvancedFeatures(features: GameFeatures) {
    // Interaction features
    const positionTimeInteraction = features.position * features.hourOfDay / 24;
    const boneCountPositionInteraction = features.boneCount * features.position / 25;
    const sequenceComplexity = features.revealedCount * features.patternMatchConfidence;

    // Polynomial features
    const positionSquared = Math.pow(features.position / 25, 2);
    const winRateSquared = Math.pow(features.historicalWinRate, 2);

    // Binned features
    const positionZone = this.getPositionZone(features.position);
    const timeOfDayBin = this.getTimeOfDayBin(features.hourOfDay);
    const frequencyBin = this.getFrequencyBin(features.positionFrequency);

    // Derived composite features
    const riskScore = this.calculateRiskScore(features);
    const opportunityScore = this.calculateOpportunityScore(features);
    const stabilityScore = this.calculateStabilityScore(features);

    return {
      positionTimeInteraction,
      boneCountPositionInteraction,
      sequenceComplexity,
      positionSquared,
      winRateSquared,
      positionZone,
      timeOfDayBin,
      frequencyBin,
      riskScore,
      opportunityScore,
      stabilityScore,
    };
  }

  // Helper methods
  private getAdjacentPositions(position: number): number[] {
    const row = Math.ceil(position / 5);
    const col = (position - 1) % 5 + 1;
    const adjacent: number[] = [];

    for (let r = row - 1; r <= row + 1; r++) {
      for (let c = col - 1; c <= col + 1; c++) {
        if (r >= 1 && r <= 5 && c >= 1 && c <= 5) {
          const pos = (r - 1) * 5 + c;
          if (pos !== position) adjacent.push(pos);
        }
      }
    }
    return adjacent;
  }

  private calculateDistance(pos1: number, pos2: number): number {
    const row1 = Math.ceil(pos1 / 5);
    const col1 = (pos1 - 1) % 5 + 1;
    const row2 = Math.ceil(pos2 / 5);
    const col2 = (pos2 - 1) % 5 + 1;
    
    return Math.sqrt(Math.pow(row2 - row1, 2) + Math.pow(col2 - col1, 2));
  }

  private calculateClusterDensity(position: number, revealedPositions: number[]): number {
    const radius = 2; // Consider positions within radius 2
    let count = 0;
    let total = 0;

    for (let pos = 1; pos <= 25; pos++) {
      const distance = this.calculateDistance(position, pos);
      if (distance <= radius) {
        total++;
        if (revealedPositions.includes(pos)) {
          count++;
        }
      }
    }

    return total > 0 ? count / total : 0;
  }

  private async calculateSequencePatternScore(
    revealedPositions: number[], 
    position: number, 
    boneCount: number
  ): Promise<number> {
    if (revealedPositions.length < 2) return 0.5;

    const pattern = revealedPositions.slice(-3).join(',');
    const matchingPatterns = await db.chickenPattern.findMany({
      where: {
        pattern: { contains: pattern },
        boneCount,
      },
      orderBy: { frequency: 'desc' },
      take: 5,
    });

    if (matchingPatterns.length === 0) return 0.5;

    const avgSuccessRate = matchingPatterns.reduce((sum, p) => sum + p.successRate, 0) / matchingPatterns.length;
    return avgSuccessRate;
  }

  private async calculateMarkovProbability(
    revealedPositions: number[], 
    position: number, 
    boneCount: number
  ): Promise<number> {
    if (revealedPositions.length === 0) return 0.5;

    const lastPosition = revealedPositions[revealedPositions.length - 1];
    
    // Get transition probability from last position to current position
    const transitionGames = await db.chickenGame.findMany({
      where: {
        boneCount,
        isSimulated: false,
        positions: {
          some: { position: lastPosition }
        }
      },
      include: {
        positions: {
          where: { position: { in: [lastPosition, position] } }
        }
      },
      take: 100,
    });

    if (transitionGames.length < 5) return 0.5;

    let favorableTransitions = 0;
    transitionGames.forEach(game => {
      const lastPos = game.positions.find(p => p.position === lastPosition);
      const currentPos = game.positions.find(p => p.position === position);
      
      if (lastPos && currentPos && !lastPos.isChicken && currentPos.isChicken) {
        favorableTransitions++;
      }
    });

    return favorableTransitions / transitionGames.length;
  }

  private async calculatePatternMatchConfidence(
    revealedPositions: number[], 
    position: number, 
    boneCount: number
  ): Promise<number> {
    const recentPatterns = await db.chickenPattern.findMany({
      where: { boneCount },
      orderBy: { lastSeen: 'desc' },
      take: 20,
    });

    if (recentPatterns.length === 0) return 0.5;

    let totalConfidence = 0;
    let matchCount = 0;

    recentPatterns.forEach(pattern => {
      const patternPositions = pattern.pattern.split(',').map(Number);
      const similarity = this.calculatePatternSimilarity(revealedPositions, patternPositions);
      
      if (similarity > 0.5) {
        totalConfidence += pattern.successRate * similarity;
        matchCount++;
      }
    });

    return matchCount > 0 ? totalConfidence / matchCount : 0.5;
  }

  private calculatePatternSimilarity(pattern1: number[], pattern2: number[]): number {
    const set1 = new Set(pattern1);
    const set2 = new Set(pattern2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private async calculatePositionEntropy(position: number, boneCount: number): Promise<number> {
    const recentGames = await db.chickenGame.findMany({
      where: {
        boneCount,
        isSimulated: false,
        positions: { some: { position } }
      },
      include: {
        positions: { where: { position } }
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    if (recentGames.length < 10) return 0.5;

    const chickenCount = recentGames.filter(g => g.positions[0]?.isChicken).length;
    const boneCount_pos = recentGames.length - chickenCount;

    const pChicken = chickenCount / recentGames.length;
    const pBone = boneCount_pos / recentGames.length;

    // Calculate entropy: -Σ(p * log2(p))
    let entropy = 0;
    if (pChicken > 0) entropy -= pChicken * Math.log2(pChicken);
    if (pBone > 0) entropy -= pBone * Math.log2(pBone);

    return entropy; // Max entropy is 1 for equal probability
  }

  private async calculateCorrelationScore(position: number, boneCount: number): Promise<number> {
    // Calculate correlation with adjacent positions
    const adjacent = this.getAdjacentPositions(position);
    const correlations: number[] = [];

    for (const adjPos of adjacent) {
      const correlation = await this.calculatePositionCorrelation(position, adjPos, boneCount);
      correlations.push(correlation);
    }

    return correlations.length > 0 
      ? correlations.reduce((sum, corr) => sum + corr, 0) / correlations.length 
      : 0;
  }

  private async calculatePositionCorrelation(pos1: number, pos2: number, boneCount: number): Promise<number> {
    const games = await db.chickenGame.findMany({
      where: {
        boneCount,
        isSimulated: false,
        positions: {
          some: {
            position: { in: [pos1, pos2] }
          }
        }
      },
      include: {
        positions: {
          where: { position: { in: [pos1, pos2] } }
        }
      },
      take: 100,
    });

    if (games.length < 20) return 0;

    let bothChicken = 0;
    let bothBone = 0;
    let pos1Chicken = 0;
    let pos2Chicken = 0;
    let validGames = 0;

    games.forEach(game => {
      const p1 = game.positions.find(p => p.position === pos1);
      const p2 = game.positions.find(p => p.position === pos2);
      
      if (p1 && p2) {
        validGames++;
        if (p1.isChicken && p2.isChicken) bothChicken++;
        if (!p1.isChicken && !p2.isChicken) bothBone++;
        if (p1.isChicken) pos1Chicken++;
        if (p2.isChicken) pos2Chicken++;
      }
    });

    if (validGames < 10) return 0;

    // Calculate Pearson correlation coefficient
    const p1ChickenRate = pos1Chicken / validGames;
    const p2ChickenRate = pos2Chicken / validGames;
    const bothChickenRate = bothChicken / validGames;

    const numerator = bothChickenRate - (p1ChickenRate * p2ChickenRate);
    const denominator = Math.sqrt(
      p1ChickenRate * (1 - p1ChickenRate) * p2ChickenRate * (1 - p2ChickenRate)
    );

    return denominator > 0 ? numerator / denominator : 0;
  }

  private async calculateVolatilityIndex(position: number, boneCount: number): Promise<number> {
    const recentGames = await db.chickenGame.findMany({
      where: {
        boneCount,
        isSimulated: false,
        positions: { some: { position } }
      },
      include: {
        positions: { where: { position } }
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    if (recentGames.length < 10) return 0.5;

    const results = recentGames.map(g => g.positions[0]?.isChicken ? 1 : 0);
    const mean = results.reduce((sum: number, val) => sum + val, 0) / results.length;
    
    const variance = results.reduce((sum: number, val) => sum + Math.pow(val - mean, 2), 0) / results.length;
    const volatility = Math.sqrt(variance);

    return volatility;
  }

  private getPositionZone(position: number): 'corner' | 'edge' | 'center' {
    const corners = [1, 5, 21, 25];
    const edges = [2, 3, 4, 6, 10, 11, 15, 16, 20, 22, 23, 24];
    
    if (corners.includes(position)) return 'corner';
    if (edges.includes(position)) return 'edge';
    return 'center';
  }

  private getTimeOfDayBin(hour: number): 'morning' | 'afternoon' | 'evening' | 'night' {
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  }

  private getFrequencyBin(frequency: number): 'rare' | 'common' | 'frequent' {
    if (frequency < 10) return 'rare';
    if (frequency < 50) return 'common';
    return 'frequent';
  }

  private calculateRiskScore(features: GameFeatures): number {
    const riskFactors = [
      1 - features.historicalWinRate, // Higher risk if low win rate
      features.adjacentBoneCount / 8, // Higher risk if many adjacent bones
      1 - features.distanceToNearestBone / 5, // Higher risk if close to bones
      features.clusterDensity, // Higher risk in dense clusters
      features.volatilityIndex, // Higher risk if volatile
    ];

    return riskFactors.reduce((sum, factor) => sum + factor, 0) / riskFactors.length;
  }

  private calculateOpportunityScore(features: GameFeatures): number {
    const opportunityFactors = [
      features.historicalWinRate, // Higher opportunity if high win rate
      features.recentWinRate, // Recent performance
      features.distanceToNearestBone / 5, // Better if far from bones
      1 - features.clusterDensity, // Better if not in cluster
      features.modelConfidence, // Higher if model is confident
    ];

    return opportunityFactors.reduce((sum, factor) => sum + factor, 0) / opportunityFactors.length;
  }

  private calculateStabilityScore(features: GameFeatures): number {
    const stabilityFactors = [
      features.dataQuality, // More stable with more data
      1 - features.volatilityIndex, // More stable if less volatile
      Math.min(1, features.sampleSize / 100), // More stable with larger sample
      features.patternMatchConfidence, // More stable if patterns match
    ];

    return stabilityFactors.reduce((sum, factor) => sum + factor, 0) / stabilityFactors.length;
  }
}

// Singleton instance
export const featureEngineer = FeatureEngineer.getInstance();