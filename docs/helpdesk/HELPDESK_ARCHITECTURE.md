# Isolated Helpdesk architecture

## Implemented boundary

The widget is mounted once in `client/src/app/layout.tsx`, alongside the application Provider. Everything else is under `client/src/features/helpdesk`. It reads only the current route's broad surface (public/customer/host/admin); it does not read the application's store, demo persona, booking data, token or URL identifiers. Conversation state stays in memory across client navigation and disappears on reload. No cookies, local/session storage, network transport, analytics or external AI calls are used by Helpdesk. No environment variables, dependencies, rewrites or API routes were added.

```text
RootLayout → HelpdeskWidget → useHelpdeskChat → HelpdeskTransport
                                                 └─ deterministic demo adapter (now)
                                                 └─ reviewed PHP API adapter (future)
```

The demo answers a small public FAQ using manually reviewed entries. Source labels name actual policy sections; they are not retrieval citations or LLM output. Unknown, private booking/payment/refund, live availability and action requests explicitly report unavailability. Links lead to existing frontend pages only. The existing `/support` page handles demo account restoration, so it is not presented as a general support-ticket service.

## Frontend contract

`HelpdeskTransport` declares a mode and `sendMessage(message, context?, {signal}?)`. The hook supplies an AbortSignal and 15-second timeout, limits messages to 1,000 characters and caps a conversation at 60 messages. A synchronous in-flight guard blocks duplicate sends. Errors are mapped to a user-safe message without echoing transport exceptions. Context is a UI hint, never authentication.

Responses contain text, actual mode, state (`answered`, `unavailable`, `unauthorized`, `human_handoff`), optional grounded sources/links, and typed room/availability/booking/ticket cards. Booking cards keep booking, payment and refund statuses separate. No demo cards claim real data. Text is escaped by React; there is no HTML/Markdown execution. Links reject executable schemes, credentials, control characters, backslashes and protocol-relative URLs. A future adapter must also validate JSON at runtime, cap all arrays/text, allowlist public source hosts and map only approved fields before passing results to these types.

The hook pauses new sends during human handoff. Server conversation ownership must also enforce that pause, including across tabs/reloads. No human messaging, polling, handoff resume or real ticket lifecycle is implemented now. Future private results require conversation reset on authenticated identity change/logout; the current demo receives no authenticated identity and never fetches private results.

## Proposed PHP module, not created

Follow the existing plain-PHP PSR-4 architecture:

```text
server/src/Helpdesk/
  Controllers/       # Request → DTO → ApiResponse
  Services/          # conversation and ticket use cases
  Agents/            # bounded orchestration, no business writes
  Tools/             # allowlisted, typed, scoped read adapters
  Knowledge/         # approved ingestion, versions, retrieval
  Repositories/      # Helpdesk-prefixed persistence
  DTOs/              # validated inputs and minimal outputs
  Contracts/         # model, retriever and business-reader interfaces
server/tests/Helpdesk/
```

Existing `App\\` autoload covers this namespace; no Composer change is inherently needed for the directory. HTTP/embedding/retrieval packages must be selected later after runtime and provider review. New endpoints still require an explicit, reviewed registration point in `server/public/index.php` because the existing Router has no module loader. A future composition function could accept Router and Helpdesk dependencies, but importing/calling it is a shared entry-point change requiring its own task. No shared PHP bootstrapping, business module or schema was modified here.

Reuse Core Request, ApiResponse and exceptions, active Auth/Role middleware and OwnershipGuard. Wrap RoomService/EquipmentService reads in Helpdesk-specific interfaces. Do not call internal mutable repositories directly from model-generated arguments. No arbitrary SQL, shell or arbitrary URL tools. Catalog output is untrusted data, never instructions to the agent.

## Proposed API contracts — unavailable today

All routes below are proposals; no frontend code calls them. Prefer existing success/error envelopes, with an explicitly agreed machine-readable error code before clients depend on one. Existing `ApiResponse::error` currently omits its errorCode argument from JSON.

| Method / proposed route | Minimum request | Minimum response inside success `data` | Required controls |
|---|---|---|---|
| POST `/api/v1/helpdesk/conversations` | optional locale, broad surface | id, ownerMode, state, capabilities | server-derived owner; guest sessions only for public FAQ; rate limits |
| POST `/api/v1/helpdesk/conversations/{id}/messages` | text, clientMessageId | conversationId, messageId, response in widget contract | ownership, size limits, idempotency, bounded orchestration; no client-selected tool/actor |
| GET `/api/v1/helpdesk/conversations/{id}` | cursor/limit | authorized messages, state, nextCursor | owner or assigned authorized support user, retention/redaction |
| POST `/api/v1/helpdesk/tickets` | conversationId, category, user-approved summary, idempotency key | actual ticket id/status, ownership/handoff state | authenticated ownership, confirmation, routing, transaction/audit |
| GET `/api/v1/helpdesk/tickets/{id}` | no owner ID from client | scoped ticket summary/status | owner or assigned support/Host with explicit scope |

Possible failures: 400 invalid input; 401 missing/expired identity; 403 denied/locked; 404 inaccessible resource without existence leakage; 409 handoff/conversation conflict; 429 rate limit; 503 model/retriever/business-data unavailable. UI must not convert errors or timeouts into successful tickets, booking changes or tool results. Retry only when safe/idempotent; a timeout does not prove a write failed.

PHP owns credentials, LLM calls, retrieval, tool authorization, persistence, tickets, handoff and traces. A future client adapter must use the reviewed authentication mechanism; the current localStorage persona does not provide a PHP JWT. Decide an explicit token/BFF strategy in the integration task. Do not add a browser LLM key or quietly create a proxy to nonexistent routes.

## H1: FAQ and RAG

Approve a public-only knowledge corpus and versions first. Do not ingest backend audit reports, secrets, private bookings or internal incident rules. Store document/chunk provenance and public visibility; retrieve with bounded top-k and context size; supply source titles/approved URLs/sections. Unsupported answers must abstain. Test retrieval relevance, stale policy versions, prompt injection, Vietnamese queries, citation grounding, latency and provider failure. An allowlisted deterministic FAQ can be a deliberate first stage; it must not be called RAG.

## H2: read-only tools

Public candidates today: room search/detail/calendar/rates and equipment/lookup catalogs, after PHP runtime verification. A calendar lists busy intervals, not final bookability or equipment stock. Private booking/payment/refund tools are blocked by missing scoped APIs and policy/schema alignment. Introduce explicit `RoomCatalogReader` and `AuthorizedBookingReader` contracts. Authenticated actor comes from middleware, never chat text, model arguments or HelpdeskContext. Enforce Customer ownership and Host studio ownership at the data boundary; Admin needs an explicit permission and audit. Bound query ranges/results, redact contact/payment details, keep money statuses separate and test cross-user access denial.

## H3: tickets and handoff

Use separate Helpdesk conversation/message/ticket/document/chunk/run/tool-trace tables with owner/tenant FKs, retention and deletion rules. Persist actual ticket creation atomically with idempotency; route to Host only for owned studio issues and StudioHub staff for platform issues. Explicitly track bot/human/closed ownership. Pause automation while human-owned; resume only through an authorized transition. Record minimal audit references, not tokens or full sensitive payloads. The current frontend exposes no create-ticket success path and no business actions.

## Removal and future rollout

Remove the two Helpdesk additions in root layout and delete its feature directory to remove the widget. Documents can remain. Roll out future transport through `services/helpdeskClient.ts` only after contract, identity, availability and security checks; keep demo labeling accurate and add explicit feature control in that later task. Never treat TypeScript DTOs or client-side guards as server authorization.
