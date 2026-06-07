Dim shell, fso, f, content
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

Dim logFile
logFile = "C:\Users\hp\Desktop\StockPro_Source\stockpro_source\frontend\deploy-remove-devis-log.txt"

Dim cmd
cmd = "cmd.exe /c cd /d ""C:\Users\hp\Desktop\StockPro_Source\stockpro_source"" && git rm frontend/src/pages/Devis.jsx && git add frontend/src/App.jsx frontend/src/hooks/useApi.js frontend/src/services/index.js && git commit -m ""Suppression complete de la page Devis (fichier, route, nav, service, hook)"" && git push > """ & logFile & """ 2>&1"

shell.Run cmd, 0, True

Set f = fso.OpenTextFile(logFile, 1)
content = f.ReadAll
f.Close
MsgBox content, 64, "Remove Devis"
