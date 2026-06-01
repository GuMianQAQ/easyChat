package ai

import "sync/atomic"

type Stats struct {
	chatCalls      int64
	streamCalls    int64
	translateCalls int64
	summarizeCalls int64
	searchCalls    int64
	completeCalls  int64
	predictCalls   int64
}

func NewStats() *Stats {
	return &Stats{}
}

func (s *Stats) RecordChat()      { atomic.AddInt64(&s.chatCalls, 1) }
func (s *Stats) RecordStream()    { atomic.AddInt64(&s.streamCalls, 1) }
func (s *Stats) RecordTranslate() { atomic.AddInt64(&s.translateCalls, 1) }
func (s *Stats) RecordSummarize() { atomic.AddInt64(&s.summarizeCalls, 1) }
func (s *Stats) RecordSearch()    { atomic.AddInt64(&s.searchCalls, 1) }
func (s *Stats) RecordComplete()  { atomic.AddInt64(&s.completeCalls, 1) }
func (s *Stats) RecordPredict()   { atomic.AddInt64(&s.predictCalls, 1) }

type StatsSnapshot struct {
	Chat      int64 `json:"chat"`
	Stream    int64 `json:"stream"`
	Translate int64 `json:"translate"`
	Summarize int64 `json:"summarize"`
	Search    int64 `json:"search"`
	Complete  int64 `json:"complete"`
	Predict   int64 `json:"predict"`
	Total     int64 `json:"total"`
}

func (s *Stats) Snapshot() StatsSnapshot {
	snapshot := StatsSnapshot{
		Chat:      atomic.LoadInt64(&s.chatCalls),
		Stream:    atomic.LoadInt64(&s.streamCalls),
		Translate: atomic.LoadInt64(&s.translateCalls),
		Summarize: atomic.LoadInt64(&s.summarizeCalls),
		Search:    atomic.LoadInt64(&s.searchCalls),
		Complete:  atomic.LoadInt64(&s.completeCalls),
		Predict:   atomic.LoadInt64(&s.predictCalls),
	}
	snapshot.Total = snapshot.Chat + snapshot.Stream + snapshot.Translate +
		snapshot.Summarize + snapshot.Search + snapshot.Complete + snapshot.Predict
	return snapshot
}
