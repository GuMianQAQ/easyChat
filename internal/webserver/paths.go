package webserver

import (
	"os"
	"path/filepath"
)

type runtimePaths struct {
	rootDir    string
	dbPath     string
	uploadsDir string
	distDir    string
}

func resolveRuntimePaths() runtimePaths {
	rootDir := resolveProjectRoot()
	dbPath := firstExistingPath(
		os.Getenv("EASYCHAT_DB_PATH"),
		filepath.Join(rootDir, "data", "chat.db"),
	)
	if dbPath == "" {
		dbPath = filepath.Join(rootDir, "data", "chat.db")
	}

	uploadsDir := firstExistingDir(
		os.Getenv("EASYCHAT_UPLOADS_DIR"),
		filepath.Join(rootDir, "uploads"),
	)
	if uploadsDir == "" {
		uploadsDir = filepath.Join(rootDir, "uploads")
	}

	distDir := firstExistingDir(
		os.Getenv("EASYCHAT_FRONTEND_DIST"),
		filepath.Join(rootDir, "frontend", "dist"),
		filepath.Join(rootDir, "dist"),
	)
	if distDir == "" {
		distDir = filepath.Join(rootDir, "frontend", "dist")
	}

	return runtimePaths{
		rootDir:    rootDir,
		dbPath:     dbPath,
		uploadsDir: uploadsDir,
		distDir:    distDir,
	}
}

func resolveProjectRoot() string {
	for _, candidate := range rootCandidates() {
		if looksLikeProjectRoot(candidate) {
			return candidate
		}
	}

	if wd, err := os.Getwd(); err == nil && wd != "" {
		return wd
	}

	if exePath, err := os.Executable(); err == nil && exePath != "" {
		return filepath.Dir(exePath)
	}

	return "."
}

func rootCandidates() []string {
	seen := make(map[string]struct{})
	var roots []string

	addRoot := func(path string) {
		if path == "" {
			return
		}
		absPath, err := filepath.Abs(path)
		if err != nil {
			return
		}
		for current := absPath; current != "" && current != filepath.Dir(current); current = filepath.Dir(current) {
			if _, ok := seen[current]; ok {
				continue
			}
			seen[current] = struct{}{}
			roots = append(roots, current)
		}
		if _, ok := seen[absPath]; !ok {
			seen[absPath] = struct{}{}
			roots = append(roots, absPath)
		}
	}

	addRoot(os.Getenv("EASYCHAT_ROOT"))

	if wd, err := os.Getwd(); err == nil {
		addRoot(wd)
	}

	if exePath, err := os.Executable(); err == nil {
		addRoot(filepath.Dir(exePath))
	}

	return roots
}

func looksLikeProjectRoot(root string) bool {
	if root == "" {
		return false
	}

	if info, err := os.Stat(filepath.Join(root, "frontend", "dist")); err == nil && info.IsDir() {
		return true
	}
	if info, err := os.Stat(filepath.Join(root, "frontend")); err == nil && info.IsDir() {
		return true
	}
	if info, err := os.Stat(filepath.Join(root, "go.mod")); err == nil && !info.IsDir() {
		return true
	}

	return false
}

func firstExistingPath(paths ...string) string {
	for _, candidate := range paths {
		if candidate == "" {
			continue
		}
		absCandidate, err := filepath.Abs(candidate)
		if err != nil {
			continue
		}
		if info, err := os.Stat(absCandidate); err == nil && !info.IsDir() {
			return absCandidate
		}
	}
	return ""
}

func firstExistingDir(paths ...string) string {
	for _, candidate := range paths {
		if candidate == "" {
			continue
		}
		absCandidate, err := filepath.Abs(candidate)
		if err != nil {
			continue
		}
		if info, err := os.Stat(absCandidate); err == nil && info.IsDir() {
			return absCandidate
		}
	}
	return ""
}
