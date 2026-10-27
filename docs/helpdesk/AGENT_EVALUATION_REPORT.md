# Agent evaluation and QA report

27 October 2026. Results below were executed, not targets. The initial implementation used mocked providers and deferred live verification at the user's request. The user subsequently supplied credentials and reported a chat failure; the follow-up section below records the actual configured-provider replay and fix. No general live-agent accuracy score is claimed.

## Executed results

| Check | Actual result |
| --- | --- |
| PHP syntax | All application/CLI/test PHP files passed lint on portable PHP 8.5.12 |
| PHP unit/service/security suite | 28 tests passed, 0 failed, 118 assertions |
| Isolated HTTP API QA | 15 checks passed against real PHP HTTP + separate temporary SQLite file |
| Gateway protocol integration | Real PHP cURL → mocked OpenAI-compatible HTTP gateway → model tool-call parsing → search_knowledge → tool result → final cited KB-026 answer passed |
| Frontend domain + Helpdesk tests | 53 passed, 0 failed (34 domain, 14 existing demo, 5 new connected adapter/bridge) |
| Focused bridge rerun after response-bound fix | 5 passed, 0 failed |
| ESLint / TypeScript | Passed |
| Production Next.js build | Passed, including /api/helpdesk/[...path] |
| Connected browser QA | 32 checks passed, zero page errors; five widths 360/390/768/1024/1440; reduced/full motion |
| Visual inspection | Actual 390px/1440px screenshots reviewed; retained existing Cool Neo-Brutalist layout; connected storage disclosure corrected |
| CLI RAG demo | Mock-provider tool/retrieval/citation flow returned actual KB-026/BP-34 text; explicitly unpublished evaluation |
| CLI ticket demo | Explicit confirmation persisted a genuine ticket/event in separate demo.sqlite; synthetic verified contact explicitly labeled |
| Publication baseline | Normal runtime: 0 eligible public entries; draft CLI: 25 public entries, nine held excluded |
| Retrieval-only fixture evaluation | 13 eligible public cases executed; mean Recall@5 = 1.0; all gold IDs found in all 13 |
| Remaining agent fixture evaluations | 27 of the 40 cases NOT EXECUTED as complete agent evaluations; contract/security assertions are tested separately |

The 13 retrieval cases are selected from the existing fixture's answerable public cases without injected alternate releases/provider faults. This is a small local development dataset, not an independent held-out score, and it was used during implementation. It does not establish answer faithfulness, live model tool selection/parameters, production latency or overall 40-case accuracy. No such scores are fabricated.

Initial PHP testing caught Windows iconv transliteration losing Vietnamese vowels; explicit precomposed/composing-mark normalization fixed that. Initial frontend tsx execution failed inside the sandbox at Windows user-info lookup; the same tests passed outside that restriction. These initial failures are not represented as executed successes before their corrections.

## Assertions covered

Publication hash/source drift, expiry, withdrawal, held content, Host/internal/Studio filtering; accentless queries; unknown citations/partial-condition quotes; tool argument types/additional fields/allowlist; malformed/empty provider structure, timeout and rate-limit retry; step and call bounds; safe prompt/credential handling; same-owner history and signed cursor; same-key idempotency/conflict; provider-timeout retry; private lookup and mutation refusal; real ticket creation/confirmation/duplicates/visibility/status events; unverified guest denial; operator activation/resume and no bot answer while human-active; live-profile adapter refusal with no guest downgrade; SSRF configuration and bounded projected catalog data; rate limit and retention.

HTTP QA verifies malformed JSON, origin/bridge authentication, unknown fields, oversized requests, cross-guest history denial, unconfigured provider error, persisted handoff history/idempotency and disabled support access. No fake draft-policy success is exposed over HTTP.

Browser QA uses the actual PHP application/Next.js bridge with an unconfigured provider. It observes honest error states, private-data refusal, reset, persisted handoff/history polling, focus restoration and responsive bounds. It does not simulate an online human operator or live model.

## Not verified or implemented

- Full 9Router model-list/function-capability smoke suite: not executed. Only the later configured-provider chat replays described below were performed.
- Actual StudioHub public catalog and auth APIs: unavailable; no fake live results returned. Room tools remain gated.
- Private booking/payment/refund/complete availability APIs: missing in the business backend; contracts disabled.
- MySQL dialect execution: not executed. Only the isolated SQLite schema and stores were exercised.
- Real operator identity/Host assignment: not verified; support allowlist empty, Host assignment unclaimed.
- Email/SMS guest verification delivery and full human inbox UI: not implemented.
- Full two-way customer/human composing UX: not implemented; widget polls operator messages while automatic composition is paused.
- Physical mobile keyboard/screen reader certification and production load testing: not performed.

The existing demo-only browser QA is retained but is not run against connected mode, because its fixed-demo assertions intentionally differ. Existing booking-domain tests pass; the broader legacy production browser script is not rerun or claimed passing in this task.

## Isolation and artifacts

The final protected-path SHA-256 comparison covers 77 task-entry files in server/, database/, existing H1 reports/corpus, layout, next-env and client dependency manifests. Intentional changes to the six existing Helpdesk feature files are outside that protected set. Next.js-generated next-env bytes are restored to their task-entry contents. No existing business PHP, routing, schema, dependency/configuration or migration is modified.

New files: 49 module files under helpdesk-php/ (including its ignored-runtime rules and var/.gitkeep), six frontend additions, and these five implementation reports. The local secret-bearing .env, portable runtime, temporary SQLite stores, raw evaluation output and browser screenshots are ignored/local artifacts, not committed dependencies or production data.

Six existing feature files changed: components/ChatComposer.tsx, components/ChatMessage.tsx, components/HelpdeskWidget.tsx, hooks/useHelpdeskChat.ts, services/helpdeskClient.ts and types/helpdesk.types.ts. New frontend files: client/.env.helpdesk.example, client/src/app/api/helpdesk/[...path]/route.ts, feature server/bridge.ts, services/phpHelpdeskAdapter.ts, tests/phpHelpdeskAdapter.test.ts and tests/connected-browser-qa.mjs.

No H1 policy source, approval decision or conflict was silently changed. Concurrent root 9router package/lock additions are preserved and were not made by this implementation. Build emits a multiple-lockfile workspace-root notice because of those additions; no unrelated Next.js configuration is changed to hide it. No commit, push or deployment was performed.

Reproduce tests with [module README](../../helpdesk-php/README.md) and [demo guide](HELPDESK_DEMO_GUIDE.md).

## Follow-up: configured provider returned plain text

The user configured the gateway and reported the generic widget failure. PHP logs identified invalid_provider_response. A minimal isolated greeting replay received HTTP 200 from the gateway with assistant content as ordinary text, rather than the agent's required JSON object.

The client now requests JSON-object response mode for structured agent prompts (configurable with NINEROUTER_JSON_MODE). The orchestrator accepts an entire JSON code fence and permits one bounded format-repair turn; persistent invalid output still fails safely. It does not render unvalidated prose or relax citations/authorization. Greetings have a dedicated non-policy response kind, and the widget maps malformed-provider errors to actionable text.

Actual full bridge/PHP/gateway replay after the fix: greeting returned HTTP 200, state=answered, answerKind=greeting. An ordinary policy question returned HTTP 200, state=unavailable, answerKind=abstention and zero citations, because the publication manifest remains empty. No knowledge was approved or published.

The updated PHP suite passed 32 tests with 130 assertions, including plain-text repair, fenced JSON, bounded repeated-invalid rejection and structured-request configuration. These checks establish the reported fix, not universal model/tool compatibility.

The updated combined frontend/domain suite also passed all 54 tests, including the new actionable provider-format error assertion.
