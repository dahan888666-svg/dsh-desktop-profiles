param(
  [Parameter(Mandatory=$true)][string]$Toolchain,
  [Parameter(Mandatory=$true)][string]$Install
)
$ErrorActionPreference = 'Stop'
$root = Join-Path $env:LOCALAPPDATA 'dsh-desktop-profiles'
New-Item -ItemType Directory -Force -Path $root | Out-Null
Remove-Item (Join-Path $root 'STOP') -Force -ErrorAction SilentlyContinue
$loopPath = Join-Path $root 'repair-loop.vbs'
$stopPath = Join-Path $root 'STOP'
$vbs = @"
Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
toolchain = "$Toolchain"
install = "$Install"
node = install & "\resources\runtime\primary-runtime\dependencies\node\bin\node.exe"
repair = toolchain & "\windows\installer\repair.mjs"
stopFlag = "$stopPath"
Do While fso.FolderExists(toolchain) And Not fso.FileExists(stopFlag)
  If fso.FileExists(node) And fso.FileExists(repair) Then
    command = Chr(34) & node & Chr(34) & " " & Chr(34) & repair & Chr(34) & " " & Chr(34) & install & Chr(34) & " --toolchain " & Chr(34) & toolchain & Chr(34) & " --quiet"
    shell.Run command, 0, True
  End If
  WScript.Sleep 60000
Loop
"@
Set-Content -Path $loopPath -Value $vbs -Encoding ASCII
$startup = [Environment]::GetFolderPath('Startup')
$shortcut = Join-Path $startup 'DSH-Desktop-Profiles-Repair.lnk'
$shell = New-Object -ComObject WScript.Shell
$link = $shell.CreateShortcut($shortcut)
$link.TargetPath = Join-Path $env:SystemRoot 'System32\wscript.exe'
$link.Arguments = '"' + $loopPath + '"'
$link.WindowStyle = 7
$link.Description = 'DSH Desktop Profiles auto-repair'
$link.Save()
Start-Process -FilePath (Join-Path $env:SystemRoot 'System32\wscript.exe') -ArgumentList ('"' + $loopPath + '"') -WindowStyle Hidden
Write-Output ('watchdog installed: ' + $shortcut)
