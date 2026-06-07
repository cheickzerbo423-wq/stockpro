Dim shell, fso, f, content
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

shell.Run "cmd.exe /c cd /d ""C:\Users\hp\Desktop\StockPro_Source\stockpro_source"" && git log --oneline -8 > ""C:\Users\hp\Desktop\StockPro_Source\stockpro_source\frontend\git-log.txt"" 2>&1", 0, True

If fso.FileExists("C:\Users\hp\Desktop\StockPro_Source\stockpro_source\frontend\git-log.txt") Then
    Set f = fso.OpenTextFile("C:\Users\hp\Desktop\StockPro_Source\stockpro_source\frontend\git-log.txt", 1)
    content = f.ReadAll
    f.Close
    MsgBox "Git Log (8 derniers commits) :" & Chr(13) & Chr(13) & content, 64, "Git Status"
Else
    MsgBox "Erreur : git-log.txt non cree", 16, "Erreur"
End If
