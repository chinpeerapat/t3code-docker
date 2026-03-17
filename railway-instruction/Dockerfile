# ============================================================
# T3 Code — Railway Deployment
# Multi-stage build: Bun for build, Bun + Node for runtime
# ============================================================

# --- Stage 1: Install & Build ---
FROM oven/bun:1 AS builder

WORKDIR /app

# Install build essentials for native modules (node-pty) and Node.js 24
RUN apt-get update && apt-get install -y \
    curl \
    python3 \
    make \
    g++ \
    && curl -fsSL https://deb.nodesource.com/setup_current.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Copy workspace config first (cache-friendly layer ordering)
COPY package.json bun.lock turbo.json ./
COPY tsconfig.base.json ./

# Copy all workspace package.json files for dependency resolution
COPY apps/web/package.json ./apps/web/
COPY apps/server/package.json ./apps/server/
COPY apps/desktop/package.json ./apps/desktop/
COPY apps/marketing/package.json ./apps/marketing/
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/shared/package.json ./packages/shared/
COPY scripts/package.json ./scripts/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY apps/web/ ./apps/web/
COPY apps/server/ ./apps/server/
COPY packages/ ./packages/
COPY scripts/ ./scripts/

# Build everything (Turborepo handles the dependency graph)
RUN bun run build

# --- Stage 2: Runtime ---
FROM oven/bun:1-slim

WORKDIR /app

# Install Node.js 24 + git + build tools for native modules (node-pty)
RUN apt-get update && apt-get install -y \
    curl \
    git \
    python3 \
    make \
    g++ \
    && curl -fsSL https://deb.nodesource.com/setup_current.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install Codex CLI globally
RUN npm install -g @openai/codex

# Create workspace directory for user projects
RUN mkdir -p /workspace && chmod 777 /workspace

# Copy built artifacts from builder
COPY --from=builder /app /app

# Railway injects PORT — T3 Code uses T3CODE_PORT
ENV T3CODE_NO_BROWSER=true

EXPOSE ${T3CODE_PORT:-3773}

# Start the server in web mode, binding to all interfaces for Railway
CMD ["node", "apps/server/dist/index.mjs", "--host", "0.0.0.0"]
