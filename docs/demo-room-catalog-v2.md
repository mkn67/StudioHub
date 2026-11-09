# Demo room catalog v2

## Content and media

`server/database/demo/catalog.v2.json` identifies sample rooms by exact room name and demo owner email, not assumed numeric IDs. It contains 22 fictional spaces (21 active, one maintenance), including five new rooms. Every room has three separate gallery assets: 66 unique images, plus four cover/avatar assets. All 70 photographs are saved under `client/public/images/demo-rooms` (about 8.6 MB total). This removes the broken Unsplash URLs and avoids repeating cover images across rooms.

Photo selection was visually reviewed by room type. Stock imagery illustrates the type of room, not a verified physical property or three guaranteed views of one venue. The UI explicitly labels sample imagery and demo profile portraits. The five optional video links reference recording/green-screen layouts on Pexels; they are labelled reference videos, not tours of the listed room. Source pages and licensing are recorded in each manifest entry and `client/public/images/demo-rooms/PROVENANCE.md`. Real Hosts should supply their own room photos, profile pictures and matching video tours.

The Black Box sample is classified as Acoustic Soundstage, not Workshop & Event. Workshop results use table/chair meeting and event spaces. Other public multi-purpose associations are retained. The synchronizer removes only the incorrect Black Box/Workshop association.

## Rendering and ranking

Room image URLs, primary image and ordering are read directly from MySQL `room_images`. Avatar and cover URLs are read from `users.avatar_url` and `studios.cover_url`. DemoCatalog no longer substitutes image URLs or descriptions at read time; it only provides optional attribution, demo labels, biographies and reference-video metadata. Real Host uploads and unknown stock URLs are preserved by the importer. Local `/images/` files are served by Vercel; backend `/uploads/` continue to resolve against the existing API origin. Images are not stored as BLOB/base64 in MySQL. The importer creates its own additive backup/history table; existing image/profile schema does not change.

Room details use numbered editorial sections, concise specs, amenity lists, package cards and a visual Host profile. Autocomplete suggests real room records and purpose categories, normalizes Vietnamese accents, recognises purpose aliases and tolerates a one-character typo. Queries are debounced by 250 ms; stale results are ignored. Keyboard arrows/Enter/Escape are supported. Native Enter without a selected suggestion submits the existing search form.

Recommended search results prioritize exact room-name matches, name prefixes and name/description matches, then actual media completeness and published rating averages. No synthetic reviews, ratings or personal behavioural profiling are used. Existing hard filters still apply. Explicit price/capacity/area/newest sorting remains available.

## Apply sample data

Local Compose imports this dataset once after the base seed. If a local database already imported v2 before the seed stopped adding the old stock photos, repair its existing demo galleries with `podman-compose --env-file .env.compose exec -T api php bin/sync-demo-catalog.php --apply`. The repair captures a backup before replacing or removing known demo image rows and skips rooms with custom media.

The CLI command is explicit. Render startup can invoke it once only when `DEMO_CATALOG_UPDATE=v2` and the exact `DEMO_CATALOG_DATABASE` are configured; both are blank/disabled by default. It is not an unconditional seed or schema migration. It repairs only identifiable demo records and adds the five new demo rooms with a real active hourly rate and basic amenity associations. It skips rooms with custom media. Existing booking, payment, user credential and real Host inventory rows are not changed.

1. Keep an Aiven/database backup and verify the demo accounts and exact `DB_NAME`. Keep `SEED_EXAMPLE_CATALOG=false` on the existing production database.
2. If also shipping the earlier Helpdesk changes, deploy the PHP Helpdesk compatibility update first: it accepts both old and new widget context.
3. Deploy Vercel with the 70 local image assets first. Check a sample URL such as `/images/demo-rooms/134469.jpg` loads before updating API data.
4. On the main Render PHP API service (not Helpdesk), configure:

   ```dotenv
   DEMO_CATALOG_UPDATE=v2
   DEMO_CATALOG_DATABASE=defaultdb
   ```

   `defaultdb` is an example: this value MUST exactly match your configured `DB_NAME`. A mismatch fails the opt-in step before catalog writes. The existing Aiven TLS/CA configuration remains required.
5. Deploy the Render API using `server/Dockerfile`. After normal schema migrations it calls `bin/apply-demo-catalog-update.php`. No paid Render Shell is needed. Known demo records are backed up and synchronized; completion is recorded in `demo_catalog_update_runs`. Future starts skip this version. Do not change this flag to an unimplemented version.
6. Check logs for `applied:true` and `databaseBackupRunId` on the first run, or `reason:already_applied` on later starts. Verify `GET /api/rooms/1` contains database-backed image URLs, and search/list/detail pages load the correct galleries. A failure before commit leaves no success marker and no partial data transaction.
7. After verification, clear the two opt-in variables if desired. The record in MySQL also prevents repeat application if they remain set.

Optional manual workflow: from `server/`, `php bin/sync-demo-catalog.php` previews the plan without writes; `php bin/sync-demo-catalog.php --apply` applies on dev/test. A non-development database additionally requires `--allow-production --confirm-database=EXACT_DATABASE_NAME`. `--once` enables the same once-only history check. On Render Free without Shell, an operator-controlled local PHP container can run this CLI using a private env file and mounted CA. No production settings or deployments were changed during implementation.

Writes use a MySQL advisory lock plus a transaction. A private JSON file of affected sample room/image/type rows and profile media is saved under `server/storage/demo-catalog-backups/` with mode 0600. The same backup is stored durably as `backup_json` in `demo_catalog_update_runs`, in the SAME transaction as the data changes; it therefore survives Render filesystem replacement. Completion and new room/image IDs are recorded only on a successful commit. Copy the backup off the database as an additional recovery artifact. The synchronizer never drops tables or resets the database. Repeating it does not duplicate rooms or gallery slots.

For rollback, first clear the opt-in environment variables. Run `php bin/export-demo-catalog-rollback.php --run-id=DATABASE_BACKUP_RUN_ID` to generate a private SQL file without executing it. Review this file against concurrent Host edits and the database target before applying. It restores previous sample descriptions/media/type relations, deactivates new rooms rather than deleting bookings, and retains the audit backup. Existing media URLs are restored only while they still match the imported sample URL. Keep the previous app release and Aiven backup as well. Rollback export was exercised locally; SQL restore on production was not executed or rehearsed.

## Checks

`server/tests/test_demo_catalog_readonly.php` verifies real local MySQL reads: the 21 active demo rooms, galleries and Host images, Workshop classification, exact-match recommendation order and duplicate room records. `client/src/services/api/demo-media.test.ts` checks every image file and rejects duplicate bytes. Search suggestion tests cover Vietnamese aliases, typo matching and real identifiers. Browser checks covered desktop/mobile detail layouts, loaded gallery images, absence of the old table, autocomplete and keyboard selection. Production media and Aiven synchronization still need verification after an operator rollout.

## Deployment audit status

- PASS (local): PHP syntax, database-backed image/description reads, 21 active demo room projections, exact-match ranking, durable 22-room backup, once-only restart behavior, disabled default and wrong-database rejection.
- PASS (local frontend): 211 tests, TypeScript, Next.js production build; desktop/mobile visual checks from the preceding media update.
- NEEDS MANUAL VERIFICATION: Aiven backup availability/restore rehearsal, production CA and database target, uploaded Vercel assets, Render first-start logs and real production list/detail responses. Production deploy readiness is conditional on those checks.
