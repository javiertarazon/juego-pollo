// Cross-Validation System for ML Model Evaluation
import { db } from '@/lib/db';
import { featureEngineer, AdvancedMLFeatures } from './feature-engineering';
import { monitoring } from '@/lib/monitoring';

export interface ValidationResult {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  auc: number;
  confusionMatrix: {
    truePositives: number;
    falsePositives: number;
    trueNegatives: number;
    falseNegatives: number;
  };
  crossValidationScores: number[];
  meanCVScore: number;
  stdCVScore: number;
}

export interface ModelPerformance {
  overall: ValidationResult;
  byBoneCount: Record<number, ValidationResult>;
  byPosition: Record<number, ValidationResult>;
  byTimeOfDay: Record<string, ValidationResult>;
  featureImportance: Record<string, number>;
}

export interface TrainingData {
  features: AdvancedMLFeatures;
  target: boolean; // true = chicken, false = bone
  weight: number; // Sample weight for importance
  metadata: {
    gameId: string;
    position: number;
    boneCount: number;
    timestamp: Date;
  };
}

export class CrossValidator {
  private static instance: CrossValidator;
  
  static getInstance(): CrossValidator {
    if (!CrossValidator.instance) {
      CrossValidator.instance = new CrossValidator();
    }
    return CrossValidator.instance;
  }

  // Perform k-fold cross-validation
  async performCrossValidation(
    boneCount: number,
    kFolds: number = 5,
    minSamplesPerFold: number = 50
  ): Promise<ModelPerformance> {
    console.log(`Starting ${kFolds}-fold cross-validation for boneCount=${boneCount}`);
    
    // Prepare training data
    const trainingData = await this.prepareTrainingData(boneCount);
    
    if (trainingData.length < minSamplesPerFold * kFolds) {
      throw new Error(`Insufficient data: need at least ${minSamplesPerFold * kFolds} samples, got ${trainingData.length}`);
    }

    // Shuffle data
    const shuffledData = this.shuffleArray([...trainingData]);
    
    // Create folds
    const folds = this.createFolds(shuffledData, kFolds);
    
    // Perform cross-validation
    const cvResults: ValidationResult[] = [];
    
    for (let i = 0; i < kFolds; i++) {
      console.log(`Processing fold ${i + 1}/${kFolds}`);
      
      const testFold = folds[i];
      const trainFolds = folds.filter((_, index) => index !== i).flat();
      
      // Train model on training folds
      const model = await this.trainModel(trainFolds);
      
      // Evaluate on test fold
      const foldResult = await this.evaluateModel(model, testFold);
      cvResults.push(foldResult);
    }

    // Calculate overall performance
    const overall = this.aggregateResults(cvResults);
    
    // Calculate performance by different dimensions
    const byBoneCount = await this.evaluateByBoneCount(trainingData);
    const byPosition = await this.evaluateByPosition(trainingData);
    const byTimeOfDay = await this.evaluateByTimeOfDay(trainingData);
    
    // Calculate feature importance
    const featureImportance = await this.calculateFeatureImportance(trainingData);
    
    const performance: ModelPerformance = {
      overall,
      byBoneCount,
      byPosition,
      byTimeOfDay,
      featureImportance,
    };

    // Log results
    await monitoring.logMetric('cross_validation_accuracy', overall.accuracy, boneCount, {
      kFolds,
      sampleSize: trainingData.length,
      meanCVScore: overall.meanCVScore,
      stdCVScore: overall.stdCVScore,
    });

    return performance;
  }

  // Prepare training data from historical games
  private async prepareTrainingData(boneCount: number): Promise<TrainingData[]> {
    const games = await db.chickenGame.findMany({
      where: {
        boneCount,
        isSimulated: false,
        revealedCount: { gte: 3 }, // Only games with sufficient reveals
      },
      include: {
        positions: {
          orderBy: { revealOrder: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 1000, // Limit for performance
    });

    const trainingData: TrainingData[] = [];

    for (const game of games) {
      const revealedPositions = game.positions
        .filter(p => p.revealed && p.revealOrder > 0)
        .sort((a, b) => (a.revealOrder || 0) - (b.revealOrder || 0))
        .map(p => p.position);

      // Create training samples for each revealed position
      for (let i = 2; i < revealedPositions.length; i++) {
        const position = revealedPositions[i];
        const contextPositions = revealedPositions.slice(0, i);
        
        const positionData = game.positions.find(p => p.position === position);
        if (!positionData) continue;

        try {
          const features = await featureEngineer.extractFeatures(
            position,
            boneCount,
            contextPositions,
            { timestamp: game.createdAt }
          );

          // Calculate sample weight (more recent games have higher weight)
          const daysSinceGame = (Date.now() - game.createdAt.getTime()) / (1000 * 60 * 60 * 24);
          const weight = Math.exp(-daysSinceGame / 30); // Exponential decay over 30 days

          trainingData.push({
            features,
            target: positionData.isChicken,
            weight,
            metadata: {
              gameId: game.id,
              position,
              boneCount,
              timestamp: game.createdAt,
            },
          });
        } catch (error) {
          console.warn(`Failed to extract features for position ${position}:`, error);
        }
      }
    }

    console.log(`Prepared ${trainingData.length} training samples`);
    return trainingData;
  }

  // Create k-fold splits
  private createFolds<T>(data: T[], k: number): T[][] {
    const foldSize = Math.floor(data.length / k);
    const folds: T[][] = [];

    for (let i = 0; i < k; i++) {
      const start = i * foldSize;
      const end = i === k - 1 ? data.length : start + foldSize;
      folds.push(data.slice(start, end));
    }

    return folds;
  }

  // Train a simple logistic regression model
  private async trainModel(trainingData: TrainingData[]): Promise<MLModel> {
    // Extract feature vectors
    const X = trainingData.map(sample => this.extractFeatureVector(sample.features));
    const y = trainingData.map(sample => sample.target ? 1 : 0);
    const weights = trainingData.map(sample => sample.weight);

    // Simple logistic regression implementation
    const model = new LogisticRegressionModel();
    await model.fit(X, y, weights);
    
    return model;
  }

  // Evaluate model performance
  private async evaluateModel(model: MLModel, testData: TrainingData[]): Promise<ValidationResult> {
    const predictions: number[] = [];
    const actuals: number[] = [];

    for (const sample of testData) {
      const features = this.extractFeatureVector(sample.features);
      const prediction = await model.predict(features);
      const actual = sample.target ? 1 : 0;

      predictions.push(prediction);
      actuals.push(actual);
    }

    return this.calculateMetrics(predictions, actuals);
  }

  // Extract numerical feature vector from AdvancedMLFeatures
  private extractFeatureVector(features: AdvancedMLFeatures): number[] {
    const basic = features.features;
    const engineered = features.engineeredFeatures;

    return [
      // Basic features
      basic.position / 25, // Normalize to 0-1
      basic.boneCount / 4,
      basic.revealedCount / 25,
      basic.historicalWinRate,
      basic.recentWinRate,
      basic.positionFrequency / 100,
      
      // Spatial features
      basic.adjacentBoneCount / 8,
      basic.distanceToNearestBone / 5,
      basic.clusterDensity,
      
      // Temporal features
      basic.hourOfDay / 24,
      basic.dayOfWeek / 7,
      Math.min(1, basic.timeSinceLastBone / 10080), // Normalize to week
      
      // Pattern features
      basic.sequencePatternScore,
      basic.markovChainProbability,
      basic.patternMatchConfidence,
      basic.positionEntropy,
      basic.correlationScore,
      basic.volatilityIndex,
      basic.modelConfidence,
      basic.dataQuality,
      
      // Engineered features
      engineered.positionTimeInteraction,
      engineered.boneCountPositionInteraction,
      engineered.sequenceComplexity,
      engineered.positionSquared,
      engineered.winRateSquared,
      engineered.positionZone === 'corner' ? 1 : 0,
      engineered.positionZone === 'edge' ? 1 : 0,
      engineered.positionZone === 'center' ? 1 : 0,
      engineered.timeOfDayBin === 'morning' ? 1 : 0,
      engineered.timeOfDayBin === 'afternoon' ? 1 : 0,
      engineered.timeOfDayBin === 'evening' ? 1 : 0,
      engineered.timeOfDayBin === 'night' ? 1 : 0,
      engineered.frequencyBin === 'rare' ? 1 : 0,
      engineered.frequencyBin === 'common' ? 1 : 0,
      engineered.frequencyBin === 'frequent' ? 1 : 0,
      engineered.riskScore,
      engineered.opportunityScore,
      engineered.stabilityScore,
    ];
  }

  // Calculate performance metrics
  private calculateMetrics(predictions: number[], actuals: number[]): ValidationResult {
    const threshold = 0.5;
    let tp = 0, fp = 0, tn = 0, fn = 0;

    for (let i = 0; i < predictions.length; i++) {
      const predicted = predictions[i] > threshold;
      const actual = actuals[i] === 1;

      if (predicted && actual) tp++;
      else if (predicted && !actual) fp++;
      else if (!predicted && !actual) tn++;
      else if (!predicted && actual) fn++;
    }

    const accuracy = (tp + tn) / (tp + fp + tn + fn);
    const precision = tp / (tp + fp) || 0;
    const recall = tp / (tp + fn) || 0;
    const f1Score = 2 * (precision * recall) / (precision + recall) || 0;
    
    // Calculate AUC-ROC
    const auc = this.calculateAUC(predictions, actuals);

    return {
      accuracy,
      precision,
      recall,
      f1Score,
      auc,
      confusionMatrix: { truePositives: tp, falsePositives: fp, trueNegatives: tn, falseNegatives: fn },
      crossValidationScores: [], // Will be filled by aggregateResults
      meanCVScore: accuracy,
      stdCVScore: 0,
    };
  }

  // Calculate AUC-ROC
  private calculateAUC(predictions: number[], actuals: number[]): number {
    // Sort by prediction score
    const sorted = predictions
      .map((pred, i) => ({ pred, actual: actuals[i] }))
      .sort((a, b) => b.pred - a.pred);

    let auc = 0;
    let tpCount = 0;
    let fpCount = 0;
    const totalPositives = actuals.filter(a => a === 1).length;
    const totalNegatives = actuals.length - totalPositives;

    if (totalPositives === 0 || totalNegatives === 0) return 0.5;

    for (const item of sorted) {
      if (item.actual === 1) {
        tpCount++;
      } else {
        fpCount++;
        auc += tpCount;
      }
    }

    return auc / (totalPositives * totalNegatives);
  }

  // Aggregate cross-validation results
  private aggregateResults(cvResults: ValidationResult[]): ValidationResult {
    const accuracies = cvResults.map(r => r.accuracy);
    const precisions = cvResults.map(r => r.precision);
    const recalls = cvResults.map(r => r.recall);
    const f1Scores = cvResults.map(r => r.f1Score);
    const aucs = cvResults.map(r => r.auc);

    const meanAccuracy = accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length;
    const stdAccuracy = Math.sqrt(
      accuracies.reduce((sum, acc) => sum + Math.pow(acc - meanAccuracy, 2), 0) / accuracies.length
    );

    // Aggregate confusion matrices
    const totalTP = cvResults.reduce((sum, r) => sum + r.confusionMatrix.truePositives, 0);
    const totalFP = cvResults.reduce((sum, r) => sum + r.confusionMatrix.falsePositives, 0);
    const totalTN = cvResults.reduce((sum, r) => sum + r.confusionMatrix.trueNegatives, 0);
    const totalFN = cvResults.reduce((sum, r) => sum + r.confusionMatrix.falseNegatives, 0);

    return {
      accuracy: meanAccuracy,
      precision: precisions.reduce((sum, p) => sum + p, 0) / precisions.length,
      recall: recalls.reduce((sum, r) => sum + r, 0) / recalls.length,
      f1Score: f1Scores.reduce((sum, f) => sum + f, 0) / f1Scores.length,
      auc: aucs.reduce((sum, a) => sum + a, 0) / aucs.length,
      confusionMatrix: {
        truePositives: totalTP,
        falsePositives: totalFP,
        trueNegatives: totalTN,
        falseNegatives: totalFN,
      },
      crossValidationScores: accuracies,
      meanCVScore: meanAccuracy,
      stdCVScore: stdAccuracy,
    };
  }

  // Evaluate performance by bone count
  private async evaluateByBoneCount(trainingData: TrainingData[]): Promise<Record<number, ValidationResult>> {
    const results: Record<number, ValidationResult> = {};
    
    for (const boneCount of [2, 3, 4]) {
      const boneCountData = trainingData.filter(d => d.metadata.boneCount === boneCount);
      
      if (boneCountData.length >= 50) {
        const model = await this.trainModel(boneCountData);
        results[boneCount] = await this.evaluateModel(model, boneCountData);
      }
    }
    
    return results;
  }

  // Evaluate performance by position
  private async evaluateByPosition(trainingData: TrainingData[]): Promise<Record<number, ValidationResult>> {
    const results: Record<number, ValidationResult> = {};
    
    for (let position = 1; position <= 25; position++) {
      const positionData = trainingData.filter(d => d.metadata.position === position);
      
      if (positionData.length >= 20) {
        const model = await this.trainModel(positionData);
        results[position] = await this.evaluateModel(model, positionData);
      }
    }
    
    return results;
  }

  // Evaluate performance by time of day
  private async evaluateByTimeOfDay(trainingData: TrainingData[]): Promise<Record<string, ValidationResult>> {
    const results: Record<string, ValidationResult> = {};
    
    const timeGroups = {
      morning: trainingData.filter(d => {
        const hour = d.metadata.timestamp.getHours();
        return hour >= 6 && hour < 12;
      }),
      afternoon: trainingData.filter(d => {
        const hour = d.metadata.timestamp.getHours();
        return hour >= 12 && hour < 18;
      }),
      evening: trainingData.filter(d => {
        const hour = d.metadata.timestamp.getHours();
        return hour >= 18 && hour < 22;
      }),
      night: trainingData.filter(d => {
        const hour = d.metadata.timestamp.getHours();
        return hour >= 22 || hour < 6;
      }),
    };
    
    for (const [timeGroup, data] of Object.entries(timeGroups)) {
      if (data.length >= 30) {
        const model = await this.trainModel(data);
        results[timeGroup] = await this.evaluateModel(model, data);
      }
    }
    
    return results;
  }

  // Calculate feature importance using permutation importance
  private async calculateFeatureImportance(trainingData: TrainingData[]): Promise<Record<string, number>> {
    const model = await this.trainModel(trainingData);
    const baselineAccuracy = (await this.evaluateModel(model, trainingData)).accuracy;
    
    const featureNames = [
      'position', 'boneCount', 'revealedCount', 'historicalWinRate', 'recentWinRate',
      'positionFrequency', 'adjacentBoneCount', 'distanceToNearestBone', 'clusterDensity',
      'hourOfDay', 'dayOfWeek', 'timeSinceLastBone', 'sequencePatternScore',
      'markovChainProbability', 'patternMatchConfidence', 'positionEntropy',
      'correlationScore', 'volatilityIndex', 'modelConfidence', 'dataQuality',
      'positionTimeInteraction', 'boneCountPositionInteraction', 'sequenceComplexity',
      'positionSquared', 'winRateSquared', 'positionZone_corner', 'positionZone_edge',
      'positionZone_center', 'timeOfDay_morning', 'timeOfDay_afternoon', 'timeOfDay_evening',
      'timeOfDay_night', 'frequency_rare', 'frequency_common', 'frequency_frequent',
      'riskScore', 'opportunityScore', 'stabilityScore'
    ];

    const importance: Record<string, number> = {};

    for (let featureIndex = 0; featureIndex < featureNames.length; featureIndex++) {
      // Create permuted dataset
      const permutedData = trainingData.map(sample => {
        const features = this.extractFeatureVector(sample.features);
        const permutedFeatures = [...features];
        
        // Permute this feature
        const randomIndex = Math.floor(Math.random() * trainingData.length);
        const randomSample = trainingData[randomIndex];
        const randomFeatures = this.extractFeatureVector(randomSample.features);
        permutedFeatures[featureIndex] = randomFeatures[featureIndex];
        
        return {
          ...sample,
          features: this.reconstructFeatures(permutedFeatures, sample.features),
        };
      });

      const permutedAccuracy = (await this.evaluateModel(model, permutedData)).accuracy;
      importance[featureNames[featureIndex]] = Math.max(0, baselineAccuracy - permutedAccuracy);
    }

    return importance;
  }

  // Reconstruct features object from vector (simplified)
  private reconstructFeatures(vector: number[], original: AdvancedMLFeatures): AdvancedMLFeatures {
    // This is a simplified reconstruction - in practice, you'd need to properly map back
    return original; // For now, return original
  }

  // Utility function to shuffle array
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

// Simple ML Model interface
interface MLModel {
  fit(X: number[][], y: number[], weights?: number[]): Promise<void>;
  predict(X: number[]): Promise<number>;
}

// Simple Logistic Regression implementation
class LogisticRegressionModel implements MLModel {
  private weights: number[] = [];
  private bias: number = 0;
  private learningRate: number = 0.01;
  private maxIterations: number = 1000;

  async fit(X: number[][], y: number[], weights?: number[]): Promise<void> {
    const numFeatures = X[0].length;
    this.weights = new Array(numFeatures).fill(0);
    this.bias = 0;

    const sampleWeights = weights || new Array(X.length).fill(1);

    for (let iter = 0; iter < this.maxIterations; iter++) {
      let totalLoss = 0;
      const gradWeights = new Array(numFeatures).fill(0);
      let gradBias = 0;

      for (let i = 0; i < X.length; i++) {
        const prediction = this.sigmoid(this.dotProduct(X[i], this.weights) + this.bias);
        const error = prediction - y[i];
        const weight = sampleWeights[i];

        totalLoss += weight * (y[i] * Math.log(prediction + 1e-15) + (1 - y[i]) * Math.log(1 - prediction + 1e-15));

        for (let j = 0; j < numFeatures; j++) {
          gradWeights[j] += weight * error * X[i][j];
        }
        gradBias += weight * error;
      }

      // Update weights
      for (let j = 0; j < numFeatures; j++) {
        this.weights[j] -= this.learningRate * gradWeights[j] / X.length;
      }
      this.bias -= this.learningRate * gradBias / X.length;

      // Early stopping if loss is not improving
      if (iter > 100 && Math.abs(totalLoss) < 1e-6) {
        break;
      }
    }
  }

  async predict(X: number[]): Promise<number> {
    return this.sigmoid(this.dotProduct(X, this.weights) + this.bias);
  }

  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x))));
  }

  private dotProduct(a: number[], b: number[]): number {
    return a.reduce((sum, val, i) => sum + val * b[i], 0);
  }
}

// Singleton instance
export const crossValidator = CrossValidator.getInstance();