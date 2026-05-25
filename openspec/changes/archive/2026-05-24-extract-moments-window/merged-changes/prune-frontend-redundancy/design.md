## Context

The current frontend is functional, but several recent product moves left behind residual structure. Moments now lives in a dedicated desktop window, yet some shared shell and type surfaces still reflect its old dock-based shape. At the same time, conversation and desktop-attention helpers still perform repeated `find`, `findIndex`, and whole-list `sort` work on hot paths where the state shape is already known. This change is not about redesigning the app architecture from scratch; it is about removing confirmed leftovers and simplifying the hottest frontend update paths while preserving behavior.

## Goals / Non-Goals

**Goals:**
- Remove verified stale frontend branches and duplicate shell/style wiring that no longer serve the current product shape.
- Reduce repeated list scans and avoid unnecessary whole-list work in the hottest conversation and desktop-attention update paths.
- Keep cleanup local and reviewable so user-visible behavior stays stable.
- Use the cleanup to make future frontend changes easier to reason about, especially around shell state and conversation updates.

**Non-Goals:**
- No product redesign or layout overhaul.
- No new backend endpoints, schema changes, or cross-runtime protocol changes.
- No broad rewrite of `App.tsx` or the socket stack in one step.
- No speculative cleanup of modules that only look old but are still active.

## Decisions

### 1. Treat this as targeted pruning, not a large refactor
The change will only remove paths that can be proven stale from current runtime flow, such as obsolete Moments dock variants and duplicate style wiring. This keeps the scope bounded and avoids trading one maintainability problem for a larger regression surface.

Alternative considered:
- Broader shell and state rewrite now. Rejected because it would mix cleanup, behavioral change, and architecture work into one high-risk batch.

### 2. Prefer data-shape tightening on hot paths over cosmetic helper churn
The most valuable optimizations are in helpers that run on incoming messages, attention updates, and conversation mutations. The change should reduce repeated `find`/`sort` work by reusing known current entries, caching lookups where appropriate, and converging repeated update logic onto fewer paths.

Alternative considered:
- Remove only obvious dead code and ignore helper complexity. Rejected because the highest maintenance drag is in still-live code that is unnecessarily repetitive.

### 3. Keep the cleanup behavior-preserving and prove it through existing checks
This change should not introduce new UI capabilities. It should preserve current chat, desktop attention, and Moments behavior while shrinking the amount of code needed to express those behaviors.

Alternative considered:
- Use the cleanup to also reshape major state boundaries. Rejected because the current objective is pruning and simplification, not another large maintainability campaign.

## Risks / Trade-offs

- **[Risk]** A path that looks stale may still be referenced indirectly.  
  **Mitigation:** only remove branches after verifying there is no remaining import, runtime route, or type dependency.

- **[Risk]** Hot-path simplifications may accidentally change ordering or unread semantics.  
  **Mitigation:** keep helper changes narrow and preserve current sort/unread behavior, then validate with existing frontend and behavior tests.

- **[Risk]** Cleanup may reduce local readability if over-optimized.  
  **Mitigation:** favor simpler state flow and lookup reuse, not micro-optimizations that obscure intent.

- **[Risk]** `App.tsx` remains large even after this pass.  
  **Mitigation:** accept that this change is pruning-oriented; if the file is still too large afterward, a later proposal can tackle structural decomposition separately.
