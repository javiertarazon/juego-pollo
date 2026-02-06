import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'detailed';
    const limit = parseInt(searchParams.get('limit') || '1000');
    const includeSimulated = searchParams.get('includeSimulated') === 'true';

    // Por defecto solo partidas reales con 4 huesos para análisis y entrenamiento ML
    const games = await db.chickenGame.findMany({
      where: includeSimulated ? undefined : { 
        isSimulated: false,
        boneCount: 4 // Solo partidas con 4 huesos
      },
      include: {
        positions: {
          orderBy: { position: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
      // Sin take: para obtener TODAS las partidas reales con 4 huesos
    });

    let csvContent = '';
    let filename = '';

    switch (format) {
      case 'detailed':
        csvContent = generateDetailedCSV(games);
        filename = 'chicken_games_detailed.csv';
        break;
      
      case 'positions':
        csvContent = generatePositionsCSV(games);
        filename = 'chicken_positions.csv';
        break;
      
      case 'sequences':
        csvContent = generateSequencesCSV(games);
        filename = 'chicken_sequences.csv';
        break;
      
      case 'patterns':
        csvContent = generatePatternsCSV(games);
        filename = 'chicken_patterns.csv';
        break;
      
      case 'ml_training':
        csvContent = generateMLTrainingCSV(games);
        filename = 'chicken_ml_training.csv';
        break;
      
      default:
        csvContent = generateDetailedCSV(games);
        filename = 'chicken_games.csv';
    }

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('Error exporting CSV:', error);
    return NextResponse.json(
      { error: 'Failed to export CSV' },
      { status: 500 }
    );
  }
}

function generateDetailedCSV(games: any[]): string {
  const headers = [
    'game_id',
    'created_at',
    'bone_count',
    'revealed_count',
    'hit_bone',
    'cash_out_position',
    'multiplier',
    'is_simulated',
    'bone_positions',
    'chicken_positions',
    'revealed_sequence',
    'first_position',
    'last_position',
    'game_duration_positions',
    'success_rate',
    'risk_level'
  ];

  const rows = games.map(game => {
    const bonePositions = game.positions
      .filter((p: any) => !p.isChicken)
      .map((p: any) => p.position)
      .sort((a: number, b: number) => a - b);
    
    const chickenPositions = game.positions
      .filter((p: any) => p.isChicken)
      .map((p: any) => p.position)
      .sort((a: number, b: number) => a - b);
    
      const revealedSequence = game.positions
        .filter((p: any) => p.revealed && p.revealOrder > 0)
        .sort((a: any, b: any) => (a.revealOrder || 0) - (b.revealOrder || 0))
        .map((p: any) => p.position);

    const firstPosition = revealedSequence.length > 0 ? revealedSequence[0] : null;
    const lastPosition = revealedSequence.length > 0 ? revealedSequence[revealedSequence.length - 1] : null;
    const successRate = game.revealedCount > 0 ? (revealedSequence.filter((pos: number) => chickenPositions.includes(pos)).length / game.revealedCount) : 0;
    const riskLevel = game.revealedCount >= 10 ? 'HIGH' : game.revealedCount >= 5 ? 'MEDIUM' : 'LOW';

    return [
      game.id,
      game.createdAt.toISOString(),
      game.boneCount,
      game.revealedCount,
      game.hitBone,
      game.cashOutPosition || '',
      game.multiplier || '',
      game.isSimulated,
      `"${bonePositions.join(',')}"`,
      `"${chickenPositions.join(',')}"`,
      `"${revealedSequence.join(',')}"`,
      firstPosition || '',
      lastPosition || '',
      revealedSequence.length,
      successRate.toFixed(3),
      riskLevel
    ];
  });

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

function generatePositionsCSV(games: any[]): string {
  const headers = [
    'game_id',
    'position',
    'is_chicken',
    'is_bone',
    'revealed',
    'reveal_order',
    'position_in_sequence',
    'game_bone_count',
    'game_created_at'
  ];

  const rows: any[] = [];
  
  games.forEach(game => {
    game.positions.forEach((pos: any) => {
      rows.push([
        game.id,
        pos.position,
        pos.isChicken,
        !pos.isChicken,
        pos.revealed,
        pos.revealOrder || '',
        pos.revealOrder ? `${pos.revealOrder}/${game.revealedCount}` : '',
        game.boneCount,
        game.createdAt.toISOString()
      ]);
    });
  });

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

function generateSequencesCSV(games: any[]): string {
  const headers = [
    'game_id',
    'sequence_length',
    'sequence_positions',
    'sequence_results',
    'bone_count',
    'hit_bone',
    'success_positions',
    'fail_position',
    'pattern_2',
    'pattern_3',
    'pattern_4',
    'created_at'
  ];

  const rows = games.map(game => {
      const revealedPositions = game.positions
        .filter((p: any) => p.revealed && p.revealOrder > 0)
        .sort((a: any, b: any) => (a.revealOrder || 0) - (b.revealOrder || 0));

    const sequence = revealedPositions.map((p: any) => p.position);
    const results = revealedPositions.map((p: any) => p.isChicken ? 'C' : 'B');
    
    const successPositions = revealedPositions
      .filter((p: any) => p.isChicken)
      .map((p: any) => p.position);
    
    const failPosition = revealedPositions
      .find((p: any) => !p.isChicken)?.position || '';

    // Generar patrones de diferentes longitudes
    const pattern2 = sequence.length >= 2 ? sequence.slice(0, 2).join('-') : '';
    const pattern3 = sequence.length >= 3 ? sequence.slice(0, 3).join('-') : '';
    const pattern4 = sequence.length >= 4 ? sequence.slice(0, 4).join('-') : '';

    return [
      game.id,
      sequence.length,
      `"${sequence.join(',')}"`,
      `"${results.join(',')}"`,
      game.boneCount,
      game.hitBone,
      `"${successPositions.join(',')}"`,
      failPosition,
      pattern2,
      pattern3,
      pattern4,
      game.createdAt.toISOString()
    ];
  });

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

function generatePatternsCSV(games: any[]): string {
  const headers = [
    'pattern',
    'pattern_length',
    'frequency',
    'success_rate',
    'next_positions',
    'next_success_rate',
    'bone_count',
    'sample_games'
  ];

  // Analizar patrones
  const patternMap = new Map<string, {
    frequency: number;
    successes: number;
    nextPositions: number[];
    nextSuccesses: number;
    boneCount: number;
    gameIds: number[];
  }>();

  games.forEach(game => {
    const revealedPositions = game.positions
      .filter((p: any) => p.revealed && p.revealOrder > 0)
      .sort((a: any, b: any) => (a.revealOrder || 0) - (b.revealOrder || 0));

    // Generar patrones de longitud 2, 3, 4
    for (let length = 2; length <= 4; length++) {
      for (let i = 0; i <= revealedPositions.length - length; i++) {
        const patternPositions = revealedPositions.slice(i, i + length);
        const pattern = patternPositions.map((p: any) => p.position).join('-');
        
        if (!patternMap.has(pattern)) {
          patternMap.set(pattern, {
            frequency: 0,
            successes: 0,
            nextPositions: [],
            nextSuccesses: 0,
            boneCount: game.boneCount,
            gameIds: []
          });
        }

        const patternData = patternMap.get(pattern)!;
        patternData.frequency++;
        patternData.gameIds.push(game.id);

        // Verificar si el patrón fue exitoso (todos pollos)
        const allChickens = patternPositions.every((p: any) => p.isChicken);
        if (allChickens) {
          patternData.successes++;
        }

        // Si hay una posición siguiente, registrarla
        if (i + length < revealedPositions.length) {
          const nextPos = revealedPositions[i + length];
          patternData.nextPositions.push(nextPos.position);
          if (nextPos.isChicken) {
            patternData.nextSuccesses++;
          }
        }
      }
    }
  });

  const rows = Array.from(patternMap.entries()).map(([pattern, data]) => {
    const successRate = data.frequency > 0 ? (data.successes / data.frequency) : 0;
    const nextSuccessRate = data.nextPositions.length > 0 ? (data.nextSuccesses / data.nextPositions.length) : 0;
    
    return [
      pattern,
      pattern.split('-').length,
      data.frequency,
      successRate.toFixed(3),
      `"${data.nextPositions.join(',')}"`,
      nextSuccessRate.toFixed(3),
      data.boneCount,
      `"${data.gameIds.slice(0, 10).join(',')}"` // Primeros 10 game IDs
    ];
  });

  // Ordenar por frecuencia descendente
  rows.sort((a, b) => (b[2] as number) - (a[2] as number));

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

function generateMLTrainingCSV(games: any[]): string {
  const headers = [
    'game_id',
    'position',
    'is_target',
    'reveal_order',
    'bone_count',
    'total_revealed',
    'previous_positions',
    'previous_results',
    'position_frequency',
    'zone',
    'is_safe_position',
    'distance_from_center',
    'adjacent_positions',
    'corner_position',
    'edge_position',
    'result'
  ];

  const rows: any[] = [];
  
  // Posiciones siempre seguras
  const safePositions = [4, 7, 10, 13, 14, 15, 17, 18, 19, 20, 21, 23];
  
  // Definir zonas
  const zoneA = [1, 2, 3, 4, 5, 11, 12, 13, 14, 15];
  const zoneB = [16, 17, 18, 19, 20, 21, 22, 23, 24, 25];

  games.forEach(game => {
    const revealedPositions = game.positions
      .filter((p: any) => p.revealed && p.revealOrder > 0)
      .sort((a: any, b: any) => (a.revealOrder || 0) - (b.revealOrder || 0));

    revealedPositions.forEach((pos: any, index: number) => {
      const previousPositions = revealedPositions.slice(0, index).map((p: any) => p.position);
      const previousResults = revealedPositions.slice(0, index).map((p: any) => p.isChicken ? 1 : 0);
      
      // Calcular características de la posición
      const zone = zoneA.includes(pos.position) ? 'A' : 'B';
      const isSafePosition = safePositions.includes(pos.position);
      const distanceFromCenter = Math.abs(pos.position - 13); // Centro aproximado
      
      // Posiciones adyacentes (en grid 5x5)
      const row = Math.floor((pos.position - 1) / 5);
      const col = (pos.position - 1) % 5;
      const adjacentPositions: number[] = [];
      
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const newRow = row + dr;
          const newCol = col + dc;
          if (newRow >= 0 && newRow < 5 && newCol >= 0 && newCol < 5) {
            adjacentPositions.push(newRow * 5 + newCol + 1);
          }
        }
      }

      const isCorner = [1, 5, 21, 25].includes(pos.position);
      const isEdge = [1, 2, 3, 4, 5, 6, 10, 11, 15, 16, 20, 21, 22, 23, 24, 25].includes(pos.position);

      const adjacentPositionsStr = adjacentPositions.join(',');

      rows.push([
        game.id,
        pos.position,
        index === 0 ? 1 : 0, // Es la primera posición (target)
        pos.revealOrder,
        game.boneCount,
        game.revealedCount,
        `"${previousPositions.join(',')}"`,
        `"${previousResults.join(',')}"`,
        previousPositions.filter(p => p === pos.position).length, // Frecuencia de esta posición
        zone,
        isSafePosition ? 1 : 0,
        distanceFromCenter,
        `"${adjacentPositionsStr}"`,
        isCorner ? 1 : 0,
        isEdge ? 1 : 0,
        pos.isChicken ? 1 : 0 // Resultado: 1 = pollo, 0 = hueso
      ]);
    });
  });

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}