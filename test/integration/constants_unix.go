// +build !windows

package main

const ShellToUse = "bash"
const InstallCmd = "curl -fsSL http://localhost:3000/install/linux.sh | sh"
const ZipCmd = `
sqlite3=$(find . -name node_sqlite3.node)
cp $sqlite3 ./node_sqlite3.node
zip -r verto.zip verto README.md LICENSE node_sqlite3.node
rm ./node_sqlite3.node
`
