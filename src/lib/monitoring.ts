// Monitoring and logging utilities for ML system
import { db } from './db';

export interface PredictionMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  totalPredictions: number;
  correctPredictions: number;
}

export interface SystemAlert {
  type: 'performance' | 'error' | 'warning';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class MLMonitoringService {
  private static instance: MLMonitoringService;
  private modelVersion: string = '1.0';

  static getInstance(): MLMonitoringService {
    if (!MLMonitoringService.instance) {
      MLMonitoringService.instance = new MLMonitoringService();
    }
    return MLMonitoringService.instance;
  }

  // Log a prediction for later validation
  async logPrediction(
    position: number,
    predictedScore: number,
    boneCount: number,
    gameId?: string
  ): Promise<void> {
    try {
      await db.predictionLog.create({
        data: {
          position,
          predictedScore,
          actualResult: false, // Will be updated when result is known
          boneCount,
          modelVersion: this.modelVersion,
          gameId,
        },
      });
    } catch (error) {
      console.error('Failed to log prediction:', error);
    }
  }

  // Update prediction with actual result
  async updatePredictionResult(
    position: number,
    actualResult: boolean,
    gameId?: string
  ): Promise<void> {
    try {
      // Find the most recent prediction for this position
      const prediction = await db.predictionLog.findFirst({
        where: {
          position,
          gameId,
          actualResult: false, // Not yet updated
        },
        orderBy: { timestamp: 'desc' },
      });

      if (prediction) {
        await db.predictionLog.update({
          where: { id: prediction.id },
          data: { actualResult },
        });
      }
    } catch (error) {
      console.error('Failed to update prediction result:', error);
    }
  }

  // Calculate prediction accuracy for a time period
  async calculateAccuracy(
    hoursBack: number = 24,
    boneCount?: number
  ): Promise<PredictionMetrics> {
    try {
      const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
      
      const predictions = await db.predictionLog.findMany({
        where: {
          timestamp: { gte: since },
          boneCount: boneCount || undefined,
        },
      });

      if (predictions.length === 0) {
        return {
          accuracy: 0,
          precision: 0,
          recall: 0,
          f1Score: 0,
          totalPredictions: 0,
          correctPredictions: 0,
        };
      }

      // Calculate metrics
      let truePositives = 0;
      let falsePositives = 0;
      let trueNegatives = 0;
      let falseNegatives = 0;

      predictions.forEach(pred => {
        const predicted = pred.predictedScore > 65; // Threshold for "safe" prediction
        const actual = pred.actualResult;

        if (predicted && actual) truePositives++;
        else if (predicted && !actual) falsePositives++;
        else if (!predicted && !actual) trueNegatives++;
        else if (!predicted && actual) falseNegatives++;
      });

      const accuracy = (truePositives + trueNegatives) / predictions.length;
      const precision = truePositives / (truePositives + falsePositives) || 0;
      const recall = truePositives / (truePositives + falseNegatives) || 0;
      const f1Score = 2 * (precision * recall) / (precision + recall) || 0;

      return {
        accuracy,
        precision,
        recall,
        f1Score,
        totalPredictions: predictions.length,
        correctPredictions: truePositives + trueNegatives,
      };
    } catch (error) {
      console.error('Failed to calculate accuracy:', error);
      return {
        accuracy: 0,
        precision: 0,
        recall: 0,
        f1Score: 0,
        totalPredictions: 0,
        correctPredictions: 0,
      };
    }
  }

  // Log system metrics
  async logMetric(
    metricType: string,
    value: number,
    boneCount?: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await db.systemMetrics.create({
        data: {
          metricType,
          value,
          boneCount: boneCount || null,
          modelVersion: this.modelVersion,
          metadata: metadata ? JSON.stringify(metadata) : null,
        },
      });
    } catch (error) {
      console.error('Failed to log metric:', error);
    }
  }

  // Check system health and generate alerts
  async checkSystemHealth(): Promise<SystemAlert[]> {
    const alerts: SystemAlert[] = [];

    try {
      // Check prediction accuracy
      const metrics = await this.calculateAccuracy(24);
      
      if (metrics.accuracy < 0.5 && metrics.totalPredictions > 10) {
        alerts.push({
          type: 'performance',
          message: `Prediction accuracy is low: ${(metrics.accuracy * 100).toFixed(1)}%`,
          severity: 'high',
          timestamp: new Date(),
          metadata: { metrics },
        });
      }

      // Check for recent errors
      const recentErrors = await this.getRecentErrors(1); // Last hour
      if (recentErrors > 10) {
        alerts.push({
          type: 'error',
          message: `High error rate: ${recentErrors} errors in the last hour`,
          severity: 'critical',
          timestamp: new Date(),
          metadata: { errorCount: recentErrors },
        });
      }

      // Check database performance
      const dbResponseTime = await this.measureDatabaseResponseTime();
      if (dbResponseTime > 1000) { // > 1 second
        alerts.push({
          type: 'performance',
          message: `Database response time is slow: ${dbResponseTime}ms`,
          severity: 'medium',
          timestamp: new Date(),
          metadata: { responseTime: dbResponseTime },
        });
      }

    } catch (error) {
      alerts.push({
        type: 'error',
        message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'high',
        timestamp: new Date(),
      });
    }

    return alerts;
  }

  // Measure database response time
  private async measureDatabaseResponseTime(): Promise<number> {
    const start = Date.now();
    try {
      await db.chickenGame.count();
      return Date.now() - start;
    } catch (error) {
      return -1; // Error indicator
    }
  }

  // Get recent error count (placeholder - would need error logging)
  private async getRecentErrors(hoursBack: number): Promise<number> {
    // This would typically query an error log table
    // For now, return 0 as placeholder
    return 0;
  }

  // Generate daily report
  async generateDailyReport(): Promise<{
    metrics: PredictionMetrics;
    alerts: SystemAlert[];
    summary: string;
  }> {
    const metrics = await this.calculateAccuracy(24);
    const alerts = await this.checkSystemHealth();
    
    const summary = `
Daily ML System Report:
- Total Predictions: ${metrics.totalPredictions}
- Accuracy: ${(metrics.accuracy * 100).toFixed(1)}%
- Precision: ${(metrics.precision * 100).toFixed(1)}%
- Recall: ${(metrics.recall * 100).toFixed(1)}%
- F1 Score: ${(metrics.f1Score * 100).toFixed(1)}%
- Active Alerts: ${alerts.length}
- System Status: ${alerts.some(a => a.severity === 'critical') ? 'CRITICAL' : 
                  alerts.some(a => a.severity === 'high') ? 'WARNING' : 'HEALTHY'}
    `.trim();

    return { metrics, alerts, summary };
  }
}

// Singleton instance
export const monitoring = MLMonitoringService.getInstance();

// Utility functions for logging
export function logError(error: Error, context?: Record<string, any>): void {
  console.error('System Error:', {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
  });
}

export function logWarning(message: string, context?: Record<string, any>): void {
  console.warn('System Warning:', {
    message,
    context,
    timestamp: new Date().toISOString(),
  });
}

export function logInfo(message: string, context?: Record<string, any>): void {
  console.log('System Info:', {
    message,
    context,
    timestamp: new Date().toISOString(),
  });
}