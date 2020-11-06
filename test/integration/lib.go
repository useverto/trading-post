package main

import (
	"log"
	"os"
)

func RunLibTest() {
	err, _, _ := Shellout("node ./test/integration/lib.js")
	if err != nil {
		log.Printf("error: %v\n", err)
		os.Exit(1)
	}
	Logger.Success("Verto library integration test passed")
}
