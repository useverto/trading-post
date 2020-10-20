package main

import (
	"bytes"
	"fmt"
	"log"
	"os"
	"os/exec"
)

const startupText = "VERTO INTEGRATION TEST SUITE 1.0"

var Logger = TestLogger{}

func Shellout(command string) (error, string, string) {
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	cmd := exec.Command(ShellToUse, "-c", command)
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	err := cmd.Run()
	return err, stdout.String(), stderr.String()
}

func main() {
	fmt.Println(startupText)
	go ServeInstallers()
	PrepareZip()
	TestInstaller()
	for _, value := range Commands {
		command := fmt.Sprintf("./verto %s", value)
		err, _, _ := Shellout(command)
		if err != nil {
			log.Printf("error: %v\n", err)
			os.Exit(1)
		}
		Logger.Success(command)
	}
	StartTradingPost()
}
