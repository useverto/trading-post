package main

import (
	"os"
	"time"
)

func StartTradingPost() {
	ch := make(chan bool, 1)
	command := "./verto -c verto.config.example.json -k arweave-keyfile.json"
	go func() {
		err, stderr, _ := Shellout(command)
		if err != nil {
			Logger.Error(stderr)
			os.Exit(1)
		}
		Logger.Success(command)
		ch <- true
	}()
	select {
	case <-ch:
	case <-time.After(1 * time.Millisecond):
		Logger.Success(command)
	}
}
