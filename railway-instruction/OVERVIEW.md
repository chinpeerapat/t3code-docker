# Deploy and Host T3 Code with Railway

T3 Code is a minimal web GUI for AI coding agents built by Theo Browne (Ping.gg). It provides a clean browser-based interface for running Codex CLI and Claude Code agents against your codebase, replacing terminal-only workflows with a visual session manager. Currently in alpha with Codex support, Claude Code integration is on the roadmap.

## About Hosting T3 Code

T3 Code is a Bun + Turborepo monorepo with a Vite frontend and an Effect-based Node.js backend server. The Railway template uses a multi-stage Docker build to handle the dual-runtime requirement (Bun for the app, Node.js 24 for Codex CLI and native modules). The template pre-installs Codex CLI and mounts a persistent volume at `/workspace` for project files. Users provide their own OpenAI API key at deploy time. Railway handles SSL termination, domain provisioning, and container lifecycle management. The main consideration is that AI agent operations can be memory-intensive during long coding sessions, so users may want to scale up the service if running complex tasks.

## Common Use Cases

- Running AI coding agents from any device via browser, without local CLI setup
- Providing a team-shared coding agent environment accessible over the web
- Using Codex or Claude Code on machines where local CLI installation isn't practical (Chromebooks, tablets, restricted work laptops)
- Self-hosting a coding agent frontend instead of relying on third-party hosted alternatives

## Dependencies for T3 Code Hosting

- Bun 1.x runtime (>=1.3.9)
- Node.js 24 (required by the monorepo engine constraint and for Codex CLI)
- Git (for cloning and managing repositories in the workspace)
- OpenAI API key (required for Codex agent)

### Deployment Dependencies

- [T3 Code GitHub Repository](https://github.com/pingdotgg/t3code)
- [OpenAI Codex CLI](https://github.com/openai/codex)
- [OpenAI API Keys](https://platform.openai.com/api-keys)
- [T3 Code Releases](https://github.com/pingdotgg/t3code/releases)

### Implementation Details

The template uses a multi-stage Dockerfile:

1. **Build stage** — Installs dependencies with `bun install`, builds the full monorepo with Turborepo (`bun run build`). This builds `@t3tools/contracts`, `@t3tools/web`, and the `t3` server package in the correct dependency order.
2. **Runtime stage** — Slim Bun image with Node.js 24 and Codex CLI pre-installed, copies built artifacts. The server runs via `node apps/server/dist/index.mjs --host 0.0.0.0` to serve both the API and the built web UI.

A volume is mounted at `/workspace` for persistent project storage across redeploys.

The server uses `T3CODE_PORT` (default 3773) for its HTTP/WebSocket port, and serves the Vite-built web assets from the monorepo's `apps/web/dist/` directory.

### Why Deploy T3 Code on Railway?

Railway is a singular platform to deploy your infrastructure stack. Railway will host your infrastructure so you don't have to deal with configuration, while allowing you to vertically and horizontally scale it.

By deploying T3 Code on Railway, you are one step closer to supporting a complete full-stack application with minimal burden. Host your servers, databases, AI agents, and more on Railway.
