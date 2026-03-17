# T3 Code on Railway

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/template/TEMPLATE_CODE?referralCode=YOUR_CODE)

One-click deploy [T3 Code](https://github.com/pingdotgg/t3code) — a minimal web GUI for AI coding agents — on Railway.

## What's Included

- **T3 Code** — Web UI + server for interacting with AI coding agents (Codex, Claude Code)
- **Codex CLI** — Pre-installed OpenAI Codex command-line agent
- **Persistent Workspace** — Volume-backed `/workspace` directory for your projects

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | Your OpenAI API key for Codex agent. Get one at [platform.openai.com](https://platform.openai.com/api-keys). | Yes |
| `ANTHROPIC_API_KEY` | Your Anthropic API key for Claude Code (when supported). Get one at [console.anthropic.com](https://console.anthropic.com/). | Optional |
| `T3CODE_PORT` | Application port (default: 3773). | Auto |
| `T3CODE_AUTH_TOKEN` | Auth token for WebSocket connections. Recommended for security. | Recommended |

## Post-Deploy Setup

1. Wait for the deployment to complete (first build takes ~3–5 minutes)
2. Visit your Railway-generated domain
3. Clone or create a project in the `/workspace` directory
4. Start coding with AI agents through the T3 Code interface

## Volumes

| Service | Mount Path | Purpose |
|---------|-----------|---------|
| T3 Code | `/workspace` | Persistent project files across redeploys |

## Important Notes

- **API keys are required** — T3 Code is a GUI for AI agents, which need API access to function
- **Early alpha software** — T3 Code is under active development; expect breaking changes
- **Default port is 3773** — T3 Code uses `T3CODE_PORT` (not `PORT`) for its server port
- **Auth token recommended** — Set `T3CODE_AUTH_TOKEN` to secure WebSocket connections when exposed publicly

## Links

- [T3 Code GitHub](https://github.com/pingdotgg/t3code)
- [T3 Code Website](https://t3.codes)
- [OpenAI Codex CLI](https://github.com/openai/codex)
- [Railway Template](https://railway.com/template/TEMPLATE_CODE)
