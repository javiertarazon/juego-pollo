"""Investigar las partidas con multiplier=0.0 y hitBone=false"""
import sqlite3, os
DB = os.path.join(os.path.dirname(__file__), '..', 'db', 'custom.db')
conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row

# Todos los tipos de partida
print("=== DISTRIBUCION POR (hitBone, multiplier) ===")
combos = conn.execute('''
    SELECT hitBone, multiplier, COUNT(*) as cnt
    FROM ChickenGame WHERE isSimulated=0
    GROUP BY hitBone, multiplier
    ORDER BY cnt DESC
''').fetchall()
for c in combos:
    print(f"  hitBone={c['hitBone']}, multiplier={c['multiplier']}: {c['cnt']} partidas")

# Detalle de las x0.0
print("\n=== PARTIDAS hitBone=0, multiplier=0.0 ===")
games = conn.execute('''
    SELECT g.id, g.hitBone, g.multiplier, g.cashOutPosition, g.boneCount, g.createdAt
    FROM ChickenGame g WHERE g.isSimulated=0 AND g.hitBone=0 AND g.multiplier=0.0
    ORDER BY g.createdAt DESC LIMIT 20
''').fetchall()

for g in games:
    gid = g['id']
    revealed = conn.execute(
        'SELECT position, isChicken, revealOrder FROM ChickenPosition WHERE gameId=? AND revealed=1 ORDER BY revealOrder',
        (gid,)
    ).fetchall()
    
    # Separar pollos y huesos en orden
    pollos_before_bone = 0
    first_bone_pos = 0
    first_bone_step = 0
    sequence = []
    for i, r in enumerate(revealed):
        t = "P" if r['isChicken'] else "H"
        sequence.append(f"{r['position']}{t}")
        if not r['isChicken'] and first_bone_pos == 0:
            first_bone_step = i + 1
            first_bone_pos = r['position']
        elif r['isChicken'] and first_bone_pos == 0:
            pollos_before_bone += 1
    
    total_revealed = len(revealed)
    total_pollos = sum(1 for r in revealed if r['isChicken'])
    total_huesos = sum(1 for r in revealed if not r['isChicken'])
    
    print(f"\n  #{gid[-8:]} | cashOut={g['cashOutPosition']} | {total_pollos}P+{total_huesos}H={total_revealed}rev")
    print(f"    1er hueso: paso {first_bone_step}, pos={first_bone_pos}")
    print(f"    Secuencia: {sequence}")

# Comparar con perdidas reales (hitBone=1)
print("\n=== PARTIDAS hitBone=1 (perdidas confirmadas) ===")
losses = conn.execute('''
    SELECT g.id, g.hitBone, g.multiplier, g.cashOutPosition
    FROM ChickenGame g WHERE g.isSimulated=0 AND g.hitBone=1
    ORDER BY g.createdAt DESC LIMIT 5
''').fetchall()

for g in losses:
    gid = g['id']
    revealed = conn.execute(
        'SELECT position, isChicken, revealOrder FROM ChickenPosition WHERE gameId=? AND revealed=1 ORDER BY revealOrder',
        (gid,)
    ).fetchall()
    total_pollos = sum(1 for r in revealed if r['isChicken'])
    total_huesos = sum(1 for r in revealed if not r['isChicken'])
    sequence = []
    for r in revealed:
        t = "P" if r['isChicken'] else "H"
        sequence.append(f"{r['position']}{t}")
    print(f"  #{gid[-8:]} | cashOut={g['cashOutPosition']} | multi={g['multiplier']} | {total_pollos}P+{total_huesos}H")
    print(f"    Secuencia: {sequence}")

# Y las victorias reales
print("\n=== PARTIDAS con ganancia real (multiplier > 0) ===")
wins = conn.execute('''
    SELECT g.id, g.hitBone, g.multiplier, g.cashOutPosition
    FROM ChickenGame g WHERE g.isSimulated=0 AND g.multiplier > 0
    ORDER BY g.createdAt DESC LIMIT 10
''').fetchall()

for g in wins:
    gid = g['id']
    revealed = conn.execute(
        'SELECT position, isChicken, revealOrder FROM ChickenPosition WHERE gameId=? AND revealed=1 ORDER BY revealOrder',
        (gid,)
    ).fetchall()
    total_pollos = sum(1 for r in revealed if r['isChicken'])
    total_huesos = sum(1 for r in revealed if not r['isChicken'])
    sequence = []
    for r in revealed:
        t = "P" if r['isChicken'] else "H"
        sequence.append(f"{r['position']}{t}")
    print(f"  #{gid[-8:]} | multi={g['multiplier']} | cashOut={g['cashOutPosition']} | {total_pollos}P+{total_huesos}H")

# Resumen real
print("\n=== RESUMEN REAL (todas las partidas) ===")
total = conn.execute('SELECT COUNT(*) FROM ChickenGame WHERE isSimulated=0').fetchone()[0]
hit_bone = conn.execute('SELECT COUNT(*) FROM ChickenGame WHERE isSimulated=0 AND hitBone=1').fetchone()[0]
x0_no_hit = conn.execute('SELECT COUNT(*) FROM ChickenGame WHERE isSimulated=0 AND hitBone=0 AND multiplier=0.0').fetchone()[0]
real_wins = conn.execute('SELECT COUNT(*) FROM ChickenGame WHERE isSimulated=0 AND multiplier > 0').fetchone()[0]
print(f"  Total: {total}")
print(f"  hitBone=1 (perdida confirmada): {hit_bone}")
print(f"  hitBone=0, multi=0.0 (DEBERIA ser perdida): {x0_no_hit}")
print(f"  multiplier > 0 (ganancia real): {real_wins}")
print(f"  PERDIDAS REALES: {hit_bone + x0_no_hit} ({(hit_bone+x0_no_hit)/total*100:.1f}%)")
print(f"  VICTORIAS REALES: {real_wins} ({real_wins/total*100:.1f}%)")

conn.close()
