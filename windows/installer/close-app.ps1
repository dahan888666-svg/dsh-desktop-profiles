param(
  [Parameter(Mandatory = $true)][string]$InstallDir,
  [switch]$Check
)
$ErrorActionPreference = 'SilentlyContinue'
$root = [IO.Path]::GetFullPath($InstallDir).TrimEnd('\')
function Get-OwnedProcesses {
  Get-CimInstance Win32_Process -Filter "name='DeepSeek Harness.exe'" |
    Where-Object { $_.ExecutablePath -and $_.ExecutablePath.StartsWith($root + '\', [StringComparison]::OrdinalIgnoreCase) }
}
$owned = @(Get-OwnedProcesses)
if ($Check) {
  if ($owned.Count -gt 0) { Write-Output '1' } else { Write-Output '0' }
  exit 0
}
foreach ($process in $owned) { Stop-Process -Id $process.ProcessId -Force }
for ($attempt = 0; $attempt -lt 30; $attempt++) {
  if (@(Get-OwnedProcesses).Count -eq 0) { exit 0 }
  Start-Sleep -Milliseconds 300
}
exit 1
