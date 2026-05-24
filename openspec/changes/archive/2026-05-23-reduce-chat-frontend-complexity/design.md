## Context

easyChat's main frontend maintenance problem is the width of the chat orchestration surface, not a lack of features. The hot path currently spans `App.tsx`, `createConversationActions.ts`, `useChatSocket.ts`, and `AppShell.tsx`, which means even modest chat changes require reloading too much state, side-effect, and shell-assembly context at once.

The project is primarily solo-maintained, so the design goal is practical maintainability rather than architecture theater. The change should reduce how much future work has to reason about at the same time, while preserving the current user-visible chat flows and reusing the existing behavior matrix as the regression guardrail.

## Goals / Non-Goals

**Goals:**
- Reduce the number of overlapping truth sources involved in the chat frontend's core flow.
- Separate the hottest frontend responsibilities into clearer domains such as session, chat, social, desktop, and preferences where that boundary pays for itself.
- Converge conversation-list mutations onto fewer update paths so refresh, incoming message, mark-read, clear, delete, and group actions stop scattering custom list updates.
- Narrow the shell assembly surface so top-level props and orchestration are easier to follow during future feature work.
- Preserve current chat behavior while refactoring.

**Non-Goals:**
- Introduce a brand-new global state framework such as Redux, Zustand, or XState.
- Redesign the visual interface or add major new chat features.
- Refactor every frontend module; only the hottest chat-facing paths are in scope.
- Change backend behavior or API contracts unless a tiny helper adjustment is required to support the refactor.

## Decisions

### Decision: Optimize for future solo maintenance, not for maximum abstraction
This change will be judged by whether future chat changes require understanding fewer moving parts, not by whether the frontend becomes theoretically perfect. The design should favor direct, readable local boundaries over elaborate framework-driven patterns.

Alternative considered:
- Perform a sweeping architecture cleanup across the entire frontend.
Why rejected:
- That would expand scope and create more churn than a solo-maintained project needs.

### Decision: Treat chat flow complexity as a domain-boundary problem
The refactor will separate the hottest responsibilities into clearer domains:
- session and bootstrap ownership
- chat state and conversation update ownership
- social and contact-related state
- desktop attention or runtime bridge state
- preferences and local persistence

This does not require five independent stores. It requires clearer ownership so future work knows where a state transition belongs.

Alternative considered:
- Keep the current structure and only split large files mechanically.
Why rejected:
- File splitting alone does not reduce the number of responsibilities a future change must mentally load.

### Decision: Create a unified conversation update layer before broader decomposition
The most expensive recurring maintenance path is the conversation list being updated from refreshes, incoming messages, mark-read flows, clear or delete flows, and group actions. The change will first converge these operations around fewer helpers or state update paths before optimizing broader shell composition.

Alternative considered:
- Start by shrinking `AppShell` props first.
Why rejected:
- Prop surface is a symptom. Conversation update sprawl is the more important source of future maintenance drag.

### Decision: Keep `useChatSocket` focused on transport and message-state ownership
`useChatSocket` should keep owning transport lifecycle and message stream state, but higher-level conversation-list semantics and desktop attention orchestration should become clearer consumers instead of being indirectly entangled across multiple top-level effects.

Alternative considered:
- Move all chat state into the socket hook.
Why rejected:
- That would over-centralize unrelated UI and runtime concerns in the transport layer.

### Decision: Use existing behavior tests as the refactor guardrail
The recently added behavior matrix and helper tests will be treated as the must-keep contract while reorganizing ownership. Additional helper or state-level tests may be added where the new boundaries need focused protection.

Alternative considered:
- Refactor first and tighten tests later.
Why rejected:
- The current project now has enough validation to make this change safer, so the guardrail should be used immediately.

## Risks / Trade-offs

- **[Risk] Mechanical file extraction without responsibility reduction.** -> Mitigation: require every moved block to have a clearer ownership story, not just a smaller file.
- **[Risk] New local abstractions become harder to trace than the current direct code.** -> Mitigation: prefer a small number of explicit domain modules or helper layers over deep indirection.
- **[Risk] Conversation update semantics drift during refactoring.** -> Mitigation: refactor around existing helper tests and behavior-matrix coverage, and extend focused coverage where new update paths appear.
- **[Risk] Desktop runtime behavior remains entangled with chat effects.** -> Mitigation: explicitly isolate desktop attention ownership as a separate concern rather than letting it remain a side-effect branch inside general chat update code.

## Migration Plan

1. Identify and group existing chat frontend state by responsibility instead of by file location.
2. Introduce clearer state update helpers or domain modules for the hottest chat-facing paths, especially conversation updates.
3. Reduce top-level orchestration and shell prop width in stages while keeping behavior stable.
4. Run the current frontend and behavior-matrix validation after each major boundary shift.
5. Treat the change as additive refactoring; no user-facing migration or rollback plan is needed beyond reverting the code change if required.

## Open Questions

- Should the refactor expose explicit domain hooks, or is a smaller set of state helpers enough for this phase?
- How far should the shell prop reduction go in this change before it stops paying back real maintenance cost?
