package main

import (
	"os"
	"os/exec"

	"syscall"
)

func main() {
	ServeInstallers()
	binary, lookErr := exec.LookPath("pwsh")
	if lookErr != nil {
		panic(lookErr)
	}
	args := []string{"pwsh", "./install/windows.ps1"}

	env := os.Environ()
	env = append(env, "VERTO_URI=http://localhost:3000/verto")
	execErr := syscall.Exec(binary, args, env)
	if execErr != nil {
		panic(execErr)
	}

}
