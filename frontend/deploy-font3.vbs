Dim shell, fso, f, content
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

Dim logFile
logFile = "C:\Users\hp\Desktop\StockPro_Source\stockpro_source\frontend\deploy-font3-log.txt"

Dim cmd
cmd = "cmd.exe /c cd /d ""C:\Users\hp\Desktop\StockPro_Source\stockpro_source"" && git add frontend/public/index.html frontend/src/index.css frontend/src/App.jsx frontend/src/pages/Login.jsx frontend/src/pages/Dashboard.jsx frontend/src/pages/Rapports.jsx && git commit -m ""Fix polices: Montserrat partout (body + divs racine), Groote uniquement WariGest, tailles reduites"" && git push > """ & logFile & """ 2>&1"

shell.Run cmd, 0, True

Set f = fso.OpenTextFile(logFile, 1)
content = f.ReadAll
f.Close
MsgBox content, 64, "Deploy Font Final"
