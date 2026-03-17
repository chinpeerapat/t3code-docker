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

# Copy ONLY the workspace packages needed for the server deployment.
# Desktop (Electron) and marketing (Astro) are excluded entirely to avoid
# pulling in their heavy dependency trees.
COPY apps/web/package.json ./apps/web/
COPY apps/server/package.json ./apps/server/
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/shared/package.json ./packages/shared/
COPY scripts/package.json ./scripts/

# Install dependencies (lockfile is used for resolution but not enforced
# as frozen since the workspace is intentionally trimmed for deployment)
RUN bun install

# Copy source code (only packages needed for the server build)
COPY apps/web/ ./apps/web/
COPY apps/server/ ./apps/server/
COPY packages/ ./packages/
COPY scripts/ ./scripts/

# Build the dependency graph: contracts → shared → web
RUN npx turbo run build --filter=@t3tools/web

# Build the server directly with tsdown (bypasses cli.ts which requires
# development icon assets that may not exist in all forks)
RUN cd apps/server && bun tsdown

# Bundle the built web app into the server's dist/client directory
# (mirrors what apps/server/scripts/cli.ts build does, minus icon overrides)
RUN cp -r apps/web/dist apps/server/dist/client

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
