# ============================================================
# T3 Code — Railway Deployment
# Multi-stage build: Bun for build, Bun + Node.js 24 for runtime
# ============================================================

# --- Node.js 24 binary source (official image, deterministic version) ---
FROM node:24-slim AS node

# --- Stage 1: Install & Build ---
FROM oven/bun:1 AS builder

WORKDIR /app

# Get Node.js 24 from official image (needed for native module compilation
# and satisfies root engine constraint ^24.13.1)
COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -sf /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && ln -sf /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx

# Build essentials for native modules (node-pty requires python3, make, g++)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy workspace config first (cache-friendly layer ordering)
COPY package.json bun.lock turbo.json tsconfig.base.json ./

# Copy ALL workspace package.json files so bun can resolve the full workspace graph.
# Only server, web, contracts, shared, and scripts source is copied below.
COPY apps/web/package.json ./apps/web/
COPY apps/server/package.json ./apps/server/
COPY apps/desktop/package.json ./apps/desktop/
COPY apps/marketing/package.json ./apps/marketing/
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/shared/package.json ./packages/shared/
COPY scripts/package.json ./scripts/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code (only packages needed for the server build)
COPY apps/web/ ./apps/web/
COPY apps/server/ ./apps/server/
COPY packages/ ./packages/
COPY scripts/ ./scripts/

# Build the server and its dependency graph (contracts → shared → web → server).
# The server build bundles apps/web/dist into apps/server/dist/client automatically.
RUN npx turbo run build --filter=t3

# --- Stage 2: Runtime ---
FROM oven/bun:1-slim

WORKDIR /app

# Get Node.js 24 from official image
COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -sf /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && ln -sf /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx

# Git for repo operations, build tools for node-pty native module
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Install Codex CLI globally
RUN npm install -g @openai/codex

# Persistent project storage (Railway volume mounts here)
RUN mkdir -p /workspace && chmod 777 /workspace

# Copy built artifacts and node_modules from builder
COPY --from=builder /app /app

# Prevent the server from trying to open a browser in a container
ENV T3CODE_NO_BROWSER=true

EXPOSE ${T3CODE_PORT:-3773}

# Working directory is the persistent volume so the server auto-bootstraps
# projects from /workspace (process.cwd() becomes the workspace root)
WORKDIR /workspace

# Start the server with absolute path, binding to all interfaces for Railway
CMD ["node", "/app/apps/server/dist/index.mjs", "--host", "0.0.0.0"]
