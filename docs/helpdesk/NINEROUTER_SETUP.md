# 9Router setup — configuration ready, live checks deferred

The user will supply API configuration later. helpdesk-php/.env exists locally and is Git-ignored; .env.example is shareable. API key and model remain blank. A random Helpdesk bridge secret was generated locally without printing it.

Official gateway API references: [9Router repository API reference](https://github.com/decolua/9router#-api-reference) and [9Router documentation](https://docs.9router.com/). The client uses GET {base}/models and POST {base}/chat/completions. The configured base already includes /v1. No particular provider or model ID is assumed.

## Configure

In helpdesk-php/.env fill:

~~~dotenv
NINEROUTER_BASE_URL=http://127.0.0.1:20128/v1
NINEROUTER_API_KEY=
NINEROUTER_MODEL=
NINEROUTER_TOOL_CALLING_ENABLED=true
~~~

Use your gateway's actual base/key/model. The example local URL is configurable; HTTPS remote endpoints are allowed, plain HTTP is restricted to loopback. Redirects are not followed. No automatic provider installation or live call is required. If your selected model does not support function calls, disable NINEROUTER_TOOL_CALLING_ENABLED until selecting a compatible model; malformed/empty responses fail safely, not as tool successes.

NINEROUTER_TIMEOUT_SECONDS=12 and NINEROUTER_MAX_RETRIES=2 bound individual calls; HELPDESK_TURN_TIMEOUT_SECONDS=55 bounds the loop. Streaming is disabled in this slice. The client requests the gateway's per-request token-saver bypass so tool/policy evidence is not intentionally compressed; exact behavior still depends on your gateway.

## Optional verification — run only when desired

From helpdesk-php/:

~~~powershell
.\bin\php.cmd bin/gateway-smoke.php --models
.\bin\php.cmd bin/gateway-smoke.php
~~~

The first lists only IDs. The second verifies configured ID membership, chat completion, a forced named tool with a random nonce, and a final response after role=tool. It reports failure if any stage is incompatible. Its local diagnostic marker is not required for application startup and does not grant policy approval or business access. Never paste credentials into chat or commit them.

No live gateway is available/verified in this task. Before the user's later instruction to defer checks, a local port check failed and an unconfigured smoke command returned provider_not_configured; that is not provider connectivity success. No further live checks were performed after the instruction.

## Next.js bridge

Merge client/.env.helpdesk.example into existing client/.env.local:

~~~dotenv
HELPDESK_API_URL=http://127.0.0.1:8010
HELPDESK_BRIDGE_SECRET=<same private value as PHP>
HELPDESK_FRONTEND_ORIGIN=http://localhost:3000
NEXT_PUBLIC_HELPDESK_MODE=connected
~~~

Only the mode is public; no LLM key is sent to Next.js/browser code. The bridge permits fixed conversation/ticket paths only, rejects cross-origin POST, creates an HttpOnly guest session cookie and forwards the private bridge secret. No arbitrary URL proxy exists.

PHP authentication is separately verified through the configured StudioHub /auth/profile HTTP API when a Bearer token is supplied. The current marketplace UI remains a mock persona system and does not automatically provide a genuine PHP token. Public widget sessions therefore stay guest sessions; private capabilities stay disabled.

Public catalog tools are independent of model setup. Explicitly set STUDIOHUB_PUBLIC_TOOLS=true to advertise the fixed read-only tools. Each call validates the live API response; no transient CLI marker or paid Render Shell is required. bin/catalog-smoke.php remains an optional diagnostic for search/details/rates; it does not guarantee availability. See [MySQL catalog](MYSQL_CATALOG.md).

For starting PHP/Next.js, storage initialization and tests see [module README](../../helpdesk-php/README.md).
