Dim shell, fso, f, content
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

Dim logFile
logFile = "C:\Users\hp\Desktop\StockPro_Source\stockpro_source\frontend\deploy-ui-log.txt"

Dim cmd
cmd = "cmd.exe /c cd /d ""C:\Users\hp\Desktop\StockPro_Source\stockpro_source"" && git add frontend/src/index.css frontend/src/App.jsx frontend/src/components/UI.jsx frontend/src/pages/Dashboard.jsx && git commit -m ""UI: amelioration style global moderne epure"" && git push > """ & logFile & """ 2>&1"

shell.Run cmd, 0, True

Set f = fso.OpenTextFile(logFile, 1)
content = f.ReadAll
f.Close
MsgBox content, 64, "Deploy UI"
