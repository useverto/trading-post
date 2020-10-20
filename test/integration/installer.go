package main

import "log"

func TestInstaller() {
	err, stderr, _ := Shellout(InstallCmd)
	if err != nil {
		log.Printf("error: %v\n", stderr)
		panic(err)
	}
	Logger.Success(InstallCmd)
}
