// A/B Testing Framework for ML Model Comparison
import { db } from '@/lib/db';
import { monitoring } from '@/lib/monitoring';
import { HyperparameterConfig } from './hyperparameter-optimization';

export interface ABTestConfig {
  id: string;
  name: string;
  description: string;
  startDate: Date;
  endDate?: Date;
  trafficSplit: number; // 0.0 to 1.0, percentage for variant B
  status: 'draft' | 'running' | 'paused' | 'completed';
  
  // Model configurations
  controlModel: {
    version: string;
    hyperparameters: HyperparameterConfig;
    features: string[];
  };
  
  variantModel: {
    version: string;
    hyperparameters: HyperparameterConfig;
    features: string[];
  };
  
  // Success metrics
  primaryMetric: 'accuracy' | 'precision' | 'recall' | 'f1Score' | 'userSatisfaction';
  secondaryMetrics: string[];
  minimumSampleSize: number;
  minimumDetectableEffect: number; // Minimum effect size to detect
  statisticalPower: number; // Desired statistical power (0.8 = 80%)
  significanceLevel: number; // Alpha level (0.05 = 5%)
}

export interface ABTestResult {
  testId: string;
  status: 'running' | 'completed' | 'inconclusive';
  
  // Sample sizes
  controlSamples: number;
  variantSamples: number;
  
  // Performance metrics
  controlMetrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    responseTime: number;
    userSatisfaction?: number;
  };
  
  variantMetrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    responseTime: number;
    userSatisfaction?: number;
  };
  
  // Statistical analysis
  statisticalSignificance: {
    pValue: number;
    confidenceInterval: [number, number];
    effectSize: number;
    isSignificant: boolean;
    power: number;
  };
  
  // Recommendations
  recommendation: 'control' | 'variant' | 'continue_test' | 'inconclusive';
  confidence: number;
  reasoning: string[];
  
  // Timeline
  startDate: Date;
  endDate?: Date;
  duration: number; // in hours
}

export interface ABTestSample {
  id: string;
  testId: string;
  variant: 'control' | 'variant';
  userId?: string;
  sessionId: string;
  
  // Input context
  position: number;
  boneCount: number;
  revealedPositions: number[];
  timestamp: Date;
  
  // Model prediction
  predictedScore: number;
  predictedProbability: number;
  responseTime: number;
  
  // Actual outcome
  actualResult?: boolean; // true = chicken, false = bone
  userAccepted?: boolean; // Did user follow the recommendation?
  userSatisfaction?: number; // 1-5 rating
  
  // Metadata
  modelVersion: string;
  features: Record<string, number>;
}

export class ABTestManager {
  private static instance: ABTestManager;
  
  static getInstance(): ABTestManager {
    if (!ABTestManager.instance) {
      ABTestManager.instance = new ABTestManager();
    }
    return ABTestManager.instance;
  }

  // Create a new A/B test
  async createTest(config: ABTestConfig): Promise<string> {
    // Validate configuration
    this.validateTestConfig(config);
    
    // Store test configuration
    await this.storeTestConfig(config);
    
    console.log(`Created A/B test: ${config.name} (${config.id})`);
    
    // Log test creation
    await monitoring.logMetric('ab_test_created', 1, undefined, {
      testId: config.id,
      testName: config.name,
      trafficSplit: config.trafficSplit,
      primaryMetric: config.primaryMetric,
    });
    
    return config.id;
  }

  // Start an A/B test
  async startTest(testId: string): Promise<void> {
    const config = await this.getTestConfig(testId);
    if (!config) {
      throw new Error(`Test ${testId} not found`);
    }
    
    if (config.status !== 'draft') {
      throw new Error(`Test ${testId} is not in draft status`);
    }
    
    // Update status to running
    config.status = 'running';
    config.startDate = new Date();
    
    await this.updateTestConfig(config);
    
    console.log(`Started A/B test: ${config.name}`);
    
    await monitoring.logMetric('ab_test_started', 1, undefined, {
      testId,
      testName: config.name,
    });
  }

  // Stop an A/B test
  async stopTest(testId: string): Promise<ABTestResult> {
    const config = await this.getTestConfig(testId);
    if (!config) {
      throw new Error(`Test ${testId} not found`);
    }
    
    // Update status to completed
    config.status = 'completed';
    config.endDate = new Date();
    
    await this.updateTestConfig(config);
    
    // Analyze results
    const result = await this.analyzeTestResults(testId);
    
    console.log(`Stopped A/B test: ${config.name}. Result: ${result.recommendation}`);
    
    await monitoring.logMetric('ab_test_stopped', 1, undefined, {
      testId,
      testName: config.name,
      recommendation: result.recommendation,
      isSignificant: result.statisticalSignificance.isSignificant,
    });
    
    return result;
  }

  // Assign user to test variant
  async assignVariant(testId: string, userId?: string, sessionId?: string): Promise<'control' | 'variant' | null> {
    const config = await this.getTestConfig(testId);
    if (!config || config.status !== 'running') {
      return null;
    }
    
    // Check if test has ended
    if (config.endDate && new Date() > config.endDate) {
      return null;
    }
    
    // Deterministic assignment based on user/session ID
    const assignmentKey = userId || sessionId || Math.random().toString();
    const hash = this.hashString(assignmentKey + testId);
    const assignment = hash < config.trafficSplit ? 'variant' : 'control';
    
    return assignment;
  }

  // Record a test sample
  async recordSample(sample: Omit<ABTestSample, 'id'>): Promise<void> {
    const sampleWithId: ABTestSample = {
      ...sample,
      id: this.generateId(),
    };
    
    await this.storeSample(sampleWithId);
    
    // Check if we should analyze results
    const config = await this.getTestConfig(sample.testId);
    if (config && config.status === 'running') {
      const sampleCount = await this.getSampleCount(sample.testId);
      
      // Analyze every 100 samples or daily
      if (sampleCount % 100 === 0) {
        await this.checkTestProgress(sample.testId);
      }
    }
  }

  // Update sample with actual result
  async updateSampleResult(
    sampleId: string,
    actualResult: boolean,
    userAccepted?: boolean,
    userSatisfaction?: number
  ): Promise<void> {
    await this.updateSample(sampleId, {
      actualResult,
      userAccepted,
      userSatisfaction,
    });
  }

  // Analyze test results
  async analyzeTestResults(testId: string): Promise<ABTestResult> {
    const config = await this.getTestConfig(testId);
    if (!config) {
      throw new Error(`Test ${testId} not found`);
    }
    
    const samples = await this.getTestSamples(testId);
    
    // Separate control and variant samples
    const controlSamples = samples.filter(s => s.variant === 'control');
    const variantSamples = samples.filter(s => s.variant === 'variant');
    
    // Calculate metrics for each group
    const controlMetrics = this.calculateMetrics(controlSamples);
    const variantMetrics = this.calculateMetrics(variantSamples);
    
    // Perform statistical analysis
    const statisticalSignificance = this.performStatisticalTest(
      controlSamples,
      variantSamples,
      config.primaryMetric,
      config.significanceLevel
    );
    
    // Generate recommendation
    const { recommendation, confidence, reasoning } = this.generateRecommendation(
      config,
      controlMetrics,
      variantMetrics,
      statisticalSignificance
    );
    
    const duration = config.endDate 
      ? (config.endDate.getTime() - config.startDate.getTime()) / (1000 * 60 * 60)
      : (Date.now() - config.startDate.getTime()) / (1000 * 60 * 60);
    
    return {
      testId,
      status: config.status === 'completed' ? 'completed' : 'running',
      controlSamples: controlSamples.length,
      variantSamples: variantSamples.length,
      controlMetrics,
      variantMetrics,
      statisticalSignificance,
      recommendation,
      confidence,
      reasoning,
      startDate: config.startDate,
      endDate: config.endDate,
      duration,
    };
  }

  // Get all active tests
  async getActiveTests(): Promise<ABTestConfig[]> {
    return this.getTestsByStatus('running');
  }

  // Get test results summary
  async getTestSummary(testId: string): Promise<{
    config: ABTestConfig;
    result: ABTestResult;
    samples: ABTestSample[];
  }> {
    const config = await this.getTestConfig(testId);
    if (!config) {
      throw new Error(`Test ${testId} not found`);
    }
    
    const result = await this.analyzeTestResults(testId);
    const samples = await this.getTestSamples(testId);
    
    return { config, result, samples };
  }

  // Private helper methods
  private validateTestConfig(config: ABTestConfig): void {
    if (!config.id || !config.name) {
      throw new Error('Test ID and name are required');
    }
    
    if (config.trafficSplit < 0 || config.trafficSplit > 1) {
      throw new Error('Traffic split must be between 0 and 1');
    }
    
    if (config.minimumSampleSize < 10) {
      throw new Error('Minimum sample size must be at least 10');
    }
    
    if (config.statisticalPower < 0.5 || config.statisticalPower > 0.99) {
      throw new Error('Statistical power must be between 0.5 and 0.99');
    }
    
    if (config.significanceLevel < 0.01 || config.significanceLevel > 0.1) {
      throw new Error('Significance level must be between 0.01 and 0.1');
    }
  }

  private calculateMetrics(samples: ABTestSample[]) {
    const validSamples = samples.filter(s => s.actualResult !== undefined);
    
    if (validSamples.length === 0) {
      return {
        accuracy: 0,
        precision: 0,
        recall: 0,
        f1Score: 0,
        responseTime: 0,
        userSatisfaction: 0,
      };
    }
    
    let tp = 0, fp = 0, tn = 0, fn = 0;
    let totalResponseTime = 0;
    let totalSatisfaction = 0;
    let satisfactionCount = 0;
    
    for (const sample of validSamples) {
      const predicted = sample.predictedProbability > 0.5;
      const actual = sample.actualResult!;
      
      if (predicted && actual) tp++;
      else if (predicted && !actual) fp++;
      else if (!predicted && !actual) tn++;
      else if (!predicted && actual) fn++;
      
      totalResponseTime += sample.responseTime;
      
      if (sample.userSatisfaction !== undefined) {
        totalSatisfaction += sample.userSatisfaction;
        satisfactionCount++;
      }
    }
    
    const accuracy = (tp + tn) / (tp + fp + tn + fn);
    const precision = tp / (tp + fp) || 0;
    const recall = tp / (tp + fn) || 0;
    const f1Score = 2 * (precision * recall) / (precision + recall) || 0;
    const responseTime = totalResponseTime / validSamples.length;
    const userSatisfaction = satisfactionCount > 0 ? totalSatisfaction / satisfactionCount : undefined;
    
    return {
      accuracy,
      precision,
      recall,
      f1Score,
      responseTime,
      userSatisfaction,
    };
  }

  private performStatisticalTest(
    controlSamples: ABTestSample[],
    variantSamples: ABTestSample[],
    primaryMetric: string,
    significanceLevel: number
  ) {
    // Extract metric values
    const controlValues = this.extractMetricValues(controlSamples, primaryMetric);
    const variantValues = this.extractMetricValues(variantSamples, primaryMetric);
    
    if (controlValues.length === 0 || variantValues.length === 0) {
      return {
        pValue: 1.0,
        confidenceInterval: [0, 0] as [number, number],
        effectSize: 0,
        isSignificant: false,
        power: 0,
      };
    }
    
    // Perform two-sample t-test
    const controlMean = controlValues.reduce((sum, val) => sum + val, 0) / controlValues.length;
    const variantMean = variantValues.reduce((sum, val) => sum + val, 0) / variantValues.length;
    
    const controlVar = controlValues.reduce((sum, val) => sum + Math.pow(val - controlMean, 2), 0) / (controlValues.length - 1);
    const variantVar = variantValues.reduce((sum, val) => sum + Math.pow(val - variantMean, 2), 0) / (variantValues.length - 1);
    
    const pooledStd = Math.sqrt(
      ((controlValues.length - 1) * controlVar + (variantValues.length - 1) * variantVar) /
      (controlValues.length + variantValues.length - 2)
    );
    
    const standardError = pooledStd * Math.sqrt(1 / controlValues.length + 1 / variantValues.length);
    const tStatistic = (variantMean - controlMean) / standardError;
    
    // Calculate p-value (simplified)
    const degreesOfFreedom = controlValues.length + variantValues.length - 2;
    const pValue = this.calculatePValue(Math.abs(tStatistic), degreesOfFreedom);
    
    // Calculate effect size (Cohen's d)
    const effectSize = (variantMean - controlMean) / pooledStd;
    
    // Calculate confidence interval
    const criticalValue = this.getCriticalValue(significanceLevel / 2, degreesOfFreedom);
    const marginOfError = criticalValue * standardError;
    const confidenceInterval: [number, number] = [
      (variantMean - controlMean) - marginOfError,
      (variantMean - controlMean) + marginOfError
    ];
    
    // Calculate statistical power (simplified)
    const power = this.calculatePower(effectSize, controlValues.length, variantValues.length, significanceLevel);
    
    return {
      pValue,
      confidenceInterval,
      effectSize,
      isSignificant: pValue < significanceLevel,
      power,
    };
  }

  private extractMetricValues(samples: ABTestSample[], metric: string): number[] {
    return samples
      .filter(s => s.actualResult !== undefined)
      .map(s => {
        switch (metric) {
          case 'accuracy':
            return (s.predictedProbability > 0.5) === s.actualResult! ? 1 : 0;
          case 'precision':
          case 'recall':
          case 'f1Score':
            // These would need more complex calculation
            return (s.predictedProbability > 0.5) === s.actualResult! ? 1 : 0;
          case 'userSatisfaction':
            return s.userSatisfaction || 0;
          default:
            return 0;
        }
      });
  }

  private generateRecommendation(
    config: ABTestConfig,
    controlMetrics: any,
    variantMetrics: any,
    statisticalSignificance: any
  ): { recommendation: 'control' | 'variant' | 'continue_test' | 'inconclusive'; confidence: number; reasoning: string[] } {
    const reasoning: string[] = [];
    
    // Check statistical significance
    if (!statisticalSignificance.isSignificant) {
      reasoning.push(`No statistical significance detected (p=${statisticalSignificance.pValue.toFixed(4)})`);
      
      if (statisticalSignificance.power < 0.8) {
        reasoning.push(`Low statistical power (${(statisticalSignificance.power * 100).toFixed(1)}%), consider increasing sample size`);
        return { recommendation: 'continue_test', confidence: 0.3, reasoning };
      } else {
        return { recommendation: 'inconclusive', confidence: 0.5, reasoning };
      }
    }
    
    // Compare primary metric
    const primaryMetric = config.primaryMetric;
    const controlValue = controlMetrics[primaryMetric];
    const variantValue = variantMetrics[primaryMetric];
    const improvement = (variantValue - controlValue) / controlValue;
    
    reasoning.push(`${primaryMetric} improvement: ${(improvement * 100).toFixed(2)}%`);
    reasoning.push(`Statistical significance: p=${statisticalSignificance.pValue.toFixed(4)}`);
    reasoning.push(`Effect size: ${statisticalSignificance.effectSize.toFixed(3)}`);
    
    // Check if improvement meets minimum detectable effect
    if (Math.abs(improvement) < config.minimumDetectableEffect) {
      reasoning.push(`Improvement below minimum detectable effect (${(config.minimumDetectableEffect * 100).toFixed(2)}%)`);
      return { recommendation: 'inconclusive', confidence: 0.6, reasoning };
    }
    
    // Check secondary metrics for any regressions
    let hasRegression = false;
    for (const secondaryMetric of config.secondaryMetrics) {
      if (controlMetrics[secondaryMetric] && variantMetrics[secondaryMetric]) {
        const secondaryImprovement = (variantMetrics[secondaryMetric] - controlMetrics[secondaryMetric]) / controlMetrics[secondaryMetric];
        if (secondaryImprovement < -0.05) { // 5% regression threshold
          hasRegression = true;
          reasoning.push(`Regression in ${secondaryMetric}: ${(secondaryImprovement * 100).toFixed(2)}%`);
        }
      }
    }
    
    if (hasRegression) {
      reasoning.push('Secondary metric regressions detected');
      return { recommendation: 'control', confidence: 0.7, reasoning };
    }
    
    // Make recommendation based on improvement
    if (improvement > 0) {
      reasoning.push('Variant shows significant improvement');
      return { 
        recommendation: 'variant', 
        confidence: Math.min(0.95, 0.7 + Math.abs(statisticalSignificance.effectSize) * 0.1), 
        reasoning 
      };
    } else {
      reasoning.push('Control performs better');
      return { 
        recommendation: 'control', 
        confidence: Math.min(0.95, 0.7 + Math.abs(statisticalSignificance.effectSize) * 0.1), 
        reasoning 
      };
    }
  }

  // Simplified statistical functions (in practice, use proper statistical libraries)
  private calculatePValue(tStatistic: number, degreesOfFreedom: number): number {
    // Simplified p-value calculation
    // In practice, use proper statistical libraries like jStat
    return Math.max(0.001, Math.min(0.999, 2 * (1 - this.normalCDF(Math.abs(tStatistic)))));
  }

  private getCriticalValue(alpha: number, degreesOfFreedom: number): number {
    // Simplified critical value (t-distribution)
    // For large df, approximates normal distribution
    if (degreesOfFreedom > 30) {
      return this.normalInverseCDF(1 - alpha);
    }
    // Simplified t-distribution critical values
    return 2.0; // Rough approximation
  }

  private calculatePower(effectSize: number, n1: number, n2: number, alpha: number): number {
    // Simplified power calculation
    const nHarmonic = 2 / (1/n1 + 1/n2);
    const delta = effectSize * Math.sqrt(nHarmonic / 2);
    const criticalValue = this.normalInverseCDF(1 - alpha/2);
    return 1 - this.normalCDF(criticalValue - delta) + this.normalCDF(-criticalValue - delta);
  }

  private normalCDF(x: number): number {
    // Approximation of normal CDF
    return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
  }

  private normalInverseCDF(p: number): number {
    // Approximation of inverse normal CDF
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;
    
    // Beasley-Springer-Moro algorithm approximation
    const a = [0, -3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    const b = [0, -5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
    
    const c = [0, -7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    const d = [0, 7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
    
    const pLow = 0.02425;
    const pHigh = 1 - pLow;
    
    let x: number;
    
    if (p < pLow) {
      const q = Math.sqrt(-2 * Math.log(p));
      x = (((((c[1]*q+c[2])*q+c[3])*q+c[4])*q+c[5])*q+c[6]) / ((((d[1]*q+d[2])*q+d[3])*q+d[4])*q+1);
    } else if (p <= pHigh) {
      const q = p - 0.5;
      const r = q * q;
      x = (((((a[1]*r+a[2])*r+a[3])*r+a[4])*r+a[5])*r+a[6])*q / (((((b[1]*r+b[2])*r+b[3])*r+b[4])*r+b[5])*r+1);
    } else {
      const q = Math.sqrt(-2 * Math.log(1 - p));
      x = -(((((c[1]*q+c[2])*q+c[3])*q+c[4])*q+c[5])*q+c[6]) / ((((d[1]*q+d[2])*q+d[3])*q+d[4])*q+1);
    }
    
    return x;
  }

  private erf(x: number): number {
    // Approximation of error function
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;
    
    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);
    
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    
    return sign * y;
  }

  private async checkTestProgress(testId: string): Promise<void> {
    const result = await this.analyzeTestResults(testId);
    
    // Auto-stop test if we have strong evidence
    if (result.statisticalSignificance.isSignificant && 
        result.confidence > 0.9 && 
        result.controlSamples + result.variantSamples > 1000) {
      
      console.log(`Auto-stopping test ${testId} due to strong statistical evidence`);
      await this.stopTest(testId);
    }
  }

  // Utility methods
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) / 2147483647; // Normalize to 0-1
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  // Storage methods (simplified - in practice, use proper database)
  private testConfigs: Map<string, ABTestConfig> = new Map();
  private testSamples: Map<string, ABTestSample[]> = new Map();

  private async storeTestConfig(config: ABTestConfig): Promise<void> {
    this.testConfigs.set(config.id, config);
  }

  private async getTestConfig(testId: string): Promise<ABTestConfig | null> {
    return this.testConfigs.get(testId) || null;
  }

  private async updateTestConfig(config: ABTestConfig): Promise<void> {
    this.testConfigs.set(config.id, config);
  }

  private async getTestsByStatus(status: string): Promise<ABTestConfig[]> {
    return Array.from(this.testConfigs.values()).filter(config => config.status === status);
  }

  private async storeSample(sample: ABTestSample): Promise<void> {
    if (!this.testSamples.has(sample.testId)) {
      this.testSamples.set(sample.testId, []);
    }
    this.testSamples.get(sample.testId)!.push(sample);
  }

  private async getTestSamples(testId: string): Promise<ABTestSample[]> {
    return this.testSamples.get(testId) || [];
  }

  private async getSampleCount(testId: string): Promise<number> {
    return (this.testSamples.get(testId) || []).length;
  }

  private async updateSample(sampleId: string, updates: Partial<ABTestSample>): Promise<void> {
    for (const samples of this.testSamples.values()) {
      const sample = samples.find(s => s.id === sampleId);
      if (sample) {
        Object.assign(sample, updates);
        break;
      }
    }
  }
}

// Singleton instance
export const abTestManager = ABTestManager.getInstance();