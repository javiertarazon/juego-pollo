"""
Re-evaluación del modelo ML con datos corregidos.
Ahora que hitBone está correcto, evaluamos la precisión real del modelo.
"""
import sqlite3
import os
import json
import requests

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'db', 'custom.db')
ML_URL = "http://127.0.0.1:8100"

conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row

# === 1. RESUMEN DE DATOS CORREGIDOS ===
print("=" * 60)
print("RESUMEN DE DATOS CORREGIDOS")
print("=" * 60)

cur = conn.cursor()
cur.execute("""
    SELECT COUNT(*) as total,
           SUM(CASE WHEN hitBone = 1 THEN 1 ELSE 0 END) as perdidas,
           SUM(CASE WHEN multiplier > 0 THEN 1 ELSE 0 END) as victorias
    FROM ChickenGame WHERE isSimulated = 0
""")
r = cur.fetchone()
print(f"Total partidas: {r['total']}")
print(f"Pérdidas: {r['perdidas']} ({100*r['perdidas']/r['total']:.1f}%)")
print(f"Victorias: {r['victorias']} ({100*r['victorias']/r['total']:.1f}%)")
print(f"Win rate: {100*r['victorias']/r['total']:.1f}%")

# Tasa teórica de victoria con 4 huesos y cashout a 4+ pollos
# P(4 pollos sin hueso) = C(21,4)/C(25,4) = 5985/12650 ≈ 47.3% para llegar a cashout mínimo
print(f"Tasa teorica para 4+ pollos sin hueso: ~47.3%")
print(f"Tu tasa real: {100*r['victorias']/r['total']:.1f}% ({'MEJOR' if r['victorias']/r['total'] > 0.473 else 'PEOR'} que aleatorio)")

# === 2. ANÁLISIS DE LAS ÚLTIMAS 30 PARTIDAS ===
print("\n" + "=" * 60)
print("ÚLTIMAS 30 PARTIDAS (CORREGIDAS)")
print("=" * 60)

cur.execute("""
    SELECT g.id, g.hitBone, g.multiplier, g.cashOutPosition, g.createdAt
    FROM ChickenGame g
    WHERE g.isSimulated = 0
    ORDER BY g.createdAt DESC
    LIMIT 30
""")
games = cur.fetchall()
wins = sum(1 for g in games if g['multiplier'] > 0)
losses = sum(1 for g in games if g['hitBone'] == 1)
print(f"Victorias: {wins}/30 ({100*wins/30:.1f}%)")
print(f"Pérdidas: {losses}/30 ({100*losses/30:.1f}%)")

# === 3. ANÁLISIS DE POSICIONES DONDE SE ENCONTRARON HUESOS ===
print("\n" + "=" * 60)
print("POSICIONES DE HUESOS - ÚLTIMAS 30 PARTIDAS")
print("=" * 60)

cur.execute("""
    SELECT rbp.posiciones
    FROM ChickenGame g
    JOIN RealBonePositions rbp ON rbp.gameId = g.id
    WHERE g.isSimulated = 0
    ORDER BY g.createdAt DESC
    LIMIT 30
""")
from collections import Counter
bone_counter = Counter()
for row in cur.fetchall():
    positions = json.loads(row['posiciones'])
    for p in positions:
        bone_counter[p] += 1

print(f"{'Pos':>4} | {'Veces hueso':>12} | {'%':>6} | {'vs 16%':>8}")
print("-" * 45)
expected = 30 * 4 / 25  # 4 huesos por partida, 25 posiciones
for pos in range(1, 26):
    count = bone_counter.get(pos, 0)
    pct = 100 * count / 30
    ratio = pct / 16.0
    marker = " [!]" if pct > 25 else (" [OK]" if pct < 10 else "")
    print(f"{pos:>4} | {count:>12} | {pct:>5.1f}% | {ratio:>6.2f}x{marker}")

# === 4. CONSULTAR PREDICCIÓN ACTUAL DEL MODELO ===
print("\n" + "=" * 60)
print("PREDICCIÓN ACTUAL DEL MODELO")
print("=" * 60)

try:
    resp = requests.post(f"{ML_URL}/predict", json={"discovered_positions": [], "game_number": 183}, timeout=30)
    if resp.ok:
        data = resp.json()
        safe = [p['position'] for p in data.get('safe_positions', [])]
        dangerous = [p['position'] for p in data.get('dangerous_positions', [])]
        print(f"Posiciones seguras: {safe}")
        print(f"Posiciones peligrosas: {dangerous}")
        
        # Detalles
        for p in data.get('safe_positions', []):
            pos = p['position']
            bp = p.get('bone_probability', 0)
            conf = p.get('confidence', 0)
            real = bone_counter.get(pos, 0)
            print(f"  SEGURA Pos {pos}: bone_prob={bp:.4f}, conf={conf:.1f}%, real_hueso={real}/30 ({100*real/30:.1f}%)")
        
        for p in data.get('dangerous_positions', []):
            pos = p['position']
            bp = p.get('bone_probability', 0)
            conf = p.get('confidence', 0)
            real = bone_counter.get(pos, 0)
            print(f"  PELIGRO Pos {pos}: bone_prob={bp:.4f}, conf={conf:.1f}%, real_hueso={real}/30 ({100*real/30:.1f}%)")
        
        # Verificar cuántas de las "seguras" fueron hueso en últimas 30
        safe_as_bone = {p: bone_counter.get(p, 0) for p in safe if bone_counter.get(p, 0) > 0}
        if safe_as_bone:
            print(f"\n[!] Posiciones 'seguras' que fueron hueso en ultimas 30:")
            for p, c in sorted(safe_as_bone.items(), key=lambda x: -x[1]):
                print(f"  Pos {p}: hueso {c} veces ({100*c/30:.1f}%)")
        else:
            print(f"\n[OK] Ninguna posicion 'segura' fue hueso frecuente")
    else:
        print(f"Error en predicción: {resp.status_code}")
except Exception as e:
    print(f"ML no disponible: {e}")

# === 5. EVALUACIÓN: MODELO vs ÚLTIMAS 30 PARTIDAS ===
print("\n" + "=" * 60)
print("EVALUACIÓN MODELO vs DATOS REALES")
print("=" * 60)

# Para cada partida de las últimas 30, ver si las posiciones sugeridas como 
# "seguras" coinciden con posiciones sin hueso
cur.execute("""
    SELECT g.id, g.hitBone, g.multiplier, g.cashOutPosition,
           rbp.posiciones as bone_positions
    FROM ChickenGame g
    JOIN RealBonePositions rbp ON rbp.gameId = g.id
    WHERE g.isSimulated = 0
    ORDER BY g.createdAt DESC
    LIMIT 30
""")

try:
    resp = requests.post(f"{ML_URL}/predict", json={"discovered_positions": [], "game_number": 183}, timeout=30)
    if resp.ok:
        prediction = resp.json()
        safe = set(p['position'] for p in prediction.get('safe_positions', []))
        
        hit_in_safe = 0
        miss_in_safe = 0
        total = 0
        
        for row in cur.fetchall():
            bones = set(json.loads(row['bone_positions']))
            overlap = safe & bones
            total += 1
            if overlap:
                hit_in_safe += 1
            else:
                miss_in_safe += 1
        
        print(f"De {total} partidas, las posiciones 'seguras' actuales:")
        print(f"  Contenían al menos 1 hueso: {hit_in_safe} ({100*hit_in_safe/total:.1f}%)")
        print(f"  Sin huesos (predicción correcta): {miss_in_safe} ({100*miss_in_safe/total:.1f}%)")
        
        # Cuántos huesos en promedio caen en zona "segura"
        cur.execute("""
            SELECT rbp.posiciones
            FROM ChickenGame g
            JOIN RealBonePositions rbp ON rbp.gameId = g.id
            WHERE g.isSimulated = 0
            ORDER BY g.createdAt DESC
            LIMIT 30
        """)
        bones_in_safe_total = 0
        for row in cur.fetchall():
            bones = set(json.loads(row['posiciones']))
            bones_in_safe_total += len(safe & bones)
        
        avg_bones_in_safe = bones_in_safe_total / 30
        expected_random = len(safe) * 4 / 25  # Si fuera aleatorio
        print(f"\n  Huesos promedio en zona segura: {avg_bones_in_safe:.2f}")
        print(f"  Esperado aleatorio ({len(safe)} pos): {expected_random:.2f}")
        print(f"  Ratio vs aleatorio: {avg_bones_in_safe/expected_random:.2f}x ({'MEJOR' if avg_bones_in_safe < expected_random else 'PEOR'})")
except Exception as e:
    print(f"No se pudo evaluar: {e}")

conn.close()
print(f"\n[OK] Evaluacion completada")
