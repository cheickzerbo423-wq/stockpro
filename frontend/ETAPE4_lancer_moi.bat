@echo off
cd /d "%~dp0"
echo ============================================== > etape4_log.txt
echo  WariGest Mobile - Etape 4 (icones/splash) >> etape4_log.txt
echo ============================================== >> etape4_log.txt
echo. >> etape4_log.txt

echo === npx capacitor-assets generate --android === >> etape4_log.txt
call npx capacitor-assets generate --android >> etape4_log.txt 2>&1
echo. >> etape4_log.txt
echo --- Fin (code %errorlevel%) --- >> etape4_log.txt

echo. >> etape4_log.txt
echo ============================================== >> etape4_log.txt
echo  TERMINE - vous pouvez fermer cette fenetre >> etape4_log.txt
echo ============================================== >> etape4_log.txt

echo Termine ! Resultats enregistres dans etape4_log.txt
echo Appuyez sur une touche pour fermer...
pause >nul
