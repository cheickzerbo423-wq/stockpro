@echo off
cd /d "%~dp0"
set npm_config_yes=true
echo ============================================== > etape4e_log.txt
echo  WariGest Mobile - Etape 4e (cap sync) >> etape4e_log.txt
echo ============================================== >> etape4e_log.txt
echo. >> etape4e_log.txt

echo === npx --yes cap sync android === >> etape4e_log.txt
call npx --yes cap sync android >> etape4e_log.txt 2>&1
echo --- code %errorlevel% --- >> etape4e_log.txt

echo. >> etape4e_log.txt
echo ============================================== >> etape4e_log.txt
echo  TERMINE - vous pouvez fermer cette fenetre >> etape4e_log.txt
echo ============================================== >> etape4e_log.txt

echo Termine ! Resultats enregistres dans etape4e_log.txt
echo Appuyez sur une touche pour fermer...
pause >nul
