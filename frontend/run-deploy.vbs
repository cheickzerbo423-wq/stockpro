Dim shell
Set shell = CreateObject("WScript.Shell")
shell.CurrentDirectory = "C:\Users\hp\Desktop\StockPro_Source\stockpro_source"
shell.Run "powershell.exe -ExecutionPolicy Bypass -File ""C:\Users\hp\Desktop\StockPro_Source\stockpro_source\deploy.ps1"" > ""C:\Users\hp\Desktop\StockPro_Source\stockpro_source\frontend\deploy-log.txt"" 2>&1", 1, True
MsgBox "Deploy termine ! Voir deploy-log.txt", 64, "Deploy"
