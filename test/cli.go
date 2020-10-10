package main

import (
    "bytes"
    "fmt"
    "log"
    "os/exec"
)

type Commands struct {
	command string
	
}
const ShellToUse = "bash"

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
    err, out, errout := Shellout("./verto")
    if err != nil {
        log.Printf("error: %v\n", err)
    }
    fmt.Println("--- stdout ---")
    fmt.Println(out)
    fmt.Println("--- stderr ---")
    fmt.Println(errout)
}
