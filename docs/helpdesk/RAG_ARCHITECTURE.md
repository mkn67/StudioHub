# PHP Helpdesk RAG architecture — proposed H1 design

Version 1.0.0 · 27 October 2026. Documentation only. No PHP, route, dependency, database or LLM integration is created. Read with [knowledge catalog](knowledge/KNOWLEDGE_CATALOG.md), [API contract](HELPDESK_API_CONTRACT.md) and [runtime readiness](PHP_RUNTIME_READINESS.md).

## Boundaries and first retrieval strategy

Keep plain PHP >=8.2, FastRoute, PDO and JWT. Existing Composer App\\ PSR-4 mapping covers a future App\\Helpdesk namespace without requiring a framework or autoload change. Do not introduce Laravel. H1 answers approved public policy only; no booking readers/writers, payment actions, tickets or handoff.

For 36 short candidate entries, use a versioned, immutable local JSON artifact and a PHP in-memory lexical index. No MySQL schema and no separate vector service are needed for public retrieval. Conversation/history storage is an independent requirement: the HTTP contract needs an isolated scoped repository in a future task, but the first CLI RAG demo can be stateless and need no conversation tables.

The simplest actual RAG path is: validate intent → retrieve eligible chunks by query → bounded context containing only selected chunks → generate a grounded answer → verify citations and coverage. A deterministic FAQ lookup is a useful baseline but is not generative RAG. Sending the whole policy document to an LLM is whole-document prompting, not query-based retrieval; neither should be presented as this pipeline.

## Proposed isolated layout and composition

| Future path under server/src/Helpdesk/ | Responsibility |
| --- | --- |
| Controllers/ConversationController, MessageController | Strict request validation and existing success/error envelope adaptation |
| Services/ConversationService, AnswerService | Ownership/idempotency and bounded answering orchestration |
| Knowledge/Ingestor, Chunker, ReleaseManifest | Offline allowlist ingestion, provenance and release validation |
| Knowledge/LexicalRetriever | Query normalization and top-k over filtered artifact |
| Contracts/Retriever, EmbeddingProvider, LanguageModel, ConversationStore, Clock | Injectable boundaries, fake providers and deterministic tests |
| DTOs/ChatRequest, Answer, Citation | Module schemas; no generic model-selected tool arguments |
| Repositories/ArtifactKnowledgeStore, ConversationRepository | Immutable local knowledge; separately scoped persistence if approved |
| Providers/ | Future server-only LLM/embedding HTTP adapter |
| Http/registerRoutes.php | Proposed explicit composition receiving router and constructed dependencies |

Future tests belong under server/tests/Helpdesk to use existing Tests\\ autoload. No directories above are created by this phase. Existing Router constructs controllers with new $class(), so controllers need a reviewed no-argument composition factory/default or explicitly constructed closure registration compatible with Router; do not assume dependency injection exists. Inspect that integration when implementing.

Shared entry-point work is separate: explicitly register proposed routes from server/public/index.php using a reviewed Helpdesk composition function. There is no module auto-discovery. Review malformed JSON handling, OPTIONS/preflight and module error mapping before browser connection; no shared fixes are authorized in H1.

## Offline ingestion and publication

1. Accept only explicit source paths and release-manifest entries; never glob every Markdown file. Do not ingest audit reports, schemas, logs, user chat, seeds, credentials or arbitrary fetched URLs.
2. Validate UTF-8 and required metadata, uniqueness, source section existence, document/source version and SHA-256 content/source hashes. Carry source title, section, locale and policy IDs.
3. Fail closed for missing approval, unresolved conflicts, missing validity decision, withdrawn/superseded versions or unknown scope. Current fixtures are all draft and must fail this gate.
4. Build separate visibility partitions offline. Public artifact contains public only, never host/customer/internal snippets. Future authenticated partitions require live server role/tenant authorization; retrieval filters execute before scoring.
5. Emit artifact manifest with corpus version, approved entry hashes, source hashes, chunker version, normalization version, build time and approver record. Build to temporary output; validate then atomically replace a release pointer. Keep previous approved version for rollback; never fall back to withdrawn content.
6. Review source changes as new versions. Resolve source conflicts in the catalog with a recorded decision. A stale version referenced in user text/history cannot override the active release.

Unknown effective dates remain null in preparation fixtures. Before release, obtain dates or an explicit approved validity policy; do not substitute compilation/review time for effective time.

## Chunking and provenance

Initial chunk boundary is one approved knowledge entry, typically short enough to remain indivisible. Preserve a rule and its exceptions together (Host timeout/refund, no-show/strike, grace/reconciliation). Target <=350 tokens per chunk; future longer entries split at section/paragraph boundaries with at most 40-token overlap. Hard context budget overrides chunk count. Never split numerical limits from conditions. Token estimates are conservative until provider tokenizer choice is verified.

Chunk metadata:

| Field | Definition |
| --- | --- |
| chunk_id | Stable document ID + document version + section ordinal + content-hash prefix |
| document_id, document_version, corpus_version | Exact approved revision, not filename latest |
| title, topic, policy_refs, locale | Query/citation vocabulary |
| source_path, source_section, source_version, source_sha256 | Provenance; internal paths are not automatically public links |
| content_sha256, chunker_version, normalizer_version | Reproducibility and cache invalidation |
| visibility, audience | Public/customer/host/internal boundary; audience never inferred from client surface |
| scope_kind, studio_id | Platform or specific Studio; null Studio ID for platform |
| approved_by, approved_at, valid_from, valid_until, superseded_by, publication_status | Release eligibility and time filtering |
| token_estimate, content | Bounded trusted-provenance text, treated as untrusted instructions |

A Studio-specific policy may fill platform-delegated values only with verified Studio ID, active approved policy version, and applicable booking snapshot. It cannot override platform invariants. Ambiguous Studio context prompts for Studio clarification without assuming authorization; conflicting policies produce unavailable/POLICY_CONFLICT. No Studio-specific entries are provided now.

## Lexical retrieval and optional embeddings

Proposed lexical algorithm: normalize Unicode consistently; index accented Vietnamese plus accent-folded aliases (including đ→d), lowercase tokens, preserve numbers/units/status enums, and maintain a reviewed small synonym list (cọc/deposit, chủ studio/host, đổi lịch/reschedule). Use BM25-style term statistics or a simple weighted token overlap (title and policy IDs weighted above body) over the small corpus; choose weighted overlap first to avoid packages. Rank ties by stable chunk ID. Do not use substring matching alone.

Retrieve only eligible scope/visibility versions. Candidate k=5, final at most 3 chunks and <=1,500 context tokens; these are initial design limits, not measured optimums. Select supporting exceptions as well as the primary rule; use explicit policy links rather than blindly taking top scores. A question with multiple unrelated topics may require clarification to stay within limits. No-match/low-coverage returns unavailable without an LLM call. Set and calibrate thresholds on held-out Vietnamese queries; lexical score is not a probability.

Embeddings are optional, not generated in H1. If paraphrase evaluation later justifies them: implement EmbeddingProvider for approved chunks offline and query text at request time; record provider/model revision, dimensions, normalization, source hash and embedding timestamp. Any model/dimension change rebuilds the complete index. Store vectors in the same versioned artifact and scan cosine similarity in PHP for this small corpus, optionally combine lexical and cosine ranks. Never mix dimensions/models or send Host/internal content to a public embedding job. Redact queries before any external call; if redaction destroys intent, abstain.

A separate vector database is only reconsidered with measured corpus size/concurrency/update frequency beyond artifact scan capacity. No such evidence exists now. No embedding package/provider or LLM model is selected here.

## Generation and citation validation

The AnswerService classifies static policy, live/private data, unsupported topic or action before retrieval, including mixed-intent messages. Public policy can be explained, but private/live subquestions remain explicitly unanswered. Scrub sensitive user input; retain minimal relevant history rather than blindly forwarding a transcript. Never allow user-selected actor, tool, SQL, URL, model or system prompt.

Prompt layers: fixed server system rules; minimal sanitized question/history; delimited retrieved text with IDs/provenance marked as data. Model instruction: answer in Vietnamese, only supported claims, preserve conditions/numbers/scope, abstain when evidence is incomplete, and return structured {text, citation_ids}. Do not let retrieved content override system rules. Delimiters alone are insufficient: no tools, no secrets in prompts, strict allowlists/visibility and post-validation enforce the boundary.

Citation IDs must be a nonempty subset of chunks actually retrieved for a policy answer, valid for this actor/release/scope. Server builds citations (document/version/section/title) from metadata, never from model URLs. Reject fabricated IDs, unsupported numbers or contradictory statements; a safe unavailable response is preferable to returning unverifiable output. Numerical/enum constraints can be checked deterministically; semantic coverage needs evaluation and human review, not a claim that citation membership proves grounding.

Answers show source title + policy reference + version. Public source URLs are omitted until an approved public source page exists; repository paths are documentation provenance, not customer web URLs. Future URLs must be server allowlisted and render as text/validated links, with no executable HTML/Markdown.

## Failures, limits and privacy

Proposed request budget: <=12 seconds server-side to fit the existing widget's 15-second timeout. Bound retrieval time, context, output (<=800 generated tokens and <=4,000 response characters), message length (1,000 UTF-16 code units for widget compatibility), message count (60) and per-owner/IP request rate. Limits are proposals to verify, not runtime guarantees.

No silent demo fallback in a connected adapter. Retriever unavailable → 503 knowledge_unavailable; model timeout → 504 generation_timeout; provider failure → 503 provider_unavailable; invalid model output → 502 invalid_provider_response. Genuine unsupported or conflicting policy is a successful processed message with state unavailable and machine reason, not a fabricated answer. No stack traces/provider payloads/keys in responses. Retry only bounded transient failures under the request deadline; do not duplicate persisted message pairs or billing through uncontrolled retries.

Future module logs: correlation/request ID, pseudonymous conversation/actor reference, corpus/chunk versions, outcome/error code, retrieval scores, elapsed time and token counts. Do not log raw prompts, full chats, JWTs, cookies, contact details, payment fields or booking codes by default. Do not send database records or infrastructure health to the LLM. Provider processing and retention need an explicit review before connection. Proposed temporary history retention is 24 hours; operational metadata 7 days; both are Helpdesk design proposals awaiting approval, not existing business policy. Support deletion/access and exclude sensitive payloads from generic AuditLogger.

A JWT authenticates the actor, not the conversation ID: authorize every conversation/history/message query against a server-derived owner. A Host role grants neither other Hosts' conversations nor internal knowledge. Admin needs explicit support permission; the current Admin role alone is insufficient. A booking suspension must not be treated as security login lock (BP-04/28).

## Verification planned, not executed

Unit suites: ingest gate and hashes; chunk condition/exception preservation; Vietnamese normalization; rank stability/low confidence; validity and visibility/scope filters; fake embedding dimensions; citation membership and grounding constraints; prompt-injection isolation; provider timeout/redaction; same-owner/idempotent conversation repository.

Contract suites: strict JSON/role rejection, status/envelope mapping, real JWT integration, object-level access denial, safe pagination, duplicate/conflicting clientMessageId, guest isolation, connected readiness, abort/retry after committed message. Runtime auth tests require disposable DB with no production data.

Evaluation uses [AGENT_EVALUATION_CASES.md](AGENT_EVALUATION_CASES.md) and its fixtures: retrieval Recall@3, grounded claim accuracy, citation precision/coverage, correct abstention, stale/scope leakage, prompt-injection outcomes and latency. Do not report scores until an implementation produces recorded outputs.

## Smallest implementation step after H1

Resolve publication holds for a small public subset and record its approval/validity manifest. Provision or select a separately authorized PHP CLI environment with required extensions. In a new isolated Helpdesk CLI slice, ingest that subset, implement lexical top-k and citation DTOs, and test with fake model responses. Then, under separately approved server-only provider credentials, add one LLM adapter and run the same grounded evaluation. This is a working public RAG demo without booking APIs or schema changes. A fake-model/deterministic run must be labeled as such; real RAG claims require actual generation.

HTTP conversations/history, persistence and explicit shared router registration are a later reviewed integration slice. H1 does not start any of these steps.
