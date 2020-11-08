package main

import (
	"log"
	"os"
)

// Build trigger `yarn pkg` with test contracts
func Build() {
	// Important step to setup test contracts instead of production one
	// We might want add an assert for being double assured.
	SetupExchangeContract()
	err, _, _ := Shellout("yarn pkg")
	if err != nil {
		log.Printf("error: %v\n", err)
		os.Exit(1)
	}
	Logger.Success("yarn pkg - Build succeeded")
}
