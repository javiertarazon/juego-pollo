'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  RefreshCw,
  Activity,
  Brain,
  Shield,
  AlertTriangle,
  TrendingUp,
  Zap,
  Target,
  Layers,
  BarChart3,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────
interface ModelInfo {
  trained: boolean;
  metrics: Record<string, any> | null;
}

interface MLStatus {
  success: boolean;
  is_trained: boolean;
  total_games: number;
  total_predictions: number;
  games_since_retrain: number;
  weights: Record<string, number>;
  models: Record<string, ModelInfo>;
  error_tracking: {
    total_evaluations: number;
    model_scores: Record<string, any>;
    problematic_positions: Array<{ position: number; error_rate: number }>;
  };
  training_metrics: Record<string, any>;
  validation_metrics: Record<string, any>;
}

interface FeatureImportanceItem {
  feature: string;
  importance: number;
}

interface MLMetrics {
  success: boolean;
  ensemble_weights: Record<string, number>;
  model_scores: Record<string, any>;
  feature_importance: {
    random_forest: FeatureImportanceItem[];
    xgboost: FeatureImportanceItem[];
  };
  error_analysis: {
    problematic_positions: Array<{ position: number; error_rate: number }>;
    total_evaluations: number;
    recent_errors: any[];
  };
  recall_at_k: Record<string, number>;
  validation: Record<string, any>;
  total_models: number;
  models_active: number;
}

interface PositionPrediction {
  position: number;
  bone_probability: number;
  confidence: number;
  uncertainty: number;
  is_safe: boolean;
  risk_level: string;
}

// ─── Constants ───────────────────────────────────────────────
const MODEL_LABELS: Record<string, string> = {
  random_forest: 'Random Forest',
  xgboost: 'XGBoost',
  lstm: 'LSTM BiDir',
  anti_repeat: 'Anti-Repeat',
  markov: 'Markov 2°',
  dispersion: 'Dispersión',
};

const MODEL_COLORS: Record<string, string> = {
  random_forest: '#3b82f6',
  xgboost: '#10b981',
  lstm: '#8b5cf6',
  anti_repeat: '#f59e0b',
  markov: '#ef4444',
  dispersion: '#06b6d4',
};

const RECALL_COLORS: Record<string, string> = {
  '5': '#22c55e',
  '10': '#3b82f6',
  '15': '#a855f7',
  '21': '#f59e0b',
};

// ─── Component ───────────────────────────────────────────────
export default function MLEnsembleDashboard() {
  const [status, setStatus] = useState<MLStatus | null>(null);
  const [metrics, setMetrics] = useState<MLMetrics | null>(null);
  const [predictions, setPredictions] = useState<PositionPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTraining, setIsTraining] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statusRes, metricsRes, predRes] = await Promise.all([
        fetch('/api/chicken/python-ml?action=status'),
        fetch('/api/chicken/python-ml?action=metrics'),
        fetch('/api/chicken/predict-python', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ revealedPositions: [], nPositions: 5 }),
        }),
      ]);

      if (!statusRes.ok || !metricsRes.ok) {
        throw new Error('Servicio Python ML no disponible. ¿Está ejecutándose en puerto 8100?');
      }

      const [statusData, metricsData, predData] = await Promise.all([
        statusRes.json(),
        metricsRes.json(),
        predRes.ok ? predRes.json() : null,
      ]);

      setStatus(statusData);
      setMetrics(metricsData);

      if (predData?.pythonML?.allPositions) {
        setPredictions(predData.pythonML.allPositions);
      }

      setLastRefresh(new Date());
    } catch (err: any) {
      setError(err.message || 'Error conectando con el servicio ML');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Auto-refresh cada 30s
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleTrain = async () => {
    setIsTraining(true);
    try {
      const res = await fetch('/api/chicken/python-ml?action=train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch {
      setError('Error al entrenar modelos');
    } finally {
      setIsTraining(false);
    }
  };

  // ─── Error / Loading states ──────────────────────────────
  if (loading && !status) {
    return (
      <div className="space-y-6">
        <Card className="p-8 text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-600" />
          <p className="text-lg font-semibold">Conectando con Python ML Ensemble v2.0...</p>
          <p className="text-sm text-gray-500 mt-2">Servidor en puerto 8100</p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card className="p-8 text-center border-red-300 dark:border-red-800">
          <AlertTriangle className="w-8 h-8 mx-auto mb-4 text-red-500" />
          <p className="text-lg font-semibold text-red-600">{error}</p>
          <p className="text-sm text-gray-500 mt-2">
            Asegúrate de que el servidor Python ML esté ejecutándose:
          </p>
          <code className="block mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono">
            cd ml-python && .\venv\Scripts\python.exe main.py
          </code>
          <Button onClick={fetchData} className="mt-4" variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Reintentar
          </Button>
        </Card>
      </div>
    );
  }

  if (!status || !metrics) return null;

  // ─── Derived data ────────────────────────────────────────
  const weightsData = Object.entries(status.weights || {}).map(([key, value]) => ({
    name: MODEL_LABELS[key] || key,
    key,
    weight: Math.round(value * 1000) / 10,
    color: MODEL_COLORS[key] || '#888',
  }));

  const recallData = Object.entries(metrics.recall_at_k || {}).map(([k, v]) => ({
    name: `K=${k}`,
    k,
    recall: typeof v === 'number' ? Math.round(v * 10) / 10 : 0,
    color: RECALL_COLORS[k] || '#888',
  }));

  const importanceSource = metrics.feature_importance?.random_forest?.length
    ? metrics.feature_importance.random_forest
    : metrics.feature_importance?.xgboost || [];

  const topFeatures = importanceSource
    .sort((a: FeatureImportanceItem, b: FeatureImportanceItem) => b.importance - a.importance)
    .slice(0, 15)
    .map((f: FeatureImportanceItem) => ({
      name: f.feature.replace(/_/g, ' ').slice(0, 20),
      fullName: f.feature,
      importance: Math.round(f.importance * 10000) / 100,
    }));

  const problematicPositions = (metrics.error_analysis?.problematic_positions || []).slice(0, 10);

  // Mapa de incertidumbre
  const sortedByUncertainty = [...predictions].sort((a, b) => b.uncertainty - a.uncertainty);

  // Radar de modelos
  const modelRadarData = Object.entries(status.models || {}).map(([key, info]) => {
    const score = metrics.model_scores?.[key];
    return {
      model: MODEL_LABELS[key] || key,
      trained: info.trained ? 100 : 0,
      weight: Math.round((status.weights[key] || 0) * 100),
      score: score?.mean_error != null ? Math.round((1 - score.mean_error) * 100) : 50,
    };
  });

  // ─── Chart configs ───────────────────────────────────────
  const weightsChartConfig: ChartConfig = Object.fromEntries(
    weightsData.map(d => [d.key, { label: d.name, color: d.color }])
  );

  const featureChartConfig: ChartConfig = {
    importance: { label: 'Importancia', color: '#8b5cf6' },
  };

  const recallChartConfig: ChartConfig = Object.fromEntries(
    recallData.map(d => [d.k, { label: d.name, color: d.color }])
  );

  // ─── Render ──────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header: Status Overview */}
      <Card className="p-6 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Brain className="w-7 h-7 text-purple-600" />
            <div>
              <h2 className="text-2xl font-bold">Python ML Ensemble v2.0</h2>
              <p className="text-sm text-gray-500">
                {metrics.models_active}/{metrics.total_models} modelos activos
                • {status.total_games} partidas •{' '}
                {status.total_predictions} predicciones
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {lastRefresh && (
              <span className="text-xs text-gray-400">
                {lastRefresh.toLocaleTimeString()}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refrescar
            </Button>
            <Button
              size="sm"
              onClick={handleTrain}
              disabled={isTraining}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isTraining ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                  Entrenando...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-1" />
                  Reentrenar
                </>
              )}
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow text-center">
            <div className="text-xs text-gray-500 mb-1">Modelos</div>
            <div className="text-2xl font-bold text-purple-600">
              {metrics.models_active}/{metrics.total_models}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow text-center">
            <div className="text-xs text-gray-500 mb-1">Recall@5</div>
            <div className="text-2xl font-bold text-green-600">
              {metrics.recall_at_k?.['5'] != null
                ? `${Math.round(metrics.recall_at_k['5'] * 10) / 10}%`
                : 'N/A'}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow text-center">
            <div className="text-xs text-gray-500 mb-1">Partidas</div>
            <div className="text-2xl font-bold text-blue-600">{status.total_games}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow text-center">
            <div className="text-xs text-gray-500 mb-1">Evaluaciones</div>
            <div className="text-2xl font-bold text-orange-600">
              {metrics.error_analysis?.total_evaluations || 0}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow text-center">
            <div className="text-xs text-gray-500 mb-1">Hasta retrain</div>
            <div className="text-2xl font-bold text-gray-600">
              {10 - status.games_since_retrain} partidas
            </div>
          </div>
        </div>
      </Card>

      {/* Row 1: Weights + Recall@K */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Model Weights */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-bold">Pesos del Ensemble</h3>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Pesos adaptativos basados en rendimiento de cada modelo
          </p>
          <ChartContainer config={weightsChartConfig} className="h-[220px] w-full">
            <BarChart data={weightsData} layout="vertical" margin={{ left: 80, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 30]} unit="%" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={75} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="weight" radius={[0, 4, 4, 0]}>
                {weightsData.map((entry) => (
                  <Cell key={entry.key} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </Card>

        {/* Recall@K */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-green-500" />
            <h3 className="text-lg font-bold">Recall@K</h3>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            ¿Cuántos huesos reales están en las top-K posiciones peligrosas predichas?
          </p>

          {recallData.length > 0 ? (
            <div className="space-y-4">
              {recallData.map((item) => (
                <div key={item.k} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{item.name}</span>
                    <span className="font-bold" style={{ color: item.color }}>
                      {item.recall}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div
                      className="h-3 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(item.recall, 100)}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">
              Sin datos de recall. Registra más partidas.
            </p>
          )}
        </Card>
      </div>

      {/* Row 2: Models Status Grid */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-purple-500" />
          <h3 className="text-lg font-bold">Estado de los 6 Modelos</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(status.models || {}).map(([key, info]) => {
            const weight = status.weights[key] || 0;
            const isActive = info.trained;
            const m = info.metrics || {};
            const color = MODEL_COLORS[key] || '#888';

            return (
              <div
                key={key}
                className={`p-4 rounded-lg border-2 transition-all ${
                  isActive
                    ? 'border-green-400 dark:border-green-700 bg-white dark:bg-gray-800'
                    : 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="font-semibold text-sm">
                      {MODEL_LABELS[key] || key}
                    </span>
                  </div>
                  <Badge
                    variant={isActive ? 'default' : 'secondary'}
                    className={`text-[10px] ${isActive ? 'bg-green-600' : ''}`}
                  >
                    {isActive ? 'ACTIVO' : 'INACTIVO'}
                  </Badge>
                </div>

                <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                  <div className="flex justify-between">
                    <span>Peso</span>
                    <span className="font-bold">{(weight * 100).toFixed(1)}%</span>
                  </div>

                  {/* RF specific */}
                  {key === 'random_forest' && m.auc_roc != null && (
                    <div className="flex justify-between">
                      <span>AUC-ROC</span>
                      <span className="font-mono">{Number(m.auc_roc).toFixed(3)}</span>
                    </div>
                  )}
                  {key === 'random_forest' && m.recall_bone != null && (
                    <div className="flex justify-between">
                      <span>Recall hueso</span>
                      <span className="font-mono">{(Number(m.recall_bone) * 100).toFixed(1)}%</span>
                    </div>
                  )}

                  {/* XGB specific */}
                  {key === 'xgboost' && m.auc_roc_train != null && (
                    <div className="flex justify-between">
                      <span>AUC train</span>
                      <span className="font-mono">{Number(m.auc_roc_train).toFixed(3)}</span>
                    </div>
                  )}

                  {/* LSTM specific */}
                  {key === 'lstm' && m.val_loss != null && (
                    <div className="flex justify-between">
                      <span>Val loss</span>
                      <span className="font-mono">{Number(m.val_loss).toFixed(3)}</span>
                    </div>
                  )}
                  {key === 'lstm' && m.train_sequences != null && (
                    <div className="flex justify-between">
                      <span>Secuencias</span>
                      <span className="font-mono">{m.train_sequences}</span>
                    </div>
                  )}

                  {/* Anti-repeat specific */}
                  {key === 'anti_repeat' && m.global_repeat_rate != null && (
                    <div className="flex justify-between">
                      <span>Tasa repetición</span>
                      <span className="font-mono">
                        {(Number(m.global_repeat_rate) * 100).toFixed(1)}%
                      </span>
                    </div>
                  )}

                  {/* Markov specific */}
                  {key === 'markov' && m.accuracy_last_20 != null && (
                    <div className="flex justify-between">
                      <span>Accuracy (20)</span>
                      <span className="font-mono">
                        {(Number(m.accuracy_last_20) * 100).toFixed(1)}%
                      </span>
                    </div>
                  )}

                  {/* Dispersion specific */}
                  {key === 'dispersion' && m.column_probs != null && (
                    <div className="flex justify-between">
                      <span>Col dominante</span>
                      <span className="font-mono">
                        C{(m.column_probs as number[]).indexOf(
                          Math.max(...(m.column_probs as number[]))
                        ) + 1}
                        :{' '}
                        {(
                          Math.max(...(m.column_probs as number[])) * 100
                        ).toFixed(1)}
                        %
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Row 3: Feature Importance + Problematic Positions */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Feature Importance */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-violet-500" />
            <h3 className="text-lg font-bold">Top 15 Features</h3>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Importancia relativa de las características para la predicción
          </p>
          {topFeatures.length > 0 ? (
            <ChartContainer config={featureChartConfig} className="h-[380px] w-full">
              <BarChart
                data={topFeatures}
                layout="vertical"
                margin={{ left: 110, right: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  width={105}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="importance" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">
              Sin datos. Entrena los modelos primero.
            </p>
          )}
        </Card>

        {/* Problematic Positions */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h3 className="text-lg font-bold">Posiciones Problemáticas</h3>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Posiciones donde el modelo comete más errores de predicción
          </p>
          {problematicPositions.length > 0 ? (
            <div className="space-y-2">
              {problematicPositions.map((p: any, idx: number) => (
                <div
                  key={p.position}
                  className="flex items-center gap-3 p-2 rounded bg-red-50 dark:bg-red-900/20"
                >
                  <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-800 flex items-center justify-center text-sm font-bold text-red-700 dark:text-red-300">
                    {p.position}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm">
                      <span>
                        Posición {p.position}{' '}
                        <span className="text-gray-400 text-xs">
                          (
                          {p.position <= 5
                            ? 'fila 1'
                            : p.position <= 10
                              ? 'fila 2'
                              : p.position <= 15
                                ? 'fila 3'
                                : p.position <= 20
                                  ? 'fila 4'
                                  : 'fila 5'}
                          )
                        </span>
                      </span>
                      <span className="font-mono text-red-600 font-bold">
                        {typeof p.error_rate === 'number'
                          ? `${(p.error_rate * 100).toFixed(1)}%`
                          : 'N/A'}
                      </span>
                    </div>
                    <Progress
                      value={typeof p.error_rate === 'number' ? p.error_rate * 100 : 0}
                      className="h-2 mt-1"
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">
              Sin datos suficientes. Registra más partidas.
            </p>
          )}
        </Card>
      </div>

      {/* Row 4: Uncertainty Heatmap (25 positions) */}
      {predictions.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-cyan-500" />
            <h3 className="text-lg font-bold">
              Mapa de Incertidumbre y Confianza del Ensemble
            </h3>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Cada celda muestra la confianza calibrada (%) y la incertidumbre entre modelos.
            Mayor incertidumbre = más desacuerdo entre los 6 modelos.
          </p>

          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 25 }, (_, i) => i + 1).map((pos) => {
              const pred = predictions.find((p) => p.position === pos);
              if (!pred) return <div key={pos} className="p-2 rounded bg-gray-100" />;

              const conf = pred.confidence;
              const unc = pred.uncertainty;
              const prob = pred.bone_probability;

              // Color: verde = seguro, rojo = peligroso, saturación = confianza
              let bgClass = '';
              let textClass = '';
              let borderClass = '';

              if (prob < 0.12) {
                bgClass = 'bg-green-100 dark:bg-green-900/40';
                textClass = 'text-green-800 dark:text-green-200';
                borderClass = 'border-green-500';
              } else if (prob < 0.16) {
                bgClass = 'bg-emerald-50 dark:bg-emerald-900/30';
                textClass = 'text-emerald-700 dark:text-emerald-300';
                borderClass = 'border-emerald-400';
              } else if (prob < 0.20) {
                bgClass = 'bg-yellow-50 dark:bg-yellow-900/20';
                textClass = 'text-yellow-700 dark:text-yellow-300';
                borderClass = 'border-yellow-400';
              } else if (prob < 0.30) {
                bgClass = 'bg-orange-50 dark:bg-orange-900/20';
                textClass = 'text-orange-700 dark:text-orange-300';
                borderClass = 'border-orange-400';
              } else {
                bgClass = 'bg-red-100 dark:bg-red-900/40';
                textClass = 'text-red-800 dark:text-red-200';
                borderClass = 'border-red-500';
              }

              // Incertidumbre alta = borde más grueso
              const borderWidth = unc > 0.05 ? 'border-[3px]' : 'border-2';

              return (
                <div
                  key={pos}
                  className={`p-2 rounded-lg text-center ${bgClass} ${borderClass} ${borderWidth} transition-all hover:scale-105`}
                  title={`Pos ${pos}: P(hueso)=${(prob * 100).toFixed(1)}%, Conf=${conf.toFixed(1)}%, Unc=${(unc * 100).toFixed(2)}%`}
                >
                  <div className="flex justify-between items-center mb-1 px-0.5">
                    <span className={`text-[10px] font-bold ${textClass}`}>{pos}</span>
                    <Badge
                      variant="outline"
                      className={`text-[8px] px-1 py-0 h-4 ${
                        pred.risk_level === 'BAJO'
                          ? 'border-green-500 text-green-700'
                          : pred.risk_level === 'MEDIO'
                            ? 'border-yellow-500 text-yellow-700'
                            : pred.risk_level === 'ALTO'
                              ? 'border-orange-500 text-orange-700'
                              : 'border-red-500 text-red-700'
                      }`}
                    >
                      {pred.risk_level}
                    </Badge>
                  </div>
                  <div className={`text-lg font-bold ${textClass}`}>
                    {conf.toFixed(0)}%
                  </div>
                  <div className="text-[10px] text-gray-500">
                    unc: {(unc * 100).toFixed(1)}%
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-4 justify-center text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-green-200 border border-green-500" />
              <span>Seguro (&lt;12%)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-emerald-100 border border-emerald-400" />
              <span>Bajo (12-16%)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-yellow-100 border border-yellow-400" />
              <span>Medio (16-20%)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-orange-100 border border-orange-400" />
              <span>Alto (20-30%)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-red-200 border border-red-500" />
              <span>Muy Alto (&gt;30%)</span>
            </div>
            <div className="flex items-center gap-1 ml-4">
              <div className="w-3 h-3 rounded border-[3px] border-gray-400" />
              <span>Borde grueso = alta incertidumbre</span>
            </div>
          </div>
        </Card>
      )}

      {/* Row 5: Validation Metrics */}
      {status.validation_metrics && Object.keys(status.validation_metrics).length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-bold">Validación Walk-Forward</h3>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Resultados de validación cronológica (sin data leakage)
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(status.validation_metrics).map(([key, value]) => (
              <div
                key={key}
                className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center"
              >
                <div className="text-xs text-gray-500 mb-1">
                  {key.replace(/_/g, ' ')}
                </div>
                <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
                  {typeof value === 'number'
                    ? value < 1
                      ? `${(value * 100).toFixed(1)}%`
                      : value.toFixed(2)
                    : String(value)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Row 6: Training Metrics Details */}
      {status.training_metrics && Object.keys(status.training_metrics).length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-bold">Detalles del Último Entrenamiento</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(status.training_metrics).map(([modelKey, modelMetrics]) => {
              if (typeof modelMetrics !== 'object' || !modelMetrics) return null;
              const label = MODEL_LABELS[modelKey] || modelKey;
              const color = MODEL_COLORS[modelKey] || '#888';

              return (
                <div
                  key={modelKey}
                  className="p-3 rounded-lg border bg-white dark:bg-gray-800"
                  style={{ borderColor: `${color}40` }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-sm font-semibold">{label}</span>
                  </div>
                  <div className="space-y-0.5">
                    {Object.entries(modelMetrics as Record<string, any>)
                      .filter(
                        ([k]) =>
                          !['feature_importance'].includes(k) &&
                          typeof (modelMetrics as any)[k] !== 'object'
                      )
                      .slice(0, 5)
                      .map(([k, v]) => (
                        <div
                          key={k}
                          className="flex justify-between text-[11px] text-gray-600 dark:text-gray-400"
                        >
                          <span>{k.replace(/_/g, ' ')}</span>
                          <span className="font-mono">
                            {typeof v === 'number'
                              ? v < 1 && v > 0
                                ? `${(v * 100).toFixed(1)}%`
                                : v.toFixed(3)
                              : String(v)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
