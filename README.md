# ChemLab

ChemLab is a React/Vite chemistry learning platform. Its reaction testing mode uses a persistent Node.js API and SQLite catalogue; the coefficient answers stay on the server until a test is completed.

## Run locally

Use Node.js 22.13 or newer. Install dependencies, then run the API and frontend in separate terminals:

```sh
npm install
npm run server
npm run dev
```

The Vite development server proxies `/api` requests to `http://127.0.0.1:3001`. The SQLite database is created at `data/chemlab.sqlite` and survives restarts. The database and its WAL files are ignored by Git.

## Reaction testing

Open **Reaksiyalar → Bilimni sinash**. A session always contains 20 unique questions from the validated catalogue. Tests are sampled without replacement, and a selected difficulty can only start when its catalogue contains at least 20 eligible reactions. If not, the UI explains the shortfall instead of duplicating questions.

Answer fields accept positive integer coefficients in reactant-then-product order. The server stores test progress and does not send answer keys before all 20 questions have been answered. Results include score, percentage, duration, submitted/correct coefficients, balanced equations, and atom-count checks. Incorrect questions can be reviewed or prioritized in a new 20-question session.

## Reaction data and synchronization

The offline catalogue is seeded with curated educational equations and validated at startup using ChemLab's formula parser and exact-rational balancer. This mathematical validation checks formula syntax, coefficient positivity, and atom conservation; it does not assert that every equation is chemically feasible.

The server checks the Rhea REST endpoint at startup when no successful sync is recorded, then weekly by default. Override the interval with `REACTION_SYNC_INTERVAL_MS`. Rhea's documented equation results use participant names, not consistently molecular formula strings, and include ChEBI participant IDs. ChemLab looks up formula and charge metadata through the official ChEBI API, then imports only neutral compounds whose formulas and equations pass the same parser and balancing validation. Unsupported names, charged species, and structures are skipped and counted; no product formulas are invented. Requests are bounded, timed out, retried on transient failures, and use cached ChEBI data when available. Per-sync formula lookups are capped at 4,000 new ChEBI IDs; remaining IDs are deferred for a later sync. The UI reports imported, skipped, and duplicate reaction counts, formula lookup failures, and deferred IDs while continuing to use SQLite offline.

Rhea describes itself as an expert-curated knowledgebase of chemical and transport reactions of biological interest. Its data is published under CC BY 4.0; imported records retain their Rhea identifier and source URL. ChEBI supplies the linked molecular formula and charge metadata. See the [Rhea programmatic access documentation](https://www.rhea-db.org/help/api), [download documentation](https://www.rhea-db.org/help/download), and [license and disclaimer](https://www.rhea-db.org/help/license-disclaimer), plus the [ChEBI database](https://www.ebi.ac.uk/chebi/). Since Rhea is biologically focused and many participants cannot be represented by the current formula parser, this integration is deliberately conservative; it does not claim to be a broad school-chemistry prediction service.

For administrator-triggered refreshes, configure `CHEMLAB_ADMIN_TOKEN` in the API process environment. The token is sent only to the backend in a request header and is never bundled into the frontend. Manual refreshes are rate-limited. Deploy the API as a long-running Node process with a persistent writable volume; serverless/ephemeral filesystems are unsuitable for this SQLite scheduler and database.

## Validation

```sh
npm test
npm run lint
npm run build
```
