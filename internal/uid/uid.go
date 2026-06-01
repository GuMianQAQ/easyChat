// Package uid 提供全局唯一的 ID 生成功能。
// 生成格式为 "prefix-随机十六进制串"，例如 "usr-a1b2c3d4..."。
// 当加密随机数生成失败时，回退到基于时间戳的 ID。
package uid

import (
	"crypto/rand"
	"fmt"
	"time"
)

// New 生成一个带前缀的唯一 ID。
// prefix 为 ID 前缀，如 "usr"、"msg"、"frd" 等。
// 返回格式：prefix-32位十六进制字符串。
// 若 crypto/rand 失败，回退为 prefix-时间戳。
func New(prefix string) string {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return fmt.Sprintf("%s-%d", prefix, time.Now().UnixNano())
	}
	return fmt.Sprintf("%s-%x", prefix, buf)
}
