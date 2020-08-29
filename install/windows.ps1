$ErrorActionPreference = 'Stop'

if ($v) {
  $Version = ${v}
}

if ($args.Length -eq 1) {
  $Version = $args.Get(0)
}

$VertoInstall = $env:VERTO_INSTALL
$BinDir = if ($VertoInstall) {
  "$VertoInstall\bin"
} else {
  "$Home\.verto\bin"
}

$VertoZip = "$BinDir\verto.zip"
$VertoExe = "$BinDir\verto.exe"
$Target = 'windows'

# GitHub requires TLS 1.2
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$VertoUri = if (!$Version) {
  "https://github.com/vertoland/verto/releases/download/${Version}/verto-windows.zip"
} else {
  "https://github.com/vertoland/verto/releases/download/${Version}/verto-windows.zip"
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
