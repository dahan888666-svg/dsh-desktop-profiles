param(
  [Parameter(Mandatory = $true)][string]$InstallDir,
  [Parameter(Mandatory = $true)][string]$Launcher
)
$ErrorActionPreference = 'SilentlyContinue'
$install = [IO.Path]::GetFullPath($InstallDir).TrimEnd('\')
$exe = Join-Path $install 'DeepSeek Harness.exe'
$launcherPath = [IO.Path]::GetFullPath($Launcher)
$shell = New-Object -ComObject WScript.Shell
$changed = 0

# Point existing shortcuts of THIS installation at the self-healing launcher.
$roots = @(
  [Environment]::GetFolderPath('Desktop'),
  (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs')
)
foreach ($root in $roots) {
  if (-not (Test-Path $root)) { continue }
  Get-ChildItem -Path $root -Recurse -Filter '*.lnk' -ErrorAction SilentlyContinue | ForEach-Object {
    try {
      $link = $shell.CreateShortcut($_.FullName)
      if ($link.TargetPath -eq $exe) {
        $link.TargetPath = $launcherPath
        $link.WorkingDirectory = Split-Path $launcherPath
        $link.Save()
        $changed++
      }
    } catch {}
  }
}

# Always keep one clearly named entry point.
$desktop = [Environment]::GetFolderPath('Desktop')
if ($desktop) {
  try {
    $shortcut = $shell.CreateShortcut((Join-Path $desktop 'DeepSeek Harness (Profiles).lnk'))
    $shortcut.TargetPath = $launcherPath
    $shortcut.WorkingDirectory = Split-Path $launcherPath
    $shortcut.Description = 'DeepSeek Harness with desktop profiles'
    $shortcut.Save()
  } catch {}
}
Write-Output "shortcuts updated: $changed"
