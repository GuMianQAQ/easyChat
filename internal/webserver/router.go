package webserver

import (
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"easyChat/internal/ai"
	"easyChat/internal/auth"
	"easyChat/internal/chatstore"
	"easyChat/internal/config"
	"easyChat/internal/database"
	"easyChat/internal/moments"
	"easyChat/internal/social"
	"easyChat/internal/webchat"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"gorm.io/gorm"
)

type Server struct {
	Addr            string
	Hub             *webchat.Hub
	Auth            *auth.Service
	Store           *chatstore.Service
	Social          *social.Service
	AI              *ai.Service
	Moments         *moments.Service
	corsConfig      config.CORSConfig
	frontendDistDir string
	uploadsDir      string
}

func NewServer(cfg *config.AppConfig) *Server {
	paths := resolveRuntimePaths()

	db, err := database.Open(paths.dbPath)
	if err != nil {
		log.Fatalf("failed to open database: %v", err)
	}
	if err := database.AutoMigrate(db); err != nil {
		log.Fatalf("failed to migrate database: %v", err)
	}

	authService, err := auth.NewService(db, cfg.Auth)
	if err != nil {
		log.Fatalf("failed to initialize auth service: %v", err)
	}
	store, err := chatstore.NewService(db, paths.uploadsDir, cfg.Upload)
	if err != nil {
		log.Fatalf("failed to initialize chat store: %v", err)
	}
	socialService, err := social.NewService(db)
	if err != nil {
		log.Fatalf("failed to initialize social service: %v", err)
	}

	aiProvider := ai.NewProvider(cfg.AI)
	aiService := ai.NewService(aiProvider, store, db, cfg.AI)

	if err := ai.EnsureSystemUser(db); err != nil {
		log.Printf("warning: failed to create AI system user: %v", err)
	}
	authService.SetAfterRegister(func(tx *gorm.DB, user auth.User) error {
		return socialService.EnsureSystemFriendInTx(tx, user.ID)
	})

	return &Server{
		Addr:            cfg.Server.Addr,
		Hub:             webchat.NewHub(cfg.WebSocket),
		Auth:            authService,
		Store:           store,
		Social:          socialService,
		AI:              aiService,
		Moments:         moments.NewService(db, socialService),
		corsConfig:      cfg.CORS,
		frontendDistDir: paths.distDir,
		uploadsDir:      paths.uploadsDir,
	}
}

func (s *Server) Run() error {
	router := gin.New()
	router.Use(gin.Logger(), gin.Recovery())
	router.Use(ErrorHandler())
	s.registerAPIRoutes(router)
	router.GET("/ws", s.handleWebSocket)
	s.registerFrontendRoutes(router)

	go s.Hub.Run()

	log.Printf("web server listening on http://%s", s.Addr)
	return router.Run(s.Addr)
}

func (s *Server) registerAPIRoutes(router *gin.Engine) {
	api := router.Group("/api")
	api.Use(s.corsMiddleware())

	s.registerPublicAuthRoutes(api)

	protected := api.Group("")
	protected.Use(s.authMiddleware())

	s.registerProtectedAuthRoutes(protected)
	s.registerConversationRoutes(protected)
	s.registerGroupRoutes(protected)
	s.registerMessageRoutes(protected)
	s.registerFavoriteRoutes(protected)
	s.registerFileRoutes(protected)
	s.registerFriendRoutes(protected)
	s.registerMomentRoutes(protected)
	s.registerAIRoutes(protected)
	s.registerVoteRoutes(protected)
	s.registerSolitaireRoutes(protected)
}

func (s *Server) corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", s.corsConfig.AllowOrigin)
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Authorization,Content-Type,Accept,Origin,X-Requested-With")
		c.Writer.Header().Set("Access-Control-Max-Age", strconv.Itoa(s.corsConfig.MaxAge))

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
	if token := strings.TrimSpace(c.Query("token")); token != "" {
		return token
	}
	return ""
}

func (s *Server) authMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := bearerToken(c)
		if token == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "未提供认证令牌"})
			return
		}

		user, err := s.Auth.UserFromToken(token)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "认证失败"})
			return
		}

		c.Set("user", user)
		c.Next()
	}
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

	client := webchat.NewClient(s.Hub, s.Store, s.Social, s.AI, conn, user)
	s.Hub.Register(client)
	client.Start()
}
