/**
 * 🔬 API ENDPOINT: ESTADÍSTICAS AVANZADAS Y ANÁLISIS DE PATRONES
 * 
 * Proporciona análisis detallado de:
 * - Frecuencias de posiciones (huesos y pollos)
 * - Patrones consecutivos
 * - Transiciones hueso-pollo
 * - Análisis de últimas N partidas
 * - Ventajas estadísticas capitalizables
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const boneCount = parseInt(searchParams.get('boneCount') || '4');
    
    // Obtener partidas reales más recientes
    const partidas = await db.chickenGame.findMany({
      where: {
        isSimulated: false,
        boneCount: boneCount
      },
      include: {
        positions: {
          orderBy: { position: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
    
    if (partidas.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No hay partidas disponibles para análisis'
      }, { status: 404 });
    }
    
    // Análisis completo
    const analisis = {
      resumen_general: generarResumenGeneral(partidas),
      frecuencias_posiciones: analizarFrecuenciasPosiciones(partidas),
      patrones_consecutivos: analizarPatronesConsecutivos(partidas),
      transiciones: analizarTransiciones(partidas),
      patrones_huesos_condicional: analizarPatronesHuesosCondicional(partidas),
      ultimas_10_partidas: analizarUltimas10Partidas(partidas.slice(0, 10)),
      zonas_calientes_frias: analizarZonasCalientesFrias(partidas),
      ventajas_estadisticas: identificarVentajasEstadisticas(partidas),
      recomendaciones: generarRecomendaciones(partidas)
    };
    
    return NextResponse.json({
      success: true,
      total_partidas_analizadas: partidas.length,
      bone_count: boneCount,
      analisis
    });
    
  } catch (error) {
    console.error('❌ Error en análisis avanzado:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al realizar análisis',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Genera resumen general de las partidas
 */
function generarResumenGeneral(partidas: any[]) {
  const total = partidas.length;
  const exitosas = partidas.filter(p => !p.hitBone).length;
  const fallidas = total - exitosas;
  
  return {
    total_partidas: total,
    partidas_exitosas: exitosas,
    partidas_fallidas: fallidas,
    tasa_exito: (exitosas / total * 100).toFixed(2) + '%',
    tasa_fallo: (fallidas / total * 100).toFixed(2) + '%',
    promedio_reveladas: (partidas.reduce((sum, p) => sum + p.revealedCount, 0) / total).toFixed(2)
  };
}

/**
 * Analiza frecuencias de cada posición
 */
function analizarFrecuenciasPosiciones(partidas: any[]) {
  const frecuencias_huesos: Record<number, number> = {};
  const frecuencias_pollos: Record<number, number> = {};
  const consecutivas_huesos: Record<number, number> = {};
  const consecutivas_pollos: Record<number, number> = {};
  
  // Inicializar contadores
  for (let i = 0; i < 25; i++) {
    frecuencias_huesos[i] = 0;
    frecuencias_pollos[i] = 0;
    consecutivas_huesos[i] = 0;
    consecutivas_pollos[i] = 0;
  }
  
  // Analizar cada partida
  let partida_anterior: any = null;
  
  for (const partida of partidas) {
    // Contar frecuencias
    for (const pos of partida.positions) {
      if (pos.isChicken) {
        frecuencias_pollos[pos.position]++;
      } else {
        frecuencias_huesos[pos.position]++;
      }
    }
    
    // Contar consecutivas
    if (partida_anterior) {
      for (const pos of partida.positions) {
        const pos_anterior = partida_anterior.positions.find((p: any) => p.position === pos.position);
        if (pos_anterior) {
          if (pos.isChicken && pos_anterior.isChicken) {
            consecutivas_pollos[pos.position]++;
          } else if (!pos.isChicken && !pos_anterior.isChicken) {
            consecutivas_huesos[pos.position]++;
          }
        }
      }
    }
    
    partida_anterior = partida;
  }
  
  // Ordenar por frecuencia
  const huesos_ordenados = Object.entries(frecuencias_huesos)
    .map(([pos, freq]) => ({
      posicion: parseInt(pos),
      frecuencia: freq,
      porcentaje: (freq / partidas.length * 100).toFixed(2) + '%',
      consecutivas: consecutivas_huesos[parseInt(pos)]
    }))
    .filter(item => item.frecuencia > 0)
    .sort((a, b) => b.frecuencia - a.frecuencia);
  
  const pollos_ordenados = Object.entries(frecuencias_pollos)
    .map(([pos, freq]) => ({
      posicion: parseInt(pos),
      frecuencia: freq,
      porcentaje: (freq / partidas.length * 100).toFixed(2) + '%',
      consecutivas: consecutivas_pollos[parseInt(pos)]
    }))
    .filter(item => item.frecuencia > 0)
    .sort((a, b) => b.frecuencia - a.frecuencia);
  
  return {
    huesos_mas_frecuentes: huesos_ordenados.slice(0, 10),
    pollos_mas_frecuentes: pollos_ordenados.slice(0, 10),
    huesos_menos_frecuentes: huesos_ordenados.slice(-5).reverse(),
    pollos_menos_frecuentes: pollos_ordenados.slice(-5).reverse()
  };
}

/**
 * Analiza patrones consecutivos
 */
function analizarPatronesConsecutivos(partidas: any[]) {
  const patrones: Record<string, number> = {};
  
  for (let i = 0; i < partidas.length - 1; i++) {
    const actual = partidas[i];
    const siguiente = partidas[i + 1];
    
    // Crear patrón de posiciones de huesos
    const huesos_actual = actual.positions
      .filter((p: any) => !p.isChicken)
      .map((p: any) => p.position)
      .sort((a: number, b: number) => a - b)
      .join(',');
    
    const huesos_siguiente = siguiente.positions
      .filter((p: any) => !p.isChicken)
      .map((p: any) => p.position)
      .sort((a: number, b: number) => a - b)
      .join(',');
    
    const patron = `${huesos_actual} -> ${huesos_siguiente}`;
    patrones[patron] = (patrones[patron] || 0) + 1;
  }
  
  // Ordenar por frecuencia
  const patrones_ordenados = Object.entries(patrones)
    .map(([patron, freq]) => ({ patron, frecuencia: freq }))
    .sort((a, b) => b.frecuencia - a.frecuencia)
    .slice(0, 10);
  
  return {
    patrones_mas_comunes: patrones_ordenados,
    total_patrones_unicos: Object.keys(patrones).length
  };
}

/**
 * Analiza transiciones hueso-pollo
 */
function analizarTransiciones(partidas: any[]) {
  const transiciones: Record<string, number> = {
    'hueso_a_pollo': 0,
    'pollo_a_hueso': 0,
    'hueso_a_hueso': 0,
    'pollo_a_pollo': 0
  };
  
  const cambios_por_posicion: Record<number, {
    hueso_a_pollo: number;
    pollo_a_hueso: number;
    cada_n_partidas: number[];
  }> = {};
  
  // Inicializar
  for (let i = 0; i < 25; i++) {
    cambios_por_posicion[i] = {
      hueso_a_pollo: 0,
      pollo_a_hueso: 0,
      cada_n_partidas: []
    };
  }
  
  // Analizar transiciones
  for (let i = 0; i < partidas.length - 1; i++) {
    const actual = partidas[i];
    const siguiente = partidas[i + 1];
    
    for (let pos = 0; pos < 25; pos++) {
      const pos_actual = actual.positions.find((p: any) => p.position === pos);
      const pos_siguiente = siguiente.positions.find((p: any) => p.position === pos);
      
      if (pos_actual && pos_siguiente) {
        const tipo_actual = pos_actual.isChicken ? 'pollo' : 'hueso';
        const tipo_siguiente = pos_siguiente.isChicken ? 'pollo' : 'hueso';
        const transicion = `${tipo_actual}_a_${tipo_siguiente}`;
        
        transiciones[transicion]++;
        
        // Registrar cambios
        if (tipo_actual === 'hueso' && tipo_siguiente === 'pollo') {
          cambios_por_posicion[pos].hueso_a_pollo++;
          cambios_por_posicion[pos].cada_n_partidas.push(i + 1);
        } else if (tipo_actual === 'pollo' && tipo_siguiente === 'hueso') {
          cambios_por_posicion[pos].pollo_a_hueso++;
          cambios_por_posicion[pos].cada_n_partidas.push(i + 1);
        }
      }
    }
  }
  
  // Calcular frecuencia de cambios
  const cambios_frecuentes = Object.entries(cambios_por_posicion)
    .map(([pos, data]) => {
      const total_cambios = data.hueso_a_pollo + data.pollo_a_hueso;
      const promedio_cada_n = data.cada_n_partidas.length > 1
        ? data.cada_n_partidas.reduce((sum, val, idx, arr) => {
            if (idx === 0) return 0;
            return sum + (val - arr[idx - 1]);
          }, 0) / (data.cada_n_partidas.length - 1)
        : 0;
      
      return {
        posicion: parseInt(pos),
        hueso_a_pollo: data.hueso_a_pollo,
        pollo_a_hueso: data.pollo_a_hueso,
        total_cambios,
        cambia_cada_n_partidas: promedio_cada_n > 0 ? promedio_cada_n.toFixed(1) : 'N/A'
      };
    })
    .filter(item => item.total_cambios > 0)
    .sort((a, b) => b.total_cambios - a.total_cambios)
    .slice(0, 10);
  
  return {
    resumen_transiciones: transiciones,
    posiciones_que_cambian_mas: cambios_frecuentes
  };
}

/**
 * Analiza patrones de huesos condicionados por las últimas posiciones de pollo reveladas
 */
function analizarPatronesHuesosCondicional(partidas: any[]) {
  const distanciaManhattan: Record<number, number> = {};
  const lastChickenToBones = new Map<number, Map<number, number>>();
  const lastTwoChickenToBones = new Map<string, Map<number, number>>();

  let totalBones = 0;
  let totalGamesConRevelados = 0;
  let adyacentes = 0;
  let mismaFila = 0;
  let mismaCol = 0;

  const getRowCol = (pos: number) => {
    const row = Math.floor((pos - 1) / 5);
    const col = (pos - 1) % 5;
    return { row, col };
  };

  const incrementarMapa = (mapa: Map<number, number>, key: number) => {
    mapa.set(key, (mapa.get(key) || 0) + 1);
  };

  partidas.forEach((partida) => {
    const reveladas = partida.positions
      .filter((p: any) => p.revealed && p.revealOrder > 0)
      .sort((a: any, b: any) => a.revealOrder - b.revealOrder);

    const pollosRevelados = reveladas.filter((p: any) => p.isChicken);
    if (pollosRevelados.length === 0) return;

    totalGamesConRevelados++;

    const lastChicken = pollosRevelados[pollosRevelados.length - 1].position;
    const lastTwoKey = pollosRevelados.length >= 2
      ? `${pollosRevelados[pollosRevelados.length - 2].position}-${lastChicken}`
      : null;

    const bones = partida.positions
      .filter((p: any) => !p.isChicken)
      .map((p: any) => p.position);

    const { row: lastRow, col: lastCol } = getRowCol(lastChicken);

    bones.forEach((bonePos: number) => {
      totalBones++;

      const { row, col } = getRowCol(bonePos);
      const dist = Math.abs(row - lastRow) + Math.abs(col - lastCol);
      distanciaManhattan[dist] = (distanciaManhattan[dist] || 0) + 1;

      if (Math.max(Math.abs(row - lastRow), Math.abs(col - lastCol)) === 1) {
        adyacentes++;
      }
      if (row === lastRow) mismaFila++;
      if (col === lastCol) mismaCol++;

      if (!lastChickenToBones.has(lastChicken)) {
        lastChickenToBones.set(lastChicken, new Map());
      }
      incrementarMapa(lastChickenToBones.get(lastChicken)!, bonePos);

      if (lastTwoKey) {
        if (!lastTwoChickenToBones.has(lastTwoKey)) {
          lastTwoChickenToBones.set(lastTwoKey, new Map());
        }
        incrementarMapa(lastTwoChickenToBones.get(lastTwoKey)!, bonePos);
      }
    });
  });

  const ordenarTop = (mapa: Map<number, number>, top: number) => {
    const total = Array.from(mapa.values()).reduce((a, b) => a + b, 0) || 1;
    return Array.from(mapa.entries())
      .map(([posicion, conteo]) => ({
        posicion,
        conteo,
        porcentaje: Number(((conteo / total) * 100).toFixed(2))
      }))
      .sort((a, b) => b.conteo - a.conteo)
      .slice(0, top);
  };

  const topPorUltimoPollo = Array.from(lastChickenToBones.entries())
    .map(([ultimaPosicion, mapa]) => ({
      ultima_posicion_pollo: ultimaPosicion,
      muestras: Array.from(mapa.values()).reduce((a, b) => a + b, 0),
      huesos_mas_probables: ordenarTop(mapa, 5)
    }))
    .sort((a, b) => b.muestras - a.muestras)
    .slice(0, 10);

  const topPorUltimosDos = Array.from(lastTwoChickenToBones.entries())
    .map(([clave, mapa]) => ({
      ultimas_dos_posiciones: clave,
      muestras: Array.from(mapa.values()).reduce((a, b) => a + b, 0),
      huesos_mas_probables: ordenarTop(mapa, 5)
    }))
    .sort((a, b) => b.muestras - a.muestras)
    .slice(0, 10);

  const distanciaDistribucion = Object.entries(distanciaManhattan)
    .map(([dist, count]) => ({
      distancia: Number(dist),
      conteo: count,
      porcentaje: totalBones > 0 ? Number(((count / totalBones) * 100).toFixed(2)) : 0
    }))
    .sort((a, b) => a.distancia - b.distancia);

  return {
    total_partidas_con_revelados: totalGamesConRevelados,
    total_muestras_huesos: totalBones,
    proximidad: {
      adyacentes: {
        conteo: adyacentes,
        porcentaje: totalBones > 0 ? Number(((adyacentes / totalBones) * 100).toFixed(2)) : 0
      },
      misma_fila: {
        conteo: mismaFila,
        porcentaje: totalBones > 0 ? Number(((mismaFila / totalBones) * 100).toFixed(2)) : 0
      },
      misma_columna: {
        conteo: mismaCol,
        porcentaje: totalBones > 0 ? Number(((mismaCol / totalBones) * 100).toFixed(2)) : 0
      },
      distribucion_distancia_manhattan: distanciaDistribucion
    },
    condicion_por_ultima_posicion_pollo: topPorUltimoPollo,
    condicion_por_ultimas_dos_posiciones: topPorUltimosDos
  };
}

/**
 * Analiza las últimas 10 partidas en detalle
 */
function analizarUltimas10Partidas(partidas: any[]) {
  return partidas.map((partida, idx) => {
    const huesos = partida.positions
      .filter((p: any) => !p.isChicken)
      .map((p: any) => p.position)
      .sort((a: number, b: number) => a - b);
    
    const pollos = partida.positions
      .filter((p: any) => p.isChicken)
      .map((p: any) => p.position)
      .sort((a: number, b: number) => a - b);
    
    return {
      partida_numero: idx + 1,
      id: partida.id,
      fecha: partida.createdAt,
      huesos: huesos,
      cantidad_huesos: huesos.length,
      pollos: pollos,
      cantidad_pollos: pollos.length,
      exitosa: !partida.hitBone,
      reveladas: partida.revealedCount
    };
  });
}

/**
 * Analiza zonas calientes y frías
 */
function analizarZonasCalientesFrias(partidas: any[]) {
  const zonas = {
    esquinas: [0, 4, 20, 24],
    bordes: [1, 2, 3, 5, 9, 10, 14, 15, 19, 21, 22, 23],
    centro: [6, 7, 8, 11, 12, 13, 16, 17, 18]
  };
  
  const frecuencias_zonas: Record<string, { huesos: number; pollos: number }> = {
    esquinas: { huesos: 0, pollos: 0 },
    bordes: { huesos: 0, pollos: 0 },
    centro: { huesos: 0, pollos: 0 }
  };
  
  for (const partida of partidas) {
    for (const pos of partida.positions) {
      let zona = 'centro';
      if (zonas.esquinas.includes(pos.position)) zona = 'esquinas';
      else if (zonas.bordes.includes(pos.position)) zona = 'bordes';
      
      if (pos.isChicken) {
        frecuencias_zonas[zona].pollos++;
      } else {
        frecuencias_zonas[zona].huesos++;
      }
    }
  }
  
  return {
    zonas_definidas: zonas,
    frecuencias: frecuencias_zonas,
    zona_mas_segura: Object.entries(frecuencias_zonas)
      .map(([zona, freq]) => ({
        zona,
        ratio_pollos: (freq.pollos / (freq.pollos + freq.huesos) * 100).toFixed(2) + '%'
      }))
      .sort((a, b) => parseFloat(b.ratio_pollos) - parseFloat(a.ratio_pollos))[0]
  };
}

/**
 * Identifica ventajas estadísticas capitalizables
 */
function identificarVentajasEstadisticas(partidas: any[]) {
  const ventajas = [];
  
  // Analizar frecuencias
  const freq = analizarFrecuenciasPosiciones(partidas);
  
  // Ventaja 1: Posiciones que nunca o raramente son huesos
  const posiciones_seguras = freq.huesos_menos_frecuentes
    .filter(item => item.frecuencia < partidas.length * 0.1)
    .map(item => item.posicion);
  
  if (posiciones_seguras.length > 0) {
    ventajas.push({
      tipo: 'POSICIONES_SEGURAS',
      descripcion: 'Posiciones que raramente son huesos (< 10% de las veces)',
      posiciones: posiciones_seguras,
      confianza: 'ALTA'
    });
  }
  
  // Ventaja 2: Posiciones con alta frecuencia de pollos consecutivos
  const pollos_consecutivos = freq.pollos_mas_frecuentes
    .filter(item => item.consecutivas > partidas.length * 0.3)
    .map(item => ({ posicion: item.posicion, consecutivas: item.consecutivas }));
  
  if (pollos_consecutivos.length > 0) {
    ventajas.push({
      tipo: 'POLLOS_CONSECUTIVOS',
      descripcion: 'Posiciones que tienden a ser pollos en partidas consecutivas',
      posiciones: pollos_consecutivos,
      confianza: 'MEDIA-ALTA'
    });
  }
  
  // Ventaja 3: Patrones de transición predecibles
  const trans = analizarTransiciones(partidas);
  const cambios_predecibles = trans.posiciones_que_cambian_mas
    .filter(item => item.cambia_cada_n_partidas !== 'N/A' && parseFloat(item.cambia_cada_n_partidas) < 5)
    .map(item => ({
      posicion: item.posicion,
      cambia_cada: item.cambia_cada_n_partidas
    }));
  
  if (cambios_predecibles.length > 0) {
    ventajas.push({
      tipo: 'CAMBIOS_PREDECIBLES',
      descripcion: 'Posiciones que cambian con frecuencia predecible',
      posiciones: cambios_predecibles,
      confianza: 'MEDIA'
    });
  }
  
  return ventajas;
}

/**
 * Genera recomendaciones basadas en el análisis
 */
function generarRecomendaciones(partidas: any[]) {
  const freq = analizarFrecuenciasPosiciones(partidas);
  const zonas = analizarZonasCalientesFrias(partidas);
  const ventajas = identificarVentajasEstadisticas(partidas);
  
  const recomendaciones = [];
  
  // Recomendación 1: Posiciones iniciales
  recomendaciones.push({
    momento: 'INICIO_PARTIDA',
    estrategia: 'Comenzar con posiciones históricamente seguras',
    posiciones_recomendadas: freq.huesos_menos_frecuentes.slice(0, 5).map(item => item.posicion),
    razon: 'Estas posiciones han sido huesos menos del 10% de las veces'
  });
  
  // Recomendación 2: Zona más segura
  recomendaciones.push({
    momento: 'ESTRATEGIA_GENERAL',
    estrategia: `Priorizar zona: ${zonas.zona_mas_segura.zona}`,
    posiciones_recomendadas: zonas.zonas_definidas[zonas.zona_mas_segura.zona as keyof typeof zonas.zonas_definidas],
    razon: `Esta zona tiene ${zonas.zona_mas_segura.ratio_pollos} de pollos`
  });
  
  // Recomendación 3: Aprovechar ventajas
  if (ventajas.length > 0) {
    recomendaciones.push({
      momento: 'CAPITALIZAR_VENTAJAS',
      estrategia: 'Usar ventajas estadísticas identificadas',
      ventajas_disponibles: ventajas.length,
      razon: 'Se identificaron patrones capitalizables con confianza media-alta'
    });
  }
  
  return recomendaciones;
}
