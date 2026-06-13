package ai

// 内置默认系统提示词，YAML 中留空时使用。
const (
	DefaultSystemPrompt          = "你是一个友好的 AI 助手，名叫 AI 助手。请用简洁、准确的中文回答问题。"
	DefaultTranslatePrompt       = "你是一个翻译助手。将用户提供的文本翻译成目标语言。只输出翻译结果，不要解释。"
	DefaultSummarizePrompt       = "你是一个摘要助手。将用户提供的多条消息总结为简洁的摘要。包含关键话题、主要结论和待办事项（如有）。"
	DefaultCompleteSimplePrompt  = "你是一个输入预测助手。根据用户已输入的文字，预测用户接下来最可能输入的一个词（1-4个字）。直接返回预测的词，不要加任何解释或标点。"
	DefaultCompleteMediumPrompt  = "你是一个输入预测助手。根据用户已输入的文字，预测用户接下来最可能输入的一个短语（2-8个字）。直接返回预测的短语，不要加任何解释或标点。"
	DefaultCompleteComplexPrompt = "你是一个输入预测助手。根据用户已输入的文字，预测用户接下来最可能输入的一句话（5-20个字）。直接返回预测的句子，不要加任何解释或标点。"
	DefaultPredictQuestionPrompt = "你是一个问答预测助手。根据用户输入的文字，预测用户可能想问的问题，并给出简短答案。直接返回JSON格式，不要加任何其他内容。格式：{\"question\":\"问题\",\"answer\":\"答案\"}"
)

// TimeoutConfig 超时配置。
type TimeoutConfig struct {
	Chat   int `mapstructure:"chat"`
	Stream int `mapstructure:"stream"`
}

// TranslateConfig 翻译工具配置。
type TranslateConfig struct {
	Temperature float64 `mapstructure:"temperature"`
	MaxTokens   int     `mapstructure:"max_tokens"`
}

// SummarizeConfig 摘要工具配置。
type SummarizeConfig struct {
	Temperature float64 `mapstructure:"temperature"`
	MaxTokens   int     `mapstructure:"max_tokens"`
}

// CompleteConfig 输入补全配置。
type CompleteConfig struct {
	MaxTokens int `mapstructure:"max_tokens"`
}

// PredictConfig 问题预测配置。
type PredictConfig struct {
	MaxTokens int `mapstructure:"max_tokens"`
}

// TranscribeConfig 语音转写配置。
type TranscribeConfig struct {
	Enabled bool   `mapstructure:"enabled"`
	Model   string `mapstructure:"model"`
}

// EnableConfig 功能开关配置。
type EnableConfig struct {
	Chat       bool `mapstructure:"chat"`
	Stream     bool `mapstructure:"stream"`
	Tools      bool `mapstructure:"tools"`
	Search     bool `mapstructure:"search"`
	Transcribe bool `mapstructure:"transcribe"`
}

// Config AI 模块配置。
type Config struct {
	Provider      string          `mapstructure:"provider"`
	APIKey        string          `mapstructure:"api_key"`
	Model         string          `mapstructure:"model"`
	BaseURL       string          `mapstructure:"base_url"`
	Temperature   float64         `mapstructure:"temperature"`
	MaxTokens     int             `mapstructure:"max_tokens"`
	ContextWindow int             `mapstructure:"context_window"`
	Timeout       TimeoutConfig   `mapstructure:"timeout"`
	Translate     TranslateConfig `mapstructure:"translate"`
	Summarize     SummarizeConfig `mapstructure:"summarize"`
	Complete      CompleteConfig  `mapstructure:"complete"`
	Predict       PredictConfig   `mapstructure:"predict"`
	Transcribe    TranscribeConfig `mapstructure:"transcribe"`
	Enable        EnableConfig    `mapstructure:"enable"`

	// 系统提示词
	SystemPrompt          string `mapstructure:"system_prompt"`
	TranslatePrompt       string `mapstructure:"translate_prompt"`
	SummarizePrompt       string `mapstructure:"summarize_prompt"`
	CompleteSimplePrompt  string `mapstructure:"complete_simple_prompt"`
	CompleteMediumPrompt  string `mapstructure:"complete_medium_prompt"`
	CompleteComplexPrompt string `mapstructure:"complete_complex_prompt"`
	PredictQuestionPrompt string `mapstructure:"predict_question_prompt"`
}

// NewProvider 根据配置创建 AI Provider。
func NewProvider(cfg Config) Provider {
	if cfg.Provider == "ollama" && cfg.BaseURL == "" {
		cfg.BaseURL = "http://localhost:11434/v1"
	}
	return NewOpenAIProvider(cfg.APIKey, cfg.Model, cfg.BaseURL)
}
