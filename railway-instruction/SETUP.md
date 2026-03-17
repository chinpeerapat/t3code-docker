# T3 Code Railway Template — Setup Guide

## What You Have

This directory contains everything needed to create a Railway template for T3 Code:

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage build (Bun + Node.js 24 + Codex CLI) |
| `railway.toml` | Railway config-as-code |
| `README.md` | Template repo README with deploy button |
| `OVERVIEW.md` | Railway marketplace listing copy |
| `SETUP.md` | This file — your step-by-step guide |

---

## Resolved Questions

These were open questions that have been investigated and resolved:

### 1. Start Command
**Status:** Resolved
**Answer:** `node apps/server/dist/index.mjs --host 0.0.0.0`
- Root `bun run start` runs `turbo run start --filter=t3`
- Server's start script is `node dist/index.mjs`
- For Railway, we run the server entry point directly with `--host 0.0.0.0` to bind all interfaces

### 2. Port Configuration
**Status:** Resolved
**Answer:** Default port is **3773**. Uses `T3CODE_PORT` env var (NOT the standard `PORT`).
- Defined in `apps/server/src/config.ts` as `DEFAULT_PORT = 3773`
- Railway should set `T3CODE_PORT` in template variables, or users can leave it at default

### 3. Web + Server Relationship
**Status:** Resolved
**Answer:** The server serves the web app's built assets. Single process.
- `resolveStaticDir()` in `apps/server/src/config.ts` looks for:
  1. `<server-dist>/client/index.html` (packaged/published mode)
  2. `<server-dist>/../../web/dist/index.html` (monorepo mode — this is what Railway uses)
- No need for multi-process setup

### 4. Remote Mode Configuration
**Status:** Resolved
**Answer:** No special mode needed. Key env vars:
- `T3CODE_NO_BROWSER=true` — prevents auto-open (required in Docker)
- `T3CODE_AUTH_TOKEN` — optional but recommended for security when exposed publicly
- `T3CODE_PORT` — port override (default 3773)
- `--host 0.0.0.0` CLI flag binds to all interfaces

### 5. Agent Workspace Path
**Status:** Resolved
**Answer:** The server uses `process.cwd()` as the workspace root and auto-bootstraps a project from it when `autoBootstrapProjectFromCwd` is true (default in web mode). The `/workspace` volume mount provides persistent storage. Users `cd` into projects or clone repos there.

### 6. Package Names
**Status:** Resolved
**Answer:**
- Server: `t3` (not `@t3code/server`)
- Web: `@t3tools/web` (not `@t3code/web`)
- Contracts: `@t3tools/contracts`
- Shared: `@t3tools/shared`
- Scripts: `@t3tools/scripts`
- Monorepo root: `@t3tools/monorepo`

### 7. Node.js Version
**Status:** Resolved
**Answer:** Root `package.json` requires `node: "^24.13.1"`. Server accepts `^22.16 || ^23.11 || >=24.10`. Must use **Node.js 24** to satisfy root constraint.

### 8. Native Dependencies
**Status:** Resolved
**Answer:** `node-pty` requires `python3`, `make`, and `g++` for native compilation. These must be present in both build and runtime stages.

---

## Step-by-Step: Creating the Template

### Phase 1: Prepare Your Fork

1. **Fork the repo**
   ```bash
   gh repo fork pingdotgg/t3code --clone
   cd t3code
   ```

2. **Copy the template files to root**
   ```bash
   cp railway-instruction/Dockerfile ./Dockerfile
   cp railway-instruction/railway.toml ./railway.toml
   ```

3. **Test the Docker build locally**
   ```bash
   docker build -t t3code-railway .
   docker run -p 3773:3773 \
     -e OPENAI_API_KEY=sk-test-xxx \
     -e T3CODE_PORT=3773 \
     -v $(pwd)/workspace:/workspace \
     t3code-railway
   ```

   If it crashes, check:
   - Build output for the correct path to the server entry point
   - Whether `node-pty` compiled correctly (needs python3/make/g++)
   - Deploy logs for missing env vars

4. **Commit and push**
   ```bash
   git add Dockerfile railway.toml
   git commit -m "Add Railway deployment config"
   git push origin main
   ```

### Phase 2: Create the Template in Railway

5. **Go to Railway**: https://railway.com/workspace/templates
   Click **New Template**

6. **Add the T3 Code service**
   - Source: your forked GitHub repo
   - Branch: `main`

7. **Configure environment variables**

   | Variable | Value | Description |
   |----------|-------|-------------|
   | `OPENAI_API_KEY` | *(user provides)* | OpenAI API key for Codex agent. Get one at platform.openai.com/api-keys |
   | `ANTHROPIC_API_KEY` | *(optional, user provides)* | Anthropic API key for Claude Code. Optional — leave blank if not using Claude. |
   | `T3CODE_PORT` | `3773` | Application port. T3 Code uses this (not PORT). |
   | `T3CODE_AUTH_TOKEN` | *(optional, user provides)* | Auth token for WebSocket security. Recommended when exposed publicly. |

   For `OPENAI_API_KEY`: mark as **required**, leave value blank (user fills at deploy).
   For `ANTHROPIC_API_KEY`: mark as **optional**.
   For `T3CODE_AUTH_TOKEN`: mark as **optional**, recommend users set it.

8. **Attach a volume**
   - Right-click the service → Attach Volume
   - Mount path: `/workspace`
   - This persists user projects across redeploys

9. **Click "Create Template"**

### Phase 3: Test & Publish

10. **Deploy from your template** to test it works
    - Provide a real `OPENAI_API_KEY`
    - Wait for build + deploy
    - Visit the generated domain
    - Verify the UI loads
    - Verify Codex agent can communicate

11. **Fix any issues** (see troubleshooting below)

12. **Publish**
    - Go to Workspace Settings → Templates
    - Click "Publish" next to your template
    - Paste the `OVERVIEW.md` content into the overview field

13. **Add deploy button to your fork's README**
    - Replace `TEMPLATE_CODE` and `YOUR_CODE` in `README.md` with your actual template code and referral code
    - Commit and push

---

## Troubleshooting

### Build fails: "Cannot find module"
- Package names in filter flags don't match actual workspace names
- The Dockerfile now uses `bun run build` (no filters) to build the full monorepo

### Build fails: "bun.lock is out of date"
- The fork's lock file is stale
- Fix: Run `bun install` locally, commit the updated `bun.lock`

### Build fails: node-pty compilation error
- Missing build tools (python3, make, g++)
- The Dockerfile includes these in both build and runtime stages

### "Application failed to respond" after deploy
- PORT mismatch — T3 Code uses `T3CODE_PORT`, not `PORT`
- Fix: Set `T3CODE_PORT=3773` explicitly in Railway variables
- Also ensure Railway's networking is configured to route to port 3773

### Web UI loads but agent doesn't work
- Codex CLI not installed or not authorized
- Fix: Verify `npm install -g @openai/codex` succeeds in the Docker build
- Codex uses `OPENAI_API_KEY` env var directly — no interactive auth needed

### Container exits immediately
- Missing required env var or config file
- Fix: Check deploy logs for the error, add missing variables

### "web bundle missing" warning in logs
- The web app wasn't built, or the dist path is wrong
- The server looks for `apps/web/dist/index.html` relative to `apps/server/dist/`
- Ensure `bun run build` completed successfully during Docker build
