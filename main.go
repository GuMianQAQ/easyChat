// 主程序入口文件
package main

import (
	"fmt"
	"log"
	"os"

	"easyChat/internal/config"
	"easyChat/internal/webserver"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Printf("failed to load config: %v", err)
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	app := webserver.NewServer(cfg)
	if err := app.Run(); err != nil {
		log.Printf("failed to start Gin server: %v", err)
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
