import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

export const ML_DATA_PATH = join(process.cwd(), 'ml-data', 'ml-state-v5.json');

export function saveMLStateToFile(state: any) {
  try {
    const data = JSON.stringify(state, null, 2);
    writeFileSync(ML_DATA_PATH, data, 'utf-8');
    // console.log('💾 ML State guardado en disco');
  } catch (error) {
    console.error('❌ Error guardando ML State en disco:', error);
  }
}

export function loadMLStateFromFile(): any | null {
  try {
    if (existsSync(ML_DATA_PATH)) {
      const data = readFileSync(ML_DATA_PATH, 'utf-8');
      const state = JSON.parse(data);
      console.log('📂 ML State cargado desde disco:', ML_DATA_PATH);
      return state;
    }
  } catch (error) {
    console.error('❌ Error cargando ML State desde disco:', error);
  }
  return null;
}
