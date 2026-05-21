@echo off
title Asistente de Despliegue RII
chcp 65001 > nul
cls
echo =======================================================
echo          ASISTENTE DE DESPLIEGUE A GITHUB (RII)
echo =======================================================
echo.
echo Hola! He preparado este script para que puedas subir tu
echo código a GitHub y conectarlo a Netlify fácilmente.
echo.
echo Sigue estos sencillos pasos:
echo.
echo Paso 1: Crea un repositorio vacío en tu cuenta de GitHub.
echo.
echo Presiona cualquier tecla y abriré la página de GitHub 
echo para que puedas crearlo...
pause > nul

start https://github.com/new

echo.
echo.
echo Paso 2: Rellena los datos en la web de GitHub:
echo   - Nombre del repositorio: RII (o el que prefieras)
echo   - Manténlo Público o Privado (como gustes)
echo   - ¡IMPORTANTE! NO agregues README, ni .gitignore, ni licencia.
echo   - Haz clic en "Create repository".
echo.
echo Paso 3: Una vez creado, GitHub te dará una URL. 
echo Debe verse parecido a esto: https://github.com/tu-usuario/RII.git
echo.
set /p repo_url="Pega aquí la URL de tu repositorio de GitHub y presiona ENTER: "

if "%repo_url%"=="" (
    echo.
    echo No has introducido ninguna URL. Cancelando proceso.
    pause
    exit
)

echo.
echo Configurando repositorio remoto...
git remote remove origin >nul 2>&1
git remote add origin %repo_url%
git branch -M main

echo.
echo Subiendo código a GitHub...
git push -u origin main

if %errorlevel% neq 0 (
    echo.
    echo =======================================================
    echo ERROR al subir el código.
    echo Asegúrate de tener permisos en el repositorio y de
    echo haber copiado la URL correcta.
    echo =======================================================
) else (
    echo.
    echo =======================================================
    echo ¡ÉXITO! Tu código ya está en GitHub.
    echo =======================================================
    echo.
    echo Paso final para desplegar en Netlify:
    echo 1. Abre tu cuenta de Netlify (https://app.netlify.com).
    echo 2. Haz clic en "Add new site" -> "Import an existing project".
    echo 3. Selecciona "GitHub" y busca tu repositorio "RII".
    echo 4. Netlify cargará la configuración automática desde 'netlify.toml'.
    echo 5. Ve a "Site configuration" -> "Environment variables" y añade:
    echo      - FRED_API_KEY = (tu clave de FRED que tienes en el archivo .env)
    echo.
    echo ¡Eso es todo! Netlify compilará y desplegará tu app sola.
)
echo.
echo Presiona cualquier tecla para salir.
pause > nul
