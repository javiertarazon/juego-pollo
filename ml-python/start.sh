#!/bin/bash
# Iniciar servicio ML Python para Juego del Pollo
cd "$(dirname "$0")"

# Crear directorios necesarios
mkdir -p models data

# Iniciar servicio
echo "🧠 Iniciando Servicio ML Python (puerto 8001)..."
python3 main.py
