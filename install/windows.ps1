$ErrorActionPreference = 'Stop'

if ($args.Length -eq 1) {
  $v = $args.Get(0)
}

$VertoInstall = $env:VERTO_INSTALL
$BinDir = if ($VertoInstall) {
  "$VertoInstall"
} else {
  "$Home\.verto"
}

$VertoZip = "$BinDir\verto.zip"
$VertoExe = "$BinDir\verto.exe"

# GitHub requires TLS 1.2
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$VertoUri = if (!$v) {
  "https://github.com/useverto/trading-post/releases/latest/download/verto-x64-windows.zip"
} else {
  "https://github.com/useverto/trading-post/releases/download/${v}/verto-x64-windows.zip"
}

if (!(Test-Path $BinDir)) {
  New-Item $BinDir -ItemType Directory | Out-Null
}

Invoke-WebRequest $VertoUri -OutFile $VertoZip -UseBasicParsing

if (Get-Command Expand-Archive -ErrorAction SilentlyContinue) {
  Expand-Archive $VertoZip -Destination $BinDir -Force
} else {
  if (Test-Path $VertoExe) {
    Remove-Item $VertoExe
  }
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  [IO.Compression.ZipFile]::ExtractToDirectory($VertoZip, $BinDir)
}

Remove-Item $VertoZip

$User = [EnvironmentVariableTarget]::User
$Path = [Environment]::GetEnvironmentVariable('Path', $User)
if (!(";$Path;".ToLower() -like "*;$BinDir;*".ToLower())) {
  [Environment]::SetEnvironmentVariable('Path', "$Path;$BinDir", $User)
  $Env:Path += ";$BinDir"
}

Write-Output "Verto Trading Post was installed successfully to $VertoExe"
Write-Output "Run 'verto --help' to get started"
