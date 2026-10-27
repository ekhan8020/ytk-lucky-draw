<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project docs (read first)
Project rules and context are in `CLAUDE.md` — read it, then `docs/STATUS.md` (what exists, migrations, lessons) and `docs/DEPLOYMENT.md` (environments, deploy, SQL, troubleshooting).
Secrets are never in git; SQL is run by the owner in the Supabase SQL editor (TEST first). Pushing to `master` auto-deploys the TEST site; PROD is a manual workflow.
