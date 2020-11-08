package main

import (
	"net/http"
)

func ServeInstallers() <-chan bool {
	done := make(chan bool, 1)
	go func() {
		// Serve the whole project folder to local HTTP Server
		// This will be used to test installers via URL just like a read-life situation
		// Also used for serving verto binaries generated via pkg
		http.Handle("/", http.FileServer(http.Dir(".")))
		http.ListenAndServe(":3000", nil)
		done <- true
	}()
	return done
}
