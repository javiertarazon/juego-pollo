@echo off
echo ========================================
echo   LIMPIEZA DE CACHE - Next.js
echo ========================================
echo.

echo [1/3] Deteniendo servidor...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo [2/3] Eliminando carpeta .next...
if exist .next (
    rmdir /s /q .next
    echo ✓ Carpeta .next eliminada
) else (
    echo ✓ Carpeta .next no existe
)

echo [3/3] Iniciando servidor...
echo.
echo ========================================
echo   Servidor iniciando...
echo   Espera a que diga "Ready in X.Xs"
echo   Luego abre: http://localhost:3000
echo ========================================
echo.

npm run dev
