package main

import (
	"log"
)

func PrepareZip() {
	err, stderr, _ := Shellout(`
	sqlite3=$(find . -name node_sqlite3.node)
	cp $sqlite3 ./node_sqlite3.node
	zip -r verto.zip verto README.md LICENSE node_sqlite3.node
	rm ./node_sqlite3.node
	`)
	if err != nil {
		log.Printf("error: %v\n", stderr)
		panic(err)
	}
}
