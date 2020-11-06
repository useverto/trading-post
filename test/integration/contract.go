package main

import (
	"log"
	"os"
	"io/ioutil"
)

const testConstants = `
exchangeContractSrc: fE2OcfjlS-sHqG5K8QvxE8wHtcqKxS-YV0bDEgxo-eI
exchangeWallet: aLemOhg9OGovn-0o4cOCbueiHT9VgdYnpJpq7NgMA1A
maxInt: 2147483647
`

func SetupExchangeContract() {
	err := ioutil.WriteFile("./src/utils/constants.yml", []byte(testConstants), 0644)
	if err != nil {
		log.Printf("error: %v\n", err)
		os.Exit(1)
	}
	Logger.Success("Contract updated successfully")
}
