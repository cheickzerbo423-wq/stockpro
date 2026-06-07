Dim shell, fso, f, content
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

Dim logFile
logFile = "C:\Users\hp\Desktop\StockPro_Source\stockpro_source\frontend\remote-log.txt"

shell.Run "cmd.exe /c cd /d ""C:\Users\hp\Desktop\StockPro_Source\stockpro_source"" && (git remote -v && echo --- && git branch -vv && echo --- && git log --oneline -3) > """ & logFile & """ 2>&1", 0, True

Set f = fso.OpenTextFile(logFile, 1)
content = f.ReadAll
f.Close
MsgBox content, 64, "Remote Info"
