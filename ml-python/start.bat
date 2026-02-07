@echo off
echo ============================================
echo   Chicken ML Python - Setup e Inicio
echo ============================================
echo.

cd /d "%~dp0"

REM Verificar si existe entorno virtual
if not exist "venv" (
    echo [1/4] Creando entorno virtual...
    python -m venv venv
    echo.
)

REM Activar entorno virtual
echo [2/4] Activando entorno virtual...
call venv\Scripts\activate.bat

REM Instalar dependencias
echo [3/4] Instalando dependencias...
pip install --upgrade pip
pip install fastapi uvicorn[standard] pydantic loguru httpx python-dotenv aiosqlite
pip install scikit-learn xgboost numpy pandas joblib
pip install torch --index-url https://download.pytorch.org/whl/cpu
echo.

echo [4/4] Iniciando servidor ML...
echo.
echo   URL: http://127.0.0.1:8100
echo   Docs: http://127.0.0.1:8100/docs
echo.
python main.py
