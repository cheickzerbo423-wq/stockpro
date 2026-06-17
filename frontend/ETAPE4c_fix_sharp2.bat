@echo off
cd /d "%~dp0"
echo ============================================== > etape4c_log.txt
echo  WariGest Mobile - Etape 4c (reparation sharp v2) >> etape4c_log.txt
echo ============================================== >> etape4c_log.txt
echo. >> etape4c_log.txt

cd /d "%~dp0node_modules\@capacitor\assets\node_modules\sharp"
echo === Repertoire courant === >> "%~dp0etape4c_log.txt"
cd >> "%~dp0etape4c_log.txt"

echo === node install/libvips === >> "%~dp0etape4c_log.txt"
call node install/libvips >> "%~dp0etape4c_log.txt" 2>&1
echo --- code %errorlevel% --- >> "%~dp0etape4c_log.txt"

echo === node install/dll-copy === >> "%~dp0etape4c_log.txt"
call node install/dll-copy >> "%~dp0etape4c_log.txt" 2>&1
echo --- code %errorlevel% --- >> "%~dp0etape4c_log.txt"

echo === npx prebuild-install === >> "%~dp0etape4c_log.txt"
call npx prebuild-install >> "%~dp0etape4c_log.txt" 2>&1
echo --- code %errorlevel% --- >> "%~dp0etape4c_log.txt"

cd /d "%~dp0"
echo === npx capacitor-assets generate --android === >> etape4c_log.txt
call npx capacitor-assets generate --android >> etape4c_log.txt 2>&1
echo --- code %errorlevel% --- >> etape4c_log.txt

echo. >> etape4c_log.txt
echo ============================================== >> etape4c_log.txt
echo  TERMINE - vous pouvez fermer cette fenetre >> etape4c_log.txt
echo ============================================== >> etape4c_log.txt

echo Termine ! Resultats enregistres dans etape4c_log.txt
echo Appuyez sur une touche pour fermer...
pause >nul
