@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
echo ================================================
echo   ASFALTO BRUTAL - JOGAR NO NAVEGADOR
 echo ================================================
echo.
echo O jogo sera aberto automaticamente.
echo MANTENHA ESTA JANELA ABERTA durante a partida.
echo Para encerrar, pressione Ctrl+C nesta janela.
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0servidor-local.ps1"
if errorlevel 1 (
  echo.
  echo Nao foi possivel iniciar o servidor local.
  echo Execute no mesmo diretorio do jogo.
  pause
)
