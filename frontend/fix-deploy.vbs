Dim shell, fso, f, content
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

Dim logFile
logFile = "C:\Users\hp\Desktop\StockPro_Source\stockpro_source\frontend\fix-deploy-log.txt"

shell.Run "cmd.exe /c cd /d ""C:\Users\hp\Desktop\StockPro_Source\stockpro_source"" && git add frontend/src/index.css && git commit -m ""Fix: retirer @font-face de src/index.css (chemins absolus incompatibles webpack)"" && git push > """ & logFile & """ 2>&1", 0, True

Set f = fso.OpenTextFile(logFile, 1)
content = f.ReadAll
f.Close
MsgBox content, 64, "Fix Deploy"
