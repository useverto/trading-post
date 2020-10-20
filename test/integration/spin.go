package main

import (
	"log"
	"os"
)

func StartTradingPost() {
	command := "./verto -c verto.config.example.json -k arweave.json"
	err, stderr, _ := Shellout(command)
	if err != nil {
		log.Printf("error: %v\n", stderr)
		os.Exit(1)
	}
	Logger.Success(command)
}
