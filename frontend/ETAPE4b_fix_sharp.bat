@echo off
cd /d "%~dp0"
echo ============================================== > etape4b_log.txt
echo  WariGest Mobile - Etape 4b (reparation sharp) >> etape4b_log.txt
echo ============================================== >> etape4b_log.txt
echo. >> etape4b_log.txt

echo === npm install --platform=win32 --arch=x64 sharp === >> etape4b_log.txt
call npm install --platform=win32 --arch=x64 sharp >> etape4b_log.txt 2>&1
echo. >> etape4b_log.txt
echo --- Fin install sharp (code %errorlevel%) --- >> etape4b_log.txt
echo. >> etape4b_log.txt

echo === npx capacitor-assets generate --android === >> etape4b_log.txt
call npx capacitor-assets generate --android >> etape4b_log.txt 2>&1
echo. >> etape4b_log.txt
echo --- Fin generate (code %errorlevel%) --- >> etape4b_log.txt

echo. >> etape4b_log.txt
echo ============================================== >> etape4b_log.txt
echo  TERMINE - vous pouvez fermer cette fenetre >> etape4b_log.txt
echo ============================================== >> etape4b_log.txt

echo Termine ! Resultats enregistres dans etape4b_log.txt
echo Appuyez sur une touche pour fermer...
pause >nul
