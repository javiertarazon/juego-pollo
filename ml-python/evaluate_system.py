"""
Script de evaluación completa del sistema ML.
Entrena todos los modelos y muestra métricas detalladas.
"""
import sys
import time
import numpy as np
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from loguru import logger
logger.remove()
logger.add(sys.stdout, level="INFO", format="{time:HH:mm:ss} | {level} | {message}")

from models.ensemble import EnsemblePredictor

def main():
    print("=" * 70)
    print("  EVALUACIÓN COMPLETA DEL SISTEMA ML v2.2")
    print("=" * 70)
    
    ensemble = EnsemblePredictor()
    
    # Entrenar
    print("\n🔄 Entrenando todos los modelos...")
    start = time.time()
    metrics = ensemble.train_all()
    elapsed = time.time() - start
    
    if 'error' in metrics:
        print(f"\n❌ Error: {metrics['error']}")
        return
    
    print(f"\n⏱  Tiempo de entrenamiento: {elapsed:.1f}s")
    print(f"📊 Partidas totales: {len(ensemble.bone_matrix)}")
    
    # Métricas por modelo
    print("\n" + "=" * 70)
    print("  MÉTRICAS POR MODELO")
    print("=" * 70)
    
    for model_name, model_metrics in metrics.items():
        if model_name in ('validation', 'feature_selection'):
            continue
        if isinstance(model_metrics, dict) and 'error' not in model_metrics:
            print(f"\n📈 {model_name}:")
            for k, v in model_metrics.items():
                if isinstance(v, float):
                    print(f"   {k}: {v:.4f}")
                elif isinstance(v, (int, str, bool)):
                    print(f"   {k}: {v}")
    
    # Feature Selection
    if ensemble.selected_feature_names:
        print(f"\n🔍 Feature Selection: {len(ensemble.selected_feature_names)} features seleccionadas")
        print(f"   Top 10: {ensemble.selected_feature_names[:10]}")
    
    # Validación
    val = metrics.get('validation', {})
    print("\n" + "=" * 70)
    print("  WALK-FORWARD VALIDATION (test set)")
    print("=" * 70)
    
    n_val = val.get('total_games_validated', 0)
    avg_bones = val.get('avg_bones_identified', 0)
    bone_rate = val.get('bone_identification_rate', 0)
    
    print(f"\n   Partidas validadas: {n_val}")
    print(f"   Huesos identificados: {avg_bones:.2f}/4 ({bone_rate*100:.1f}%)")
    print(f"   Accuracy posición: {val.get('avg_position_accuracy', 0)*100:.1f}%")
    
    # Random baseline
    # Si elegimos 4 posiciones random como peligrosas, esperamos 4*4/25 = 0.64 huesos
    random_bones = 4 * 4 / 25
    print(f"\n   📊 Baseline aleatorio: {random_bones:.2f}/4 ({random_bones/4*100:.1f}%)")
    improvement = (avg_bones - random_bones) / random_bones * 100
    print(f"   📈 Mejora vs aleatorio: {improvement:+.1f}%")
    
    # Win rates simulados
    win_rates = val.get('win_rate_simulated', {})
    if win_rates:
        print(f"\n   🎮 Win rate simulado (evitando top 4 peligrosas del modelo):")
        for k, v in sorted(win_rates.items()):
            clicks = k.split('_')[2]
            # Random baseline for K clicks out of 21 remaining with (4-avg_bones) bones
            print(f"      {clicks} clicks: {v*100:.1f}%")
    
    # Bones in top K
    bones_k = val.get('bones_in_top_k', {})
    if bones_k:
        print(f"\n   🦴 Huesos encontrados en top K peligrosas:")
        for k, v in sorted(bones_k.items()):
            print(f"      {k}: {v:.2f}/4")
    
    # Pesos del ensemble
    print("\n" + "=" * 70)
    print("  PESOS DEL ENSEMBLE")
    print("=" * 70)
    for model, weight in sorted(ensemble.weights.items(), key=lambda x: x[1], reverse=True):
        bar = "█" * int(weight * 50)
        print(f"   {model:20s} {weight:.3f} {bar}")
    
    # Feature importance
    if ensemble.rf.is_trained and ensemble.rf.feature_importances_ is not None:
        feat_names = ensemble.selected_feature_names or []
        if feat_names:
            imp = ensemble.rf.feature_importances_
            pairs = sorted(zip(feat_names, imp), key=lambda x: x[1], reverse=True)
            print(f"\n   🔑 Top 15 Features (Random Forest):")
            for name, importance in pairs[:15]:
                bar = "█" * int(importance * 200)
                print(f"      {name:35s} {importance:.4f} {bar}")
    
    # Conclusión
    print("\n" + "=" * 70)
    print("  CONCLUSIÓN")
    print("=" * 70)
    
    win3 = win_rates.get('win_rate_3_clicks', 0)
    win5 = win_rates.get('win_rate_5_clicks', 0)
    
    if bone_rate > 0.20:  # Mejor que azar (16%)
        print(f"\n   ✅ El sistema identifica {bone_rate*100:.1f}% de huesos (>{16:.0f}% azar)")
        print(f"   ✅ Mejora vs azar: +{improvement:.1f}%")
        if avg_bones >= 0.8:
            print(f"   ✅ Encuentra ~{avg_bones:.2f} huesos de 4 en promedio")
        if win3 >= 0.65:
            print(f"   🏆 WIN RATE 3 CLICKS: {win3*100:.1f}% >= 65% OBJETIVO ALCANZADO")
        if win5 >= 0.40:
            print(f"   🏆 WIN RATE 5 CLICKS: {win5*100:.1f}%")
    else:
        print(f"\n   ⚠️  Rendimiento similar al azar: {bone_rate*100:.1f}% vs 16% azar")
        print(f"   ℹ️  Con RNG criptográfico, es difícil superar el azar.")
    
    # Guardar
    ensemble.save()
    print(f"\n💾 Modelos guardados en saved_models/")
    print("=" * 70)


if __name__ == "__main__":
    main()
