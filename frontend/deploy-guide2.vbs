Dim shell, fso, f, content
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

Dim logFile
logFile = "C:\Users\hp\Desktop\StockPro_Source\stockpro_source\frontend\deploy-guide2-log.txt"

Dim cmd
cmd = "cmd.exe /c cd /d ""C:\Users\hp\Desktop\StockPro_Source\stockpro_source"" && git add frontend/src/pages/Guide.jsx && git commit -m ""Guide: suppression Gammes + Gamme rapide (absents du frontend), corrections alignement code"" && git push > """ & logFile & """ 2>&1"

shell.Run cmd, 0, True

Set f = fso.OpenTextFile(logFile, 1)
content = f.ReadAll
f.Close
MsgBox content, 64, "Deploy Guide v2"
