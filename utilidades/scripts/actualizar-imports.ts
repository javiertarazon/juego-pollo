/**
 * 🔄 SCRIPT DE ACTUALIZACIÓN DE IMPORTS
 * 
 * Este script actualiza automáticamente todas las referencias e imports
 * para que funcionen con la nueva estructura de directorios.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

// Mapeo de rutas antiguas a nuevas
const MAPEO_RUTAS = {
  // Scripts de análisis
  'analyze-advanced-mystake-patterns.ts': 'analisis/patrones-mystake/analyze-advanced-mystake-patterns.ts',
  'analyze-mystake-adaptation.ts': 'analisis/patrones-mystake/analyze-mystake-adaptation.ts',
  'analyze-*.ts': 'analisis/patrones-mystake/',
  
  // Exportación de datos
  'export-csv-data.ts': 'datos/exportacion/export-csv-data.ts',
  
  // ML y predicción
  'ml-predictor-standalone.ts': 'ml/prediccion/ml-predictor-standalone.ts',
  'src/lib/ml/': 'ml/algoritmos/',
  
  // Monitoreo
  'src/lib/monitoring.ts': 'utilidades/monitoreo/monitoring.ts',
  
  // Documentación
  '*.md': 'documentacion/investigacion/'
};

/**
 * Actualiza los imports en un archivo
 */
function actualizarImportsEnArchivo(rutaArchivo: string): void {
  try {
    let contenido = readFileSync(rutaArchivo, 'utf-8');
    let actualizado = false;

    // Actualizar imports relativos
    Object.entries(MAPEO_RUTAS).forEach(([rutaAntigua, rutaNueva]) => {
      const regex = new RegExp(`from ['"](\\.\\./)*${rutaAntigua.replace('*', '.*')}['"]`, 'g');
      const nuevaRuta = rutaNueva.startsWith('./') ? rutaNueva : `./${rutaNueva}`;
      
      if (regex.test(contenido)) {
        contenido = contenido.replace(regex, `from '${nuevaRuta}'`);
        actualizado = true;
      }
    });

    // Actualizar imports de módulos internos
    contenido = contenido.replace(
      /from ['"]\.\.\/lib\/ml\/(.*?)['"]/, 
      "from '../ml/algoritmos/$1'"
    );
    
    contenido = contenido.replace(
      /from ['"]\.\.\/lib\/monitoring['"]/, 
      "from '../utilidades/monitoreo/monitoring'"
    );

    if (actualizado) {
      writeFileSync(rutaArchivo, contenido, 'utf-8');
      console.log(`✅ Actualizado: ${rutaArchivo}`);
    }
  } catch (error) {
    console.error(`❌ Error actualizando ${rutaArchivo}:`, error);
  }
}

/**
 * Recorre recursivamente un directorio y actualiza todos los archivos
 */
function actualizarDirectorio(directorio: string): void {
  try {
    const archivos = readdirSync(directorio);
    
    archivos.forEach(archivo => {
      const rutaCompleta = join(directorio, archivo);
      const stats = statSync(rutaCompleta);
      
      if (stats.isDirectory()) {
        // Recursión para subdirectorios
        actualizarDirectorio(rutaCompleta);
      } else if (['.ts', '.tsx', '.js', '.jsx'].includes(extname(archivo))) {
        // Actualizar archivos de código
        actualizarImportsEnArchivo(rutaCompleta);
      }
    });
  } catch (error) {
    console.error(`❌ Error procesando directorio ${directorio}:`, error);
  }
}

/**
 * Función principal
 */
function main(): void {
  console.log('🔄 Iniciando actualización de imports...\n');
  
  // Directorios a procesar
  const directorios = [
    'src',
    'analisis', 
    'datos',
    'ml',
    'utilidades'
  ];
  
  directorios.forEach(directorio => {
    console.log(`📁 Procesando directorio: ${directorio}`);
    actualizarDirectorio(directorio);
  });
  
  console.log('\n✅ Actualización de imports completada');
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main();
}

export { actualizarImportsEnArchivo, actualizarDirectorio };