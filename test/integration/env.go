package main

import (
	"log"
	"os"
	"io/ioutil"
)

// SetupKeyFile reads `KEYFILE` env variable and writes it to arweave-keyfile.json
func SetupKeyFile() {
	keyfile := os.Getenv("KEYFILE")
	err := ioutil.WriteFile("./arweave-keyfile.json", []byte(keyfile), 0644)
	if err != nil {
		log.Printf("error: %v\n", err)
		os.Exit(1)
	}
	Logger.Success("Keyfile created successfully")
}
