Dim shell
Set shell = CreateObject("WScript.Shell")
shell.CurrentDirectory = "C:\Users\hp\Desktop\StockPro_Source\stockpro_source\frontend"
shell.Run "cmd.exe /c npm run build > build-log.txt 2>&1", 1, True
MsgBox "Build termine ! Voir build-log.txt", 64, "Deploy"
