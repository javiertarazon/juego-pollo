// Script para comparar resultados entre fases de optimización
import { db } from '@/lib/db';

interface FaseAnalisis {
  nombre: string;
  fechaInicio: Date;
  fechaFin: Date;
  totalPartidas: number;
  victorias: number;
  derrotas: number;
  tasaExito: number;
  rachaMaxVictorias: number;
  rachaMaxDerrotas: number;
  posicionesMasUsadas: Array<{
    posicion: number;
    usos: number;
    exito: number;
  }>;
}

async function analizarFase(
  fechaInicio: Date,
  fechaFin: Date,
  nombre: string
): Promise<FaseAnalisis> {
  const partidas = await db.chickenGame.findMany({
    where: {
      isSimulated: false,
      createdAt: {
        gte: fechaInicio,
        lte: fechaFin,
      },
    },
    orderBy: { createdAt: 'desc' },
    include: { positions: true },
  });

  const victorias = partidas.filter((p) => !p.hitBone).length;
  const derrotas = partidas.length - victorias;
  const tasaExito = (victorias / partidas.length) * 100;

  // Calcular rachas
  let rachaActualVictorias = 0;
  let rachaActualDerrotas = 0;
  let rachaMaxVictorias = 0;
  let rachaMaxDerrotas = 0;

  partidas.forEach((partida) => {
    if (!partida.hitBone) {
      rachaActualVictorias++;
      rachaActualDerrotas = 0;
      rachaMaxVictorias = Math.max(rachaMaxVictorias, rachaActualVictorias);
    } else {
      rachaActualDerrotas++;
      rachaActualVictorias = 0;
      rachaMaxDerrotas = Math.max(rachaMaxDerrotas, rachaActualDerrotas);
    }
  });

  // Analizar posiciones más usadas
  const posicionesMap = new Map<
    number,
    { usos: number; victorias: number }
  >();

  partidas.forEach((partida) => {
    const primeraPos = partida.positions
      .filter((p) => p.revealed && p.revealOrder !== null)
      .sort((a, b) => (a.revealOrder || 0) - (b.revealOrder || 0))[0];

    if (primeraPos) {
      const pos = primeraPos.position;
      if (!posicionesMap.has(pos)) {
        posicionesMap.set(pos, { usos: 0, victorias: 0 });
      }
      const data = posicionesMap.get(pos)!;
      data.usos++;
      if (primeraPos.isChicken) {
        data.victorias++;
      }
    }
  });

  const posicionesMasUsadas = Array.from(posicionesMap.entries())
    .map(([pos, data]) => ({
      posicion: pos,
      usos: data.usos,
      exito: (data.victorias / data.usos) * 100,
    }))
    .sort((a, b) => b.usos - a.usos)
    .slice(0, 5);

  return {
    nombre,
    fechaInicio,
    fechaFin,
    totalPartidas: partidas.length,
    victorias,
    derrotas,
    tasaExito,
    rachaMaxVictorias,
    rachaMaxDerrotas,
    posicionesMasUsadas,
  };
}

async function main() {
  console.log('🔍 ===== COMPARACIÓN DE FASES DE OPTIMIZACIÓN =====\n');

  // Obtener todas las partidas para determinar rangos de fechas
  const todasPartidas = await db.chickenGame.findMany({
    where: { isSimulated: false },
    orderBy: { createdAt: 'asc' },
    select: { createdAt: true },
  });

  if (todasPartidas.length < 60) {
    console.log(
      '⚠️  No hay suficientes partidas para comparar fases (mínimo 60)'
    );
    return;
  }

  // Dividir en 3 fases de 30 partidas cada una
  const fase1Partidas = todasPartidas.slice(0, 30);
  const fase2Partidas = todasPartidas.slice(30, 60);
  const fase3Partidas = todasPartidas.slice(60, 90);

  const fases: FaseAnalisis[] = [];

  // Analizar Fase 1 (primeras 30)
  if (fase1Partidas.length === 30) {
    const fase1 = await analizarFase(
      fase1Partidas[0].createdAt,
      fase1Partidas[29].createdAt,
      'FASE 1 - Inicial'
    );
    fases.push(fase1);
  }

  // Analizar Fase 2 (siguientes 30)
  if (fase2Partidas.length === 30) {
    const fase2 = await analizarFase(
      fase2Partidas[0].createdAt,
      fase2Partidas[29].createdAt,
      'FASE 2 - Post Optimización 1'
    );
    fases.push(fase2);
  }

  // Analizar Fase 3 (últimas 30)
  if (fase3Partidas.length >= 30) {
    const fase3 = await analizarFase(
      fase3Partidas[0].createdAt,
      fase3Partidas[Math.min(29, fase3Partidas.length - 1)].createdAt,
      'FASE 3 - Post Optimización 2'
    );
    fases.push(fase3);
  }

  // Mostrar comparación
  console.log('📊 ===== COMPARACIÓN DE RESULTADOS =====\n');

  fases.forEach((fase, index) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📈 ${fase.nombre}`);
    console.log(`${'='.repeat(60)}`);
    console.log(`📅 Período: ${fase.fechaInicio.toLocaleString()} - ${fase.fechaFin.toLocaleString()}`);
    console.log(`📊 Total partidas: ${fase.totalPartidas}`);
    console.log(`✅ Victorias: ${fase.victorias} (${fase.tasaExito.toFixed(1)}%)`);
    console.log(`❌ Derrotas: ${fase.derrotas} (${(100 - fase.tasaExito).toFixed(1)}%)`);
    console.log(`🔥 Racha máx victorias: ${fase.rachaMaxVictorias}`);
    console.log(`💀 Racha máx derrotas: ${fase.rachaMaxDerrotas}`);
    console.log(`\n📍 Top 5 Posiciones Más Usadas:`);
    fase.posicionesMasUsadas.forEach((pos, i) => {
      const emoji = pos.exito >= 60 ? '✅' : pos.exito >= 40 ? '⚠️' : '❌';
      console.log(
        `   ${i + 1}. ${emoji} Pos ${pos.posicion}: ${pos.usos} usos (${pos.exito.toFixed(1)}% éxito)`
      );
    });

    // Comparar con fase anterior
    if (index > 0) {
      const faseAnterior = fases[index - 1];
      const mejoraTasa = fase.tasaExito - faseAnterior.tasaExito;
      const mejoraRacha = faseAnterior.rachaMaxDerrotas - fase.rachaMaxDerrotas;

      console.log(`\n📈 CAMBIOS vs ${faseAnterior.nombre}:`);
      console.log(
        `   Tasa de éxito: ${mejoraTasa > 0 ? '📈' : '📉'} ${mejoraTasa > 0 ? '+' : ''}${mejoraTasa.toFixed(1)}%`
      );
      console.log(
        `   Racha máx derrotas: ${mejoraRacha > 0 ? '✅' : '❌'} ${mejoraRacha > 0 ? '-' : '+'}${Math.abs(mejoraRacha)}`
      );
    }
  });

  // Resumen final
  console.log(`\n\n${'='.repeat(60)}`);
  console.log('📋 RESUMEN GENERAL');
  console.log(`${'='.repeat(60)}`);

  if (fases.length >= 2) {
    const primeraFase = fases[0];
    const ultimaFase = fases[fases.length - 1];
    const mejoraTotal = ultimaFase.tasaExito - primeraFase.tasaExito;

    console.log(`\n🎯 Evolución Total:`);
    console.log(
      `   Tasa de éxito: ${primeraFase.tasaExito.toFixed(1)}% → ${ultimaFase.tasaExito.toFixed(1)}% (${mejoraTotal > 0 ? '+' : ''}${mejoraTotal.toFixed(1)}%)`
    );
    console.log(
      `   Racha máx derrotas: ${primeraFase.rachaMaxDerrotas} → ${ultimaFase.rachaMaxDerrotas}`
    );

    if (mejoraTotal > 0) {
      console.log(`\n✅ Sistema ha mejorado en ${mejoraTotal.toFixed(1)}%`);
    } else {
      console.log(
        `\n⚠️  Sistema ha empeorado en ${Math.abs(mejoraTotal).toFixed(1)}%`
      );
      console.log(`🔧 Se requieren más optimizaciones`);
    }
  }

  console.log('\n✅ Análisis comparativo completado\n');
}

main()
  .catch((error) => {
    console.error('❌ Error en análisis:', error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
