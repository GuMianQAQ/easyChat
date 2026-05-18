package main

import (
	"flag"
	"fmt"
	"log"
	"os"

	"easyChat/internal/webserver"
)

func main() {
	runWeb(os.Args[1:])
}

func runWeb(args []string) {
	fs := flag.NewFlagSet("web", flag.ExitOnError)
	addr := fs.String("addr", "127.0.0.1:8080", "Gin server listen address")
	_ = fs.Parse(args)

	app := webserver.NewServer(*addr)
	if err := app.Run(); err != nil {
		log.Printf("failed to start Gin server: %v", err)
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
