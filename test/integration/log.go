package main

import "fmt"

const _brightGreen = "\u001b[32;1m";
const _reset = "\u001b[0m";

type TestLogger struct {}

func (logger *TestLogger) Success(out string) {
    fmt.Println(_brightGreen, "OK", _reset, "Pass", out)
}