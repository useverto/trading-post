package main

import (
	"bytes"
	"fmt"
	"log"
	"os/exec"
)

const startupText = "VERTO INTEGRATION TEST SUITE 1.0"

var logger = TestLogger{}

type Commands struct {
	command string
}

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
	err, out, _ := Shellout("./verto orders -c verto.config.example.json")
	if err != nil {
		log.Printf("error: %v\n", err)
	}
	logger.Success(out)
}
