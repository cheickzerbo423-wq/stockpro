@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

set LOG=%~dp0etape5_log.txt
echo ============================================== > "%LOG%"
echo  WariGest Mobile - Etape 5 (build AAB signe) >> "%LOG%"
echo ============================================== >> "%LOG%"
echo. >> "%LOG%"

set npm_config_yes=true

rem --- Localiser keytool ---
set KEYTOOL=
if exist "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" set KEYTOOL=C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe
if "%KEYTOOL%"=="" if exist "%JAVA_HOME%\bin\keytool.exe" set KEYTOOL=%JAVA_HOME%\bin\keytool.exe
if "%KEYTOOL%"=="" set KEYTOOL=keytool

echo === keytool utilise : %KEYTOOL% === >> "%LOG%"

rem --- Localiser JDK pour Gradle ---
if "%JAVA_HOME%"=="" if exist "C:\Program Files\Android\Android Studio\jbr" set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
echo === JAVA_HOME utilise : %JAVA_HOME% === >> "%LOG%"
echo. >> "%LOG%"

rem --- Generer le keystore si absent ---
if exist "%~dp0warigest-release-key.jks" (
    echo === Keystore deja existant, generation ignoree === >> "%LOG%"
) else (
    echo === Generation du keystore warigest-release-key.jks === >> "%LOG%"
    "%KEYTOOL%" -genkeypair -v ^
      -keystore "%~dp0warigest-release-key.jks" ^
      -alias warigest ^
      -keyalg RSA -keysize 2048 -validity 10000 ^
      -storepass q5QH2t1NCaaxZxs57u7t ^
      -keypass q0evv4pqnCDrbAQzC9kJ ^
      -dname "CN=WariGest, OU=WariGest, O=WariGest, L=Abidjan, ST=Abidjan, C=CI" >> "%LOG%" 2>&1
    echo --- code keytool %errorlevel% --- >> "%LOG%"
)
echo. >> "%LOG%"

rem --- Construire l'AAB signe ---
echo === gradlew bundleRelease === >> "%LOG%"
call gradlew.bat bundleRelease >> "%LOG%" 2>&1
echo --- code gradlew %errorlevel% --- >> "%LOG%"

echo. >> "%LOG%"
echo ============================================== >> "%LOG%"
echo  TERMINE - vous pouvez fermer cette fenetre >> "%LOG%"
echo  Fichier AAB attendu dans : app\build\outputs\bundle\release\ >> "%LOG%"
echo ============================================== >> "%LOG%"

echo Termine ! Resultats enregistres dans etape5_log.txt
echo Appuyez sur une touche pour fermer...
pause >nul
