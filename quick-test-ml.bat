@echo off
REM Script rápido para probar el ML Predictor V5
echo ========================================
echo ML PREDICTOR V5 - PRUEBA RAPIDA
echo ========================================
echo.

echo 1. Obteniendo prediccion...
echo.
call npx tsx ml-predictor-standalone.ts predict
echo.
echo.

echo 2. Probando variedad (15 predicciones)...
echo.
call npx tsx ml-predictor-standalone.ts test 15
echo.
echo.

echo 3. Mostrando estadisticas...
echo.
call npx tsx ml-predictor-standalone.ts stats
echo.
echo.

echo ========================================
echo PRUEBA COMPLETADA
echo ========================================
echo.
echo Para usar en produccion:
echo 1. npx tsx ml-predictor-standalone.ts predict
echo 2. Jugar en Mystake con la posicion sugerida
echo 3. npx tsx ml-predictor-standalone.ts update [pos] [true/false]
echo.
pause
