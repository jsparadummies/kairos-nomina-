@echo off
title KAIROS - Control de Nómina y Quincenas
echo ======================================================
echo    KAIROS - CONTROL DE NOMINA, QUINCENAS Y EQUIPOS
echo ======================================================
echo Iniciando servidor local...
cd /d "%~dp0"
start "" http://localhost:5173
npm run dev
pause
