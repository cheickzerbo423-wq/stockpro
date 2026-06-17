@echo off
cd /d "%~dp0"
echo ============================================== > etape4d_log.txt
echo  WariGest Mobile - Etape 4d (reparation sharp v3) >> etape4d_log.txt
echo ============================================== >> etape4d_log.txt
echo. >> etape4d_log.txt

set npm_config_yes=true

cd /d "%~dp0node_modules\@capacitor\assets\node_modules\sharp"
echo === Repertoire courant === >> "%~dp0etape4d_log.txt"
cd >> "%~dp0etape4d_log.txt"

echo === npx --yes prebuild-install === >> "%~dp0etape4d_log.txt"
call npx --yes prebuild-install >> "%~dp0etape4d_log.txt" 2>&1
echo --- code %errorlevel% --- >> "%~dp0etape4d_log.txt"

cd /d "%~dp0"
echo === npx --yes capacitor-assets generate --android === >> etape4d_log.txt
call npx --yes capacitor-assets generate --android >> etape4d_log.txt 2>&1
echo --- code %errorlevel% --- >> etape4d_log.txt

echo. >> etape4d_log.txt
echo ============================================== >> etape4d_log.txt
echo  TERMINE - vous pouvez fermer cette fenetre >> etape4d_log.txt
echo ============================================== >> etape4d_log.txt

echo Termine ! Resultats enregistres dans etape4d_log.txt
echo Appuyez sur une touche pour fermer...
pause >nul
