# Agent implementation

27 October 2026. Actual isolated application: helpdesk-php/. The user subsequently requested configuration-only 9Router setup and no further connectivity verification; the gateway remains unconfigured and live provider testing is deferred.

## Delivered behavior

- Independent bootstrap, router/request validation, safe envelopes, origin/bridge authorization, owner scoping, request IDs, rate limits and configurable retention.
- NineRouterClient: configured /v1 base, Bearer authentication, models, nonstreaming chat completions, function-call validation, bounded transient HTTP retries, timeouts, usage accounting and no credential logs.
- AgentOrchestrator: server registry, strict schemas/authorization, actual assistant tool_calls and role=tool messages, repeated-call detection, step/call/deadline bounds and structured final validation. No arbitrary PHP, SQL, network URL or business mutation tool exists.
- Repository and lexical retrieval: 36 source entries validated; manifest overlay pins exact entry/source hashes, reviewer and validity, filters held/stale/unauthorized/scope-mismatched entries before scoring. Normal runtime has zero approved entries; CLI draft evaluation admits only 25 public ready candidates (27 for a verified Host).
- Vietnamese accent/composing-mark normalization, reviewed phrase aliases, weighted title/body matching, top five chunks and bounded context. Lexical retrieval is replaceable independently of the agent.
- Grounded generation is deliberately extractive: the model selects up to three complete retrieved paragraphs, and the server validates exact content/chunk membership and builds references. This preserves conditions and exceptions; unrestricted policy paraphrasing is not claimed.
- Real Helpdesk-owned conversation/message, ticket/event, handoff and agent-run persistence using three namespaced tables with JSON payloads. Atomic reservation/finalization/idempotency avoids duplicate completed message pairs. No raw provider payload, authentication token or API key is stored in traces.
- Ticket proposal tool, explicit trusted confirmation endpoint, genuine IDs only after committed persistence, requester/contact checks, unclaimed routing and event/status history.
- Handoff request/queue/activation/resume/resolution state machine; operator authorization; bot pause and customer history polling.

## Integrated versus gated

The existing widget now uses a fixed Next.js server bridge and PHP adapter by default. Demo is an explicit setting. It retains the design/keyboard/viewport behavior, displays validated sources/proposals/tickets, maps real errors and polls handoff history. It does not access frontend mock bookings or pretend local personas are PHP credentials.

Public room search/detail/rates wrappers match actual server/public/index.php routes and response fields. They are hidden from the model until separately verified with catalog-smoke.php AND STUDIOHUB_PUBLIC_TOOLS=true. Capacity is filtered over the first five search results because the existing API lacks that filter; no complete search guarantee. Rates are informational, not total booking quotes. Busy calendar is not an availability evaluator.

get_my_booking/get_booking_payment/get_refund_status/check_room_availability have explicit disabled adapter contracts and are not advertised as executable tools. Host-specific ticket assignment is unclaimed because no trusted ownership HTTP interface is available. Studio-specific policies remain excluded without resolved trusted Studio context; this version exposes platform policy only.

Live staff identity can be reloaded through the existing GET /api/auth/profile, with an additional exact Helpdesk support-ID allowlist. The list is empty by default; no admin page or privileged browser proxy was introduced. Host role alone cannot access another requester's ticket. Booking references in new tickets are not accepted while ownership cannot be verified.

## Storage and lifecycle

SQLite PDO is the selected runnable local fallback given unavailable MySQL/Docker. MySQL migrations are also provided for an isolated Helpdesk dev/test database but have not been executed. App requests never auto-run migrations; an explicit CLI initializes only the module namespace. There are no cross-database FKs.

Conversations store user/assistant history, an in-flight lease and completed idempotency results. Failed turns clear their reservation and may be retried with the same ID; an abort does not imply rollback. Ticket proposals are immutable summaries; confirmations refer to their stored IDs, not a model-selected ticket number. Proposals and saved tickets are distinct.

Human workflow: bot_active → handoff_requested → human_pending → human_active → resolved, with authorized resume to bot_active. Events preserve intermediate transitions. Pending does not mean a human channel is connected. While paused the widget reads actual history; it does not invent retrieval/thinking progress. The current widget disables customer composition during handoff, so full two-way human-chat UX is a future extension.

## Limits and exclusions

Default bounds: 1,000 UTF-16 units per user message, 8 KiB body, 60 conversation messages, five agent steps, six tool calls, 55-second turn budget, 12-second individual provider timeout, two transient HTTP retries. Connected widget waits up to 70 seconds; bridge budget is 65 seconds. These supersede H1's proposed 12-second total/15-second widget budget. The loop ends safely at configured bounds.

No embeddings/vector service, full support inbox UI, email/SMS contact delivery, private business API, business mutation, live provider assertion, automatic deployment or policy-conflict resolution is included. A guest needs independently verified contact before a ticket is saved; account/financial issues do not become authenticated merely because they are described in chat.

Structured logs contain request IDs and error reasons, not exceptions/SQL/credentials. Provider prompts use redacted question/minimal history and projected tool fields. Public/Host/internal partitions are server-enforced. The fixed bridge requires same-origin POST and a shared server secret; the PHP listener should remain loopback in this development setup.

## Isolation evidence

Existing server/, database/, Compose, shared Composer, client dependency manifests, layout and H1 reports/corpus are compared against the task-entry hashes. Frontend changes are restricted to the existing Helpdesk feature plus a new bridge route/example. Next.js-generated next-env changes are restored to the user's exact pre-build bytes.

Concurrent root package.json/package-lock.json additions containing 9router appeared during this task; this implementation did not create or modify them, and they are preserved. They are not dependencies of helpdesk-php/.

Read [API implementation](HELPDESK_API_IMPLEMENTATION.md), [setup](NINEROUTER_SETUP.md), [actual verification](AGENT_EVALUATION_REPORT.md) and [demos](HELPDESK_DEMO_GUIDE.md). Existing H1 documents remain historical preparation evidence and were not rewritten.
