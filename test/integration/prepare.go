package main

import (
	"log"
)

func PrepareZip() {
	err, stderr, _ := Shellout(ZipCmd)
	if err != nil {
		log.Printf("error: %v\n", stderr)
		panic(err)
	}
}
