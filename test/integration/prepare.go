package main

func PrepareZip() {
	err, stderr, _ := Shellout(ZipCmd)
	if err != nil {
		Logger.Error(stderr)
		panic(err)
	}
}
