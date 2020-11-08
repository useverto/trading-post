package main

func TestInstaller() {
	err, stderr, _ := Shellout(InstallCmd)
	if err != nil {
		Logger.Error(stderr)
		panic(err)
	}
	Logger.Success(InstallCmd)
}
