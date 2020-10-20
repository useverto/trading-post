package main

import "log"

func TestInstaller() {
	err, stderr, stdout := Shellout("curl -fsSL http://localhost:3000/install/linux.sh | sh")
	if err != nil {
		log.Printf("error: %v\n", stderr)
		panic(err)
	}
	log.Println(stdout)
}
