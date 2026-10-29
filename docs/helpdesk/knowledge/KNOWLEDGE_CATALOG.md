# Knowledge catalog — corpus 1.0.0

Prepared/reviewed 27 October 2026 (Asia/Ho_Chi_Minh). Draft, unpublished. Source comparison by Codex is not business or legal approval. Source compilation dates are 25 October 2026; no individual approval dates or effective dates are supplied. No approval has been invented.

## Inventory and release gate

[knowledge.v1.json](knowledge.v1.json) contains 36 versioned entries: 34 public candidates (25 ready_for_approval, 9 needs_review) and 2 Host-only candidates. [PUBLIC_FAQ.md](PUBLIC_FAQ.md) and [faq.v1.json](faq.v1.json) contain 34 corresponding static questions plus 6 separately classified live/action routing examples. No private booking data or internal operational rule bodies are in these fixtures.

All entries have unique KB IDs, title, topic, content, source path/section/version, corpus document version, visibility, Studio scope, publication state and review/approval information. Unknown effective dates and approvals are null. IDs remain stable; revisions increment versions, record supersession and preserve history. Proposed statuses: ready_for_approval → approved → superseded/withdrawn; needs_review cannot become approved without a recorded resolution.

Nothing is presently ingestible into a public runtime. A future release manifest must explicitly approve each ID/version/content hash with reviewer, approval time, scope and validity information (or an explicit non-expiring decision), and pin the source hashes. Unknown validity must be resolved at release. Publication filters require manifest membership AND approved status AND allowed visibility AND valid scope/version/time; never infer approval from a filename or from this review date. A conflict resolution records the conflicting statements, chosen authority and business reviewer; this task makes no such decision.

## Source register

| Source | Available evidence | Treatment |
| --- | --- | --- |
| client/docs/references/StudioHub_Business_Policy_VI_v1.1.md | v1.1; compilation 25/10/2026; BP-01–44; sections 0, 14, 15 state priority, historical discrepancies and undecided areas | Policy basis; source says reconciled, not legal certification or deployed-code certification |
| client/docs/references/StudioHub_Design_Business_Specification_v1.0.md | v1.0; compilation 25/10/2026; sections 1, 2, 4.1, 5, 7.1, 13 | Product introduction, discovery and process guidance |
| business_rule.md | Not found in repository filename search | Missing evidence; do not invent its statements |
| web.md / Đồ án Web (3).md | Referenced by v1.1, not found as source files | v1.1 section 14 is an attributed comparison, not our independent review of those documents |
| README.md | Current frontend notice followed by legacy checkout/30%/sandbox QR copy in section 1.1, item 4 | Conflicting historical material; never ingest as policy |
| docs/implementation-plan.md and implementation-plan-backend.md | v2.1; sections 5.4–5.6 describe pending/rejected/expiry workflow; section 5.5 describes expiration cron | Design/API plans, not implemented endpoint proof; conflict register below |
| docs/3.2-database.md; server/database/schema.sql | Historical dictionary and actual SQL respectively | Internal technical evidence, not public policy |
| docs/3.3-api.md | Referenced by older plans, absent on disk | Use actual server/public/index.php and controllers for endpoint existence |
| docs/helpdesk/{PHP_BACKEND_AUDIT,HELPDESK_ARCHITECTURE,FRONTEND_WIDGET_IMPLEMENTATION,NEXT_MILESTONES}.md | All reviewed, including runtime limitations | Internal design evidence; excluded from customer retrieval |
| client/src/features/helpdesk/{data/demoFaq.ts,services/demoHelpdeskAdapter.ts,types/helpdesk.types.ts,hooks/useHelpdeskChat.ts} | Public deterministic demo, no network or backend identity | Compatibility evidence; source labels are manually curated, not retrieval results |

## Entry index

| ID | Topic | Visibility | Publication state | Sources |
| --- | --- | --- | --- | --- |
| KB-001 | introduction | public | ready_for_approval | section 1 |
| KB-002 | search | public | ready_for_approval | section 4.1, BP-05 |
| KB-003 | booking | public | ready_for_approval | BP-05 |
| KB-004 | booking | public | ready_for_approval | BP-01 |
| KB-005 | booking | public | ready_for_approval | section 4.1, BP-01, BP-11 |
| KB-006 | equipment | public | ready_for_approval | section 2, BP-07 |
| KB-007 | booking | public | ready_for_approval | BP-07 |
| KB-008 | availability | public | ready_for_approval | BP-08 |
| KB-009 | deposit | public | needs_review | BP-10 |
| KB-010 | deposit | public | needs_review | BP-18, BP-19 |
| KB-011 | deposit | public | needs_review | BP-11 |
| KB-012 | deposit | public | ready_for_approval | BP-13 |
| KB-013 | confirmation | public | needs_review | BP-14 |
| KB-014 | confirmation | public | needs_review | BP-15, BP-25 |
| KB-015 | statuses | public | needs_review | BP-16, section 7.1 |
| KB-016 | refund | public | ready_for_approval | BP-16, BP-17 |
| KB-017 | cancellation | public | ready_for_approval | BP-22 |
| KB-018 | cancellation | public | needs_review | BP-23 |
| KB-019 | refund | public | needs_review | BP-15, BP-24, BP-25 |
| KB-020 | refund | public | ready_for_approval | BP-25, section 13 |
| KB-021 | pricing | public | ready_for_approval | BP-18, BP-23 |
| KB-022 | rescheduling | public | ready_for_approval | BP-30 |
| KB-023 | rescheduling | public | ready_for_approval | BP-31 |
| KB-024 | rescheduling | public | ready_for_approval | BP-21, BP-32 |
| KB-025 | checkin | public | ready_for_approval | BP-33 |
| KB-026 | checkin | public | ready_for_approval | BP-34 |
| KB-027 | checkout | public | ready_for_approval | BP-35 |
| KB-028 | no_show | public | ready_for_approval | BP-36 |
| KB-029 | overtime | public | ready_for_approval | BP-37 |
| KB-030 | overtime | public | ready_for_approval | BP-09, BP-37 |
| KB-031 | restrictions | public | ready_for_approval | BP-12, BP-27 |
| KB-032 | restrictions | public | ready_for_approval | BP-04, BP-28 |
| KB-033 | restrictions | public | ready_for_approval | BP-29 |
| KB-034 | demo_scope | public | needs_review | BP-11, section 1 |
| KB-035 | host_guidance | host | ready_for_approval | BP-02, section 5 |
| KB-036 | host_guidance | host | ready_for_approval | BP-03 |

Every entry is platform scope, not a claim that every Studio uses the same rate or deadline option. Audience and visibility differ: customer-facing general guidance can be public; a customer's booking record is private and is never a knowledge entry.

## Conflicts and unresolved publication decisions

| ID | Statements that disagree | Affected entries and required treatment |
| --- | --- | --- |
| C-01 | README §1.1 item 4 says 30% deposit and plan §1 sets DEPOSIT_RATE=0.30; BP-18 and S1 §6.3 say actual Studio ratio, 30% is example | KB-010 withheld. Reviewer must approve candidate wording and reconcile/exclude legacy copy |
| C-02 | Actual schema defaults pending, requires pending expires_at, allows rejected and lacks awaiting_payment/no_show; plans §5.4 combine pre/post-deposit pending and use rejected. BP-11/14/16 and S1 §7.1 distinguish awaiting_payment, pending and cancelled with reason | KB-011/013/015 withheld. Never map SQL state to policy state automatically; documentation and future implementation need explicit mapping |
| C-03 | Legacy plan §1 sets HOLD_MINUTES=15 (also §2/§5.5) versus BP-10 Host window 15 minutes–3 hours and 24h+window advance condition | KB-009 withheld pending confirmation that a default is not a platform mandate. No fabricated Studio window |
| C-04 | Plan §1 sets HOST_RESPONSE_HOURS=24; §5.4–5.6 turn timed-out paid pending into expired with recorded-only refund requirement. BP-15/24/25 require exactly 2 hours, cancelled, full refund workflow and automatic initiation/processing on Host timeout | KB-014/019 withheld. Candidate states policy intent, never asserts active automation |
| C-05 | README §1.1 item 4 describes VietQR sandbox and /checkout; BP-11 and S1 §4.1/§6.3 prescribe simulated buttons and modal flow, no fake banking QR | KB-034 withheld. Existing widget already labels simulation; do not change it in H1 |
| C-06 | Plan §5.5 records refund_due=paid_total for cancellation/rejection/expiry and calls partial voluntary refunds an out-of-scope extension; BP-23 requires Studio refund tiers 0–100% from the booking snapshot | KB-018 withheld. Review the proposed tier answer before publication; no individual entitlement calculated |

The source priority stated by v1.1 §0 is recorded, but it is not used to silently approve conflicting entries. A reviewer may explicitly resolve a legacy-document discrepancy in favor of that stated priority in a later release. Other entries remain approval candidates, not published answers.

Historical D-01–D-18 in v1.1 §14 must not be copied as findings about today's SQL. Actual SQL DOES contain expires_at and unit_minutes and uses active/maintenance/inactive room states. PHP/FastRoute/PDO/JWT is now demonstrated by source and explicitly required by this task, despite older product documents saying the technology decision was pending. This is a scope/timeline difference, not authority to rewrite policy.

## Visibility and exclusions

| Classification | Contents | Ingestion rule |
| --- | --- | --- |
| public | General customer policy in KB-001–034 | Only individually approved, valid versions with conflicts resolved |
| customer | No static customer-only entries in v1 | A future customer-only document requires authenticated audience filtering; private records remain outside corpus |
| host | KB-035–036: onboarding and ownership guidance | Authenticated live Host role only; public H1 index omits them even if caller claims host surface |
| internal | Audit reports, architecture, schemas, operational refund retry escalation details (BP-26), Admin intervention/audit controls (BP-38/39), credentials, internal prompts/logs | Excluded entirely from public corpus and public retrieval; catalog metadata does not confer publication |

No internal operational rule body is copied into the public FAQ. BP-27–29 customer consequences are customer-facing guidance; operational strike detection, deduplication storage and audit implementation remain excluded.

## Missing knowledge

No verified Studio-specific deposit ratio, cancellation tier, reschedule deadline choice, overtime rate, current price, opening hours or availability is supplied. Never fill these from seed data. No guaranteed refund settlement SLA exists. BP §15 leaves damage penalties, tax/invoices, compensation, legal contracts, additional no-show penalties and force-majeure resolution undecided. Give an uncertainty response; do not invent a fee or promise.

There is no approved public help contact, ticket endpoint or general support URL in the sources. Existing /support is a demo account-restoration page, not a general ticket service. Do not promise a sent escalation. Booking/payment/refund/restriction queries require future scoped live APIs, not static FAQ.

The demo discovery wording mentions capacity/budget guidance; the PHP room search currently accepts keyword, space_type_id, min_area, price/unit and pagination, with no capacity or date availability filter. Preserve conceptual product guidance while documenting this adapter gap; no frontend edits are required here.
