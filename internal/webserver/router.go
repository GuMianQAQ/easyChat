package webserver

import (
	"log"
	"net/http"
	"os"
	"path/filepath"

	"easyChat/internal/auth"
	"easyChat/internal/chatstore"
	"easyChat/internal/database"
	"easyChat/internal/moments"
	"easyChat/internal/social"
	"easyChat/internal/webchat"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

type Server struct {
	Addr            string
	Hub             *webchat.Hub
	Auth            *auth.Service
	Store           *chatstore.Service
	Social          *social.Service
	Moments         *moments.Service
	frontendDistDir string
	uploadsDir      string
}

func NewServer(addr string) *Server {
	paths := resolveRuntimePaths()

	db, err := database.Open(paths.dbPath)
	if err != nil {
		log.Fatalf("failed to open database: %v", err)
	}
	if err := database.AutoMigrate(db); err != nil {
		log.Fatalf("failed to migrate database: %v", err)
	}

	authService, err := auth.NewService(db)
	if err != nil {
		log.Fatalf("failed to initialize auth service: %v", err)
	}
	store, err := chatstore.NewService(db, paths.uploadsDir)
	if err != nil {
		log.Fatalf("failed to initialize chat store: %v", err)
	}
	socialService, err := social.NewService(db)
	if err != nil {
		log.Fatalf("failed to initialize social service: %v", err)
	}

	return &Server{
		Addr:            addr,
		Hub:             webchat.NewHub(),
		Auth:            authService,
		Store:           store,
		Social:          socialService,
		Moments:         moments.NewService(db, socialService),
		frontendDistDir: paths.distDir,
		uploadsDir:      paths.uploadsDir,
	}
}

func (s *Server) Run() error {
	router := gin.New()
	router.Use(gin.Logger(), gin.Recovery())
	s.registerAPIRoutes(router)
	router.GET("/ws", s.handleWebSocket)
	s.registerFrontendRoutes(router)

	go s.Hub.Run()

	log.Printf("web server listening on http://%s", s.Addr)
	return router.Run(s.Addr)
}

func (s *Server) registerAPIRoutes(router *gin.Engine) {
	api := router.Group("/api")
	api.Use(corsMiddleware())

	s.registerAuthRoutes(api)
	s.registerConversationRoutes(api)
	s.registerGroupRoutes(api)
	s.registerMessageRoutes(api)
	s.registerFavoriteRoutes(api)
	s.registerFileRoutes(api)
	s.registerFriendRoutes(api)
	s.registerMomentRoutes(api)
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Authorization,Content-Type,Accept,Origin,X-Requested-With")
		c.Writer.Header().Set("Access-Control-Max-Age", "3600")

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

func bearerToken(c *gin.Context) string {
	header := c.GetHeader("Authorization")
	if len(header) > 7 && header[:7] == "Bearer " {
		return header[7:]
	}
	return ""
}

func (s *Server) registerFrontendRoutes(router *gin.Engine) {
	distDir := s.frontendDistDir
	indexPath := filepath.Join(distDir, "index.html")
	assetsPath := filepath.Join(distDir, "assets")
	uploadsPath := s.uploadsDir

	if info, err := os.Stat(assetsPath); err == nil && info.IsDir() {
		router.Static("/assets", assetsPath)
	}
	if info, err := os.Stat(uploadsPath); err == nil && info.IsDir() {
		router.Static("/uploads", uploadsPath)
	}

	if info, err := os.Stat(indexPath); err == nil && !info.IsDir() {
		router.GET("/", func(c *gin.Context) {
			c.File(indexPath)
		})
		router.NoRoute(func(c *gin.Context) {
			if c.Request.Method != http.MethodGet {
				c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
				return
			}
			c.File(indexPath)
		})
		return
	}

	router.GET("/", func(c *gin.Context) {
		c.Data(
			http.StatusOK,
			"text/plain; charset=utf-8",
			[]byte("frontend dist not found. Build the frontend first, or set EASYCHAT_FRONTEND_DIST to the built dist directory."),
		)
	})
}

func (s *Server) handleWebSocket(c *gin.Context) {
	user, err := s.Auth.UserFromToken(c.Query("token"))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true
		},
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("websocket upgrade failed: %v", err)
		return
	}

	client := webchat.NewClient(s.Hub, s.Store, s.Social, conn, user)
	s.Hub.Register(client)
	client.Start()
}
