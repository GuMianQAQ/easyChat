package ai

import "sync/atomic"

type Stats struct {
	chatCalls      int64
	streamCalls    int64
	translateCalls int64
	summarizeCalls int64
	replyCalls     int64
	codeCalls      int64
	searchCalls    int64
}

func NewStats() *Stats {
	return &Stats{}
}

func (s *Stats) RecordChat()      { atomic.AddInt64(&s.chatCalls, 1) }
func (s *Stats) RecordStream()    { atomic.AddInt64(&s.streamCalls, 1) }
func (s *Stats) RecordTranslate() { atomic.AddInt64(&s.translateCalls, 1) }
func (s *Stats) RecordSummarize() { atomic.AddInt64(&s.summarizeCalls, 1) }
func (s *Stats) RecordReply()     { atomic.AddInt64(&s.replyCalls, 1) }
func (s *Stats) RecordCode()      { atomic.AddInt64(&s.codeCalls, 1) }
func (s *Stats) RecordSearch()    { atomic.AddInt64(&s.searchCalls, 1) }

type StatsSnapshot struct {
	Chat      int64 `json:"chat"`
	Stream    int64 `json:"stream"`
	Translate int64 `json:"translate"`
	Summarize int64 `json:"summarize"`
	Replies   int64 `json:"replies"`
	Code      int64 `json:"code"`
	Search    int64 `json:"search"`
	Total     int64 `json:"total"`
}

func (s *Stats) Snapshot() StatsSnapshot {
	snapshot := StatsSnapshot{
		Chat:      atomic.LoadInt64(&s.chatCalls),
		Stream:    atomic.LoadInt64(&s.streamCalls),
		Translate: atomic.LoadInt64(&s.translateCalls),
		Summarize: atomic.LoadInt64(&s.summarizeCalls),
		Replies:   atomic.LoadInt64(&s.replyCalls),
		Code:      atomic.LoadInt64(&s.codeCalls),
		Search:    atomic.LoadInt64(&s.searchCalls),
	}
	snapshot.Total = snapshot.Chat + snapshot.Stream + snapshot.Translate +
		snapshot.Summarize + snapshot.Replies + snapshot.Code + snapshot.Search
	return snapshot
}
