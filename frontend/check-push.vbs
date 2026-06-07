Dim shell, fso, f, content
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

shell.Run "cmd.exe /c cd /d ""C:\Users\hp\Desktop\StockPro_Source\stockpro_source"" && git log --oneline origin/HEAD -3 2>&1 >> ""C:\Users\hp\Desktop\StockPro_Source\stockpro_source\frontend\push-status.txt"" && echo --- >> ""C:\Users\hp\Desktop\StockPro_Source\stockpro_source\frontend\push-status.txt"" && git status --short 2>&1 >> ""C:\Users\hp\Desktop\StockPro_Source\stockpro_source\frontend\push-status.txt""", 0, True

If fso.FileExists("C:\Users\hp\Desktop\StockPro_Source\stockpro_source\frontend\push-status.txt") Then
    Set f = fso.OpenTextFile("C:\Users\hp\Desktop\StockPro_Source\stockpro_source\frontend\push-status.txt", 1)
    content = f.ReadAll
    f.Close
    MsgBox "Remote HEAD + git status :" & Chr(13) & Chr(13) & content, 64, "Push Status"
Else
    MsgBox "Erreur : fichier non cree", 16, "Erreur"
End If
