import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/chicken/export - Export real games to CSV
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const boneCount = parseInt(searchParams.get('boneCount') || '3');

    // Get all REAL games (not simulated)
    const games = await db.chickenGame.findMany({
      where: { isSimulated: false },
      include: { positions: true },
      orderBy: { createdAt: 'desc' },
    });

    if (games.length === 0) {
      return NextResponse.json(
        { error: 'No hay partidas reales para exportar' },
        { status: 404 }
      );
    }

    // Create CSV content
    const csvHeaders = [
      'ID_Partida',
      'Fecha',
      'Numero_Huesos',
      'Posiciones_Reveladas',
      'Encontro_Hueso',
      'Posicion_Retiro',
      'Multiplicador',
      'Victoria',
      'Posiciones_Huesos',
      'Posiciones_Pollos_Revelados',
      'Orden_Revelacion'
    ];

    const csvRows = games.map(game => {
      const bonePositions = game.positions
        .filter(p => !p.isChicken)
        .map(p => p.position)
        .sort((a, b) => a - b)
        .join(';');

      const chickenPositions = game.positions
        .filter(p => p.isChicken && p.revealed)
        .map(p => p.position)
        .sort((a, b) => a - b)
        .join(';');

      const revealOrder = game.positions
        .filter(p => p.revealed && p.revealOrder)
        .sort((a, b) => a.revealOrder! - b.revealOrder!)
        .map(p => p.position)
        .join(';');

      const isVictory = !game.hitBone && game.cashOutPosition !== null && game.cashOutPosition >= 4;

      return [
        game.id,
        game.createdAt.toISOString(),
        game.boneCount,
        game.revealedCount,
        game.hitBone ? 'Si' : 'No',
        game.cashOutPosition || 'N/A',
        game.multiplier || 'N/A',
        isVictory ? 'Si' : 'No',
        bonePositions,
        chickenPositions,
        revealOrder
      ].join(',');
    });

    const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');

    // Create response with CSV download
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `chicken_games_${timestamp}.csv`;

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting games:', error);
    return NextResponse.json(
      { error: 'Failed to export games' },
      { status: 500 }
    );
  }
}
