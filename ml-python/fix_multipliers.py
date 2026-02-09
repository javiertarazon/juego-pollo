"""
Corrige los multiplicadores históricos en la BD usando la tabla real de MyStake.
La tabla anterior era incorrecta (empezaba en key 4, valores diferentes).
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'db', 'custom.db')

# Tabla correcta de multiplicadores de MyStake (4 huesos, 21 pollos posibles)
MULTIPLIERS = {
    1: 1.17,
    2: 1.41,
    3: 1.71,
    4: 2.09,
    5: 2.58,
    6: 3.23,
    7: 4.09,
    8: 5.26,
    9: 6.88,
    10: 9.17,
    11: 12.50,
    12: 17.50,
    13: 25.00,
    14: 37.50,
    15: 58.33,
    16: 100.00,
    17: 183.33,
    18: 366.67,
    19: 825.00,
    20: 2062.50,
    21: 6187.50,
}

# Tabla VIEJA incorrecta para referencia
OLD_MULTIPLIERS = {
    4: 1.7, 5: 1.99, 6: 2.34, 7: 2.66, 8: 3.0,
    9: 3.4, 10: 3.84, 11: 4.35, 12: 4.96, 13: 5.65,
    14: 6.44, 15: 7.35, 16: 8.4, 17: 9.6, 18: 10.96,
    19: 12.52, 20: 14.32, 21: 16.37,
}

def fix_multipliers():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 1. Ver estado actual
    print("=" * 60)
    print("ESTADO ACTUAL DE LA BD")
    print("=" * 60)
    
    cursor.execute("""
        SELECT hitBone, cashOutPosition, multiplier, COUNT(*) as cnt
        FROM ChickenGame 
        WHERE isSimulated = 0
        GROUP BY hitBone, cashOutPosition, multiplier
        ORDER BY hitBone, cashOutPosition
    """)
    rows = cursor.fetchall()
    for row in rows:
        print(f"  hitBone={row[0]}, cashOut={row[1]}, mult={row[2]}, count={row[3]}")
    
    # 2. Corregir victorias (hitBone=0, cashOutPosition >= 1)
    print("\n" + "=" * 60)
    print("CORRIGIENDO MULTIPLICADORES DE VICTORIAS")
    print("=" * 60)
    
    cursor.execute("""
        SELECT id, cashOutPosition, multiplier 
        FROM ChickenGame 
        WHERE isSimulated = 0 AND hitBone = 0 AND cashOutPosition > 0
    """)
    victories = cursor.fetchall()
    
    fixed = 0
    for game_id, cashout, old_mult in victories:
        correct_mult = MULTIPLIERS.get(cashout, 0)
        if abs(old_mult - correct_mult) > 0.001:
            print(f"  Game {game_id}: cashOut={cashout}, old_mult={old_mult} -> new_mult={correct_mult}")
            cursor.execute(
                "UPDATE ChickenGame SET multiplier = ? WHERE id = ?",
                (correct_mult, game_id)
            )
            fixed += 1
        else:
            print(f"  Game {game_id}: cashOut={cashout}, mult={old_mult} - OK")
    
    print(f"\nVictorias corregidas: {fixed}/{len(victories)}")
    
    # 3. Verificar derrotas (hitBone=1 debe tener multiplier=0, cashOutPosition=0)
    print("\n" + "=" * 60)
    print("VERIFICANDO DERROTAS")
    print("=" * 60)
    
    cursor.execute("""
        SELECT COUNT(*) FROM ChickenGame 
        WHERE isSimulated = 0 AND hitBone = 1 AND (multiplier != 0 OR cashOutPosition != 0)
    """)
    bad_losses = cursor.fetchone()[0]
    
    if bad_losses > 0:
        print(f"  ⚠️ {bad_losses} derrotas con datos incorrectos. Corrigiendo...")
        cursor.execute("""
            UPDATE ChickenGame SET multiplier = 0, cashOutPosition = 0
            WHERE isSimulated = 0 AND hitBone = 1 AND (multiplier != 0 OR cashOutPosition != 0)
        """)
        print(f"  ✅ {bad_losses} derrotas corregidas")
    else:
        print("  ✅ Todas las derrotas tienen multiplier=0 y cashOutPosition=0")
    
    # 4. Resumen final
    print("\n" + "=" * 60)
    print("ESTADO FINAL")
    print("=" * 60)
    
    cursor.execute("""
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN hitBone = 0 AND cashOutPosition > 0 THEN 1 ELSE 0 END) as victorias,
            SUM(CASE WHEN hitBone = 1 THEN 1 ELSE 0 END) as derrotas
        FROM ChickenGame WHERE isSimulated = 0
    """)
    total, wins, losses = cursor.fetchone()
    print(f"  Total juegos: {total}")
    print(f"  Victorias: {wins}")
    print(f"  Derrotas: {losses}")
    
    cursor.execute("""
        SELECT cashOutPosition, multiplier, COUNT(*) 
        FROM ChickenGame 
        WHERE isSimulated = 0 AND hitBone = 0 AND cashOutPosition > 0
        GROUP BY cashOutPosition, multiplier
        ORDER BY cashOutPosition
    """)
    print("\n  Victorias por cashOutPosition:")
    for cashout, mult, cnt in cursor.fetchall():
        expected = MULTIPLIERS.get(cashout, 0)
        status = "✅" if abs(mult - expected) < 0.001 else "❌"
        print(f"    {status} cashOut={cashout}: mult={mult} (expected={expected}) x{cnt}")
    
    conn.commit()
    conn.close()
    print("\n✅ Corrección completada y guardada")

if __name__ == "__main__":
    fix_multipliers()
