@echo off
cd /d "%~dp0"
echo ============================================== > cap_sync_log.txt
echo  WariGest Mobile - Etape 3 >> cap_sync_log.txt
echo ============================================== >> cap_sync_log.txt
echo. >> cap_sync_log.txt

echo === 1/3 : npm run build:mobile === >> cap_sync_log.txt
call npm run build:mobile >> cap_sync_log.txt 2>&1
echo. >> cap_sync_log.txt
echo --- Fin build:mobile (code %errorlevel%) --- >> cap_sync_log.txt
echo. >> cap_sync_log.txt

echo === 2/3 : npx cap add android === >> cap_sync_log.txt
call npx cap add android >> cap_sync_log.txt 2>&1
echo. >> cap_sync_log.txt
echo --- Fin cap add android (code %errorlevel%) --- >> cap_sync_log.txt
echo. >> cap_sync_log.txt

echo === 3/3 : npx cap sync android === >> cap_sync_log.txt
call npx cap sync android >> cap_sync_log.txt 2>&1
echo. >> cap_sync_log.txt
echo --- Fin cap sync android (code %errorlevel%) --- >> cap_sync_log.txt

echo. >> cap_sync_log.txt
echo ============================================== >> cap_sync_log.txt
echo  TERMINE - vous pouvez fermer cette fenetre >> cap_sync_log.txt
echo ============================================== >> cap_sync_log.txt

echo Termine ! Resultats enregistres dans cap_sync_log.txt
echo Appuyez sur une touche pour fermer...
pause >nul
