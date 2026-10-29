# Reproducible Helpdesk demonstrations

No live 9Router instance is required for the mocked scenarios below. They are explicitly CLI-only unpublished evaluation, not public policy publication or proof of provider connectivity. Run from helpdesk-php/. Actual API/widget tests use normal publication filtering.

## 1. RAG FAQ

~~~powershell
.\bin\php.cmd bin/demo.php --draft --mock --scenario=rag
~~~

The scripted provider requests search_knowledge; the actual PHP retriever selects chunks, then the scripted final response passes through the actual citation validator. Expected question: late arrival 30 minutes; selected policy KB-026/BP-34 says original end time remains. Output labels MOCK PROVIDER / CLI UNPUBLISHED EVALUATION. Real configured-provider evaluation uses --draft without --mock; it is not executed here.

## 2. Room discovery

The implementation exposes no room tool while StudioHub catalog is unavailable/unverified. Unit tests inject an actual API-shaped HTTP response and verify numeric room IDs/capacity filtering/projection; this is not live inventory. Once the existing API is running, run catalog-smoke.php and explicitly enable STUDIOHUB_PUBLIC_TOOLS. Then ask for a Studio for five people. Only returned rooms may be rendered, and availability remains unconfirmed. No fake successful discovery demonstration is supplied.

## 3. Booking privacy

~~~powershell
.\bin\php.cmd bin/demo.php --draft --mock --scenario=privacy
~~~

The narrow safety guard refuses private booking-code lookup without invoking the provider. Unit/API tests additionally deny cross-owner conversation/ticket access. This demonstrates refusal with missing booking APIs; it does NOT claim integration with a real customer-booking ownership API.

## 4. Support ticket

~~~powershell
.\bin\php.cmd bin/demo.php --draft --mock --scenario=ticket --confirm-ticket
~~~

The real service prepares a summary; the explicit CLI flag confirms it; a clearly synthetic contact attestation is used only in this disposable demo. A real ticket/event is persisted to var/demo.sqlite and its committed UUID is returned. No email/Host notification is sent. Without --confirm-ticket the proposal remains unconfirmed.

In the normal widget, review the summary and press the explicit confirmation button. Authenticated PHP identity or independently verified guest contact is required. When absent, the UI truthfully shows verification required; no success card appears. Existing demo personas are not accepted as PHP identity.

## 5. Human handoff

~~~powershell
.\bin\php.cmd bin/demo.php --draft --mock --scenario=handoff
~~~

Also type /handoff in the connected widget. This deterministic command works without an LLM: it persists the request and intermediate events, ends in human_pending and accurately says nobody has accepted. The widget polls authorized history. Operator API tests activate, send a human message and resume with a synthetic authorized support identity; live operator integration and a full inbox UI are not demonstrated.

## 6. Unsupported financial action

~~~powershell
.\bin\php.cmd bin/demo.php --draft --mock --scenario=unsupported
~~~

No cancellation/refund/payment mutation tool is registered. The response says no operation occurred and offers preparation of a support issue; it does not invent a confirmed policy answer while knowledge remains unpublished.

## HTTP and browser reproductions

~~~powershell
# From helpdesk-php/, launches/cleans an isolated SQLite HTTP fixture:
node tests/http-qa.mjs
# From client/, after PHP and Next.js are running with matching origin/secret:
node src/features/helpdesk/tests/connected-browser-qa.mjs
~~~

The browser QA expects an unconfigured provider, tests honest errors/private refusal/real handoff, and saves screenshots at client/.impeccable/review/helpdesk-connected/. It covers 360/390/768/1024/1440, reduced/full motion and has no live model call. It does not run the old demo-only browser assertions against connected mode.

For actual cURL provider protocol integration with a MOCK gateway, in two terminals:

~~~powershell
# repository root
.\helpdesk-php\bin\php.cmd -S 127.0.0.1:18011 helpdesk-php/tests/mock-gateway.php
# second terminal
.\helpdesk-php\bin\php.cmd helpdesk-php/tests/gateway-http.php
~~~

The fake gateway is a tests-only router; the application never includes it. Its model ID and key are plainly fixture values, never proposed real provider configuration.

See [results and limits](AGENT_EVALUATION_REPORT.md) before presenting any demo as live functionality.
