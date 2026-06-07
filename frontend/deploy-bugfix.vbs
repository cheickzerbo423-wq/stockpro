Dim shell, fso, f, content
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

Dim logFile
logFile = "C:\Users\hp\Desktop\StockPro_Source\stockpro_source\frontend\deploy-bugfix-log.txt"

Dim cmd
cmd = "cmd.exe /c cd /d ""C:\Users\hp\Desktop\StockPro_Source\stockpro_source"" && git add frontend/src/services/index.js frontend/src/hooks/useApi.js frontend/src/App.jsx && git commit -m ""Fix: ajout devisService + useDevis + route /devis (page Devis completement integree)"" && git push > """ & logFile & """ 2>&1"

shell.Run cmd, 0, True

Set f = fso.OpenTextFile(logFile, 1)
content = f.ReadAll
f.Close
MsgBox content, 64, "Deploy BugFix"
