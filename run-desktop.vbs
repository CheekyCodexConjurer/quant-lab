Dim shell, fso, scriptPath, scriptDir, cmd

Set fso = CreateObject("Scripting.FileSystemObject")
scriptPath = WScript.ScriptFullName
scriptDir = fso.GetParentFolderName(scriptPath)

Set shell = CreateObject("WScript.Shell")
shell.CurrentDirectory = scriptDir

cmd = """" & scriptDir & "\desktop-launcher.bat"""
shell.Run cmd, 0, False

Set shell = Nothing
Set fso = Nothing

