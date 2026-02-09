"""
Corrige los registros de partidas con hitBone=0 y multiplier=0.0
que en realidad son PÉRDIDAS (el jugador encontró un hueso).
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'db', 'custom.db')

conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

# Verificar estado ANTES
print("=== ESTADO ANTES DE LA CORRECCIÓN ===")
cur.execute("""
    SELECT hitBone, 
           CASE WHEN multiplier > 0 THEN 'multi>0' ELSE 'multi=0' END as multi_cat,
           COUNT(*) as cnt
    FROM ChickenGame 
    WHERE isSimulated = 0
    GROUP BY hitBone, multi_cat
    ORDER BY hitBone, multi_cat
""")
for row in cur.fetchall():
    print(f"  hitBone={row['hitBone']}, {row['multi_cat']}: {row['cnt']} partidas")

# Contar afectados
cur.execute("""
    SELECT COUNT(*) as cnt FROM ChickenGame 
    WHERE isSimulated = 0 AND hitBone = 0 AND multiplier = 0.0
""")
affected = cur.fetchone()['cnt']
print(f"\n  Registros a corregir: {affected}")

# Corregir: hitBone=0, multiplier=0.0 → hitBone=1, cashOutPosition=0
cur.execute("""
    UPDATE ChickenGame 
    SET hitBone = 1, cashOutPosition = 0
    WHERE isSimulated = 0 AND hitBone = 0 AND multiplier = 0.0
""")
conn.commit()
print(f"  ✅ Corregidos {cur.rowcount} registros")

# Verificar estado DESPUÉS
print("\n=== ESTADO DESPUÉS DE LA CORRECCIÓN ===")
cur.execute("""
    SELECT hitBone, 
           CASE WHEN multiplier > 0 THEN 'multi>0' ELSE 'multi=0' END as multi_cat,
           COUNT(*) as cnt
    FROM ChickenGame 
    WHERE isSimulated = 0
    GROUP BY hitBone, multi_cat
    ORDER BY hitBone, multi_cat
""")
for row in cur.fetchall():
    print(f"  hitBone={row['hitBone']}, {row['multi_cat']}: {row['cnt']} partidas")

# Resumen final
cur.execute("""
    SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN hitBone = 1 THEN 1 ELSE 0 END) as perdidas,
        SUM(CASE WHEN hitBone = 0 AND multiplier > 0 THEN 1 ELSE 0 END) as victorias
    FROM ChickenGame WHERE isSimulated = 0
""")
r = cur.fetchone()
print(f"\n=== RESUMEN FINAL ===")
print(f"  Total partidas reales: {r['total']}")
print(f"  Pérdidas (hitBone=1): {r['perdidas']} ({100*r['perdidas']/r['total']:.1f}%)")
print(f"  Victorias (multi>0): {r['victorias']} ({100*r['victorias']/r['total']:.1f}%)")

conn.close()
