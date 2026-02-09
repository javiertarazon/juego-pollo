"""
restore_victories.py
====================
Restaura las 83 victorias que fix_hitbone_db.py corrompió erróneamente.

CONTEXTO:
- fix_hitbone_db.py cambió 83 victorias reales (hitBone=0, mult=0) a derrotas (hitBone=1)
- Esas 83 victorias tenían multiplier=0 porque la vieja tabla MULTIPLIERS no tenía entradas para cashOut 1-3
- El frontend siempre envió hitBone: !isWithdraw correctamente

METODOLOGÍA DE IDENTIFICACIÓN:
1. minRevealOrder=1: Las victorias se guardaron con indexación 1-based (8/8 confirmadas)
2. Huesos ascendentes: En victoria, MyStake revela 4 huesos en orden posición (7/8 = 87.5%)
3. revealedCount 5-7: cashOut 1-3 → revealedCount = cashOut + 4 = 5, 6, 7

Criterio combinado (alta confianza): minRO=1 AND ascending AND rc∈{5,6,7} → 76 juegos
+ 7 juegos adicionales de minRO=1 AND NOT ascending AND rc∈{5,6,7} (priorizando rc=7)
= 83 juegos restaurados → 91 victorias total (50% win rate)
"""
import sqlite3
import os
import shutil
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'db', 'custom.db')
BACKUP_PATH = DB_PATH + f'.backup-{datetime.now().strftime("%Y%m%d-%H%M%S")}'

# Tabla de multiplicadores correcta de MyStake (modo 4 huesos, 21 pollos)
# Fuente: src/app/api/chicken/result/route.ts
MULTIPLIERS = {
    1: 1.17, 2: 1.41, 3: 1.71, 4: 2.09, 5: 2.58,
    6: 3.23, 7: 4.09, 8: 5.26, 9: 6.88, 10: 9.17,
    11: 12.50, 12: 17.50, 13: 25.00, 14: 37.50, 15: 58.33,
    16: 100.00, 17: 183.33, 18: 366.67, 19: 825.00, 20: 2062.50, 21: 6187.50,
}

def get_bone_pattern(cur, game_id):
    """Obtiene el patrón de huesos revelados y si están en orden ascendente."""
    bones = cur.execute("""
        SELECT position, revealOrder 
        FROM ChickenPosition 
        WHERE gameId = ? AND revealed = 1 AND isChicken = 0
        ORDER BY revealOrder
    """, (game_id,)).fetchall()
    if len(bones) < 4:
        return False, []
    positions = [b['position'] for b in bones]
    ascending = all(positions[i] < positions[i+1] for i in range(len(positions)-1))
    return ascending, positions

def main():
    # Backup
    print(f"Creando backup: {os.path.basename(BACKUP_PATH)}")
    shutil.copy2(DB_PATH, BACKUP_PATH)
    
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    
    # Estado ANTES
    print("\n=== ESTADO ANTES ===")
    cur.execute("""
        SELECT hitBone, COUNT(*) as cnt FROM ChickenGame 
        WHERE isSimulated = 0 GROUP BY hitBone
    """)
    for r in cur.fetchall():
        label = "DERROTAS" if r['hitBone'] else "VICTORIAS"
        print(f"  {label} (hitBone={r['hitBone']}): {r['cnt']}")
    
    # PASO 1: Identificar candidatos de alta confianza
    # minRevealOrder=1 AND huesos ascendentes AND revealedCount in (5,6,7)
    cur.execute("""
        SELECT id, revealedCount, boneCount FROM ChickenGame 
        WHERE isSimulated = 0 AND hitBone = 1 AND revealedCount IN (5, 6, 7)
    """)
    
    high_confidence = []  # (game_id, rc, cashOut)
    low_confidence = []   # (game_id, rc, cashOut)
    
    for g in cur.fetchall():
        gid = g['id']
        rc = g['revealedCount']
        bone_count = g['boneCount']
        cash_out = rc - bone_count  # cashOutPosition = revealedCount - boneCount
        
        # Check minRevealOrder
        min_ro = cur.execute(
            "SELECT MIN(revealOrder) as mro FROM ChickenPosition WHERE gameId = ? AND revealed = 1",
            (gid,)
        ).fetchone()['mro']
        
        if min_ro != 1:
            continue  # Solo minRO=1 (era del código con hitBone correcto)
        
        # Check ascending bones
        ascending, _ = get_bone_pattern(cur, gid)
        
        if ascending:
            high_confidence.append((gid, rc, cash_out))
        else:
            low_confidence.append((gid, rc, cash_out))
    
    print(f"\n=== CANDIDATOS IDENTIFICADOS ===")
    print(f"  Alta confianza (minRO=1 + ascending): {len(high_confidence)}")
    print(f"  Baja confianza (minRO=1 + NOT ascending): {len(low_confidence)}")
    
    # PASO 2: Seleccionar 83 juegos
    needed = 83
    to_restore = list(high_confidence)  # Todos los de alta confianza
    
    remaining = needed - len(to_restore)
    if remaining > 0:
        # Priorizar rc=7 (más juegos = más probabilidad de ser victoria)
        low_sorted = sorted(low_confidence, key=lambda x: -x[1])  # rc=7 primero
        to_restore.extend(low_sorted[:remaining])
        print(f"  Adicionales seleccionados: {remaining} (de baja confianza, priorizando rc=7)")
    
    print(f"  TOTAL a restaurar: {len(to_restore)}")
    
    # Distribución por cashOut
    by_cashout = {}
    for _, rc, co in to_restore:
        by_cashout[co] = by_cashout.get(co, 0) + 1
    for co in sorted(by_cashout.keys()):
        mult = MULTIPLIERS.get(co, 0)
        print(f"    cashOut={co} (mult={mult}): {by_cashout[co]} juegos")
    
    # PASO 3: Restaurar
    print(f"\n=== RESTAURANDO {len(to_restore)} VICTORIAS ===")
    restored = 0
    for gid, rc, cash_out in to_restore:
        multiplier = MULTIPLIERS.get(cash_out, 0)
        cur.execute("""
            UPDATE ChickenGame 
            SET hitBone = 0, cashOutPosition = ?, multiplier = ?
            WHERE id = ?
        """, (cash_out, multiplier, gid))
        restored += 1
    
    conn.commit()
    print(f"  Restauradas: {restored} partidas")
    
    # Estado DESPUÉS
    print(f"\n=== ESTADO DESPUÉS ===")
    cur.execute("""
        SELECT hitBone, COUNT(*) as cnt, 
               SUM(CASE WHEN multiplier > 0 THEN 1 ELSE 0 END) as with_mult
        FROM ChickenGame WHERE isSimulated = 0 GROUP BY hitBone
    """)
    total = 0
    victories = 0
    for r in cur.fetchall():
        total += r['cnt']
        label = "DERROTAS" if r['hitBone'] else "VICTORIAS"
        if not r['hitBone']:
            victories = r['cnt']
        print(f"  {label} (hitBone={r['hitBone']}): {r['cnt']} (con multiplier>0: {r['with_mult']})")
    
    win_rate = victories / total * 100 if total > 0 else 0
    print(f"\n  Win Rate: {victories}/{total} = {win_rate:.1f}%")
    
    # Verificación de multiplicadores correctos
    print(f"\n=== VERIFICACIÓN DE MULTIPLICADORES ===")
    cur.execute("""
        SELECT cashOutPosition, multiplier, COUNT(*) as cnt
        FROM ChickenGame 
        WHERE isSimulated = 0 AND hitBone = 0
        GROUP BY cashOutPosition, multiplier
        ORDER BY cashOutPosition
    """)
    for r in cur.fetchall():
        expected = MULTIPLIERS.get(r['cashOutPosition'], 0)
        ok = "OK" if abs(r['multiplier'] - expected) < 0.01 else f"MISMATCH (expected {expected})"
        print(f"  cashOut={r['cashOutPosition']}: mult={r['multiplier']} x{r['cnt']} - {ok}")
    
    conn.close()
    print(f"\n=== COMPLETADO ===")
    print(f"Backup guardado en: {os.path.basename(BACKUP_PATH)}")

if __name__ == '__main__':
    main()
