// +build windows

package main

// TODO(littledivy): Use powershell?
const ShellToUse = "cmd"
const InstallCmd = "iwr https://verto.exchange/i/windows | iex"
const ZipCmd = `
$sqlite3=$(gci -filter "node_sqlite3.node" -af -s -name)
Compress-Archive -CompressionLevel Optimal -Force -Path verto.exe, README.md, LICENSE, $sqlite3 -DestinationPath verto.zip
`
