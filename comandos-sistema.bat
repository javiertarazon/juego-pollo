@echo off
chcp 65001 >nul
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║     SISTEMA DE ENTRENAMIENTO CHICKEN - MYSTAKE            ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

:menu
echo.
echo Selecciona una opción:
echo.
echo [1] Verificar estado del sistema
echo [2] Analizar 300 partidas reales
echo [3] Enfrentamiento Asesor vs Simulador (100 partidas)
echo [4] Enfrentamiento Asesor vs Simulador (500 partidas)
echo [5] Contar partidas en base de datos
echo [6] Iniciar servidor (npm run dev)
echo [7] Exportar datos a CSV
echo [0] Salir
echo.
set /p opcion="Ingresa el número de la opción: "

if "%opcion%"=="1" goto verificar
if "%opcion%"=="2" goto analizar300
if "%opcion%"=="3" goto enfrentamiento100
if "%opcion%"=="4" goto enfrentamiento500
if "%opcion%"=="5" goto contar
if "%opcion%"=="6" goto servidor
if "%opcion%"=="7" goto exportar
if "%opcion%"=="0" goto salir

echo.
echo ❌ Opción inválida. Intenta de nuevo.
goto menu

:verificar
echo.
echo 🔍 Verificando estado del sistema...
echo.
npx tsx verificar-sistema.ts
pause
goto menu

:analizar300
echo.
echo 📊 Analizando 300 partidas reales...
echo.
npx tsx analisis/analisis-profundo-300-partidas.ts
pause
goto menu

:enfrentamiento100
echo.
echo ⚔️  Enfrentamiento: 100 partidas, objetivo 5 pollos
echo.
npx tsx analisis/enfrentamiento-asesor-vs-simulador.ts 100 5
pause
goto menu

:enfrentamiento500
echo.
echo ⚔️  Enfrentamiento: 500 partidas, objetivo 5 pollos
echo    (Esto puede tomar varios minutos)
echo.
npx tsx analisis/enfrentamiento-asesor-vs-simulador.ts 500 5
pause
goto menu

:contar
echo.
echo 📊 Contando partidas en base de datos...
echo.
npx tsx utilidades/scripts/count-games.ts
pause
goto menu

:servidor
echo.
echo 🚀 Iniciando servidor en http://localhost:3000
echo    Presiona Ctrl+C para detener
echo.
npm run dev
pause
goto menu

:exportar
echo.
echo 📥 Exportando datos a CSV...
echo.
npx tsx export-csv-data.ts
pause
goto menu

:salir
echo.
echo 👋 ¡Hasta luego!
echo.
exit
