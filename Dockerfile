# syntax=docker/dockerfile:1

# ---------- deps ----------
FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/liuyao-engine/package.json packages/liuyao-engine/package.json
RUN npm ci --ignore-scripts

# ---------- engine ----------
# liuyao-engine 的 dist/ 不入库（.gitignore），镜像内从 src 现场构建；
# 纯 TS、零运行时依赖，next build 解析 node_modules/liuyao-engine 时需要它
FROM node:20-bookworm-slim AS engine
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY packages/liuyao-engine/package.json packages/liuyao-engine/tsconfig.json packages/liuyao-engine/
COPY packages/liuyao-engine/src packages/liuyao-engine/src
RUN npx tsc -p packages/liuyao-engine/tsconfig.json

# ---------- builder ----------
FROM node:20-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY --from=engine /app/packages/liuyao-engine/dist ./packages/liuyao-engine/dist
COPY . .
RUN npm run build

# ---------- runner ----------
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    TZ=Asia/Shanghai \
    PORT=3000 \
    HOSTNAME=0.0.0.0
# umask 0027：新文件默认 0640/组不可写（§54-8）；data 目录在启动时由 entrypoint 确保
RUN apt-get update \
    && apt-get install -y --no-install-recommends wget \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --chown=nextjs:nodejs docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh \
    && mkdir -p /app/data/config \
    && chown -R nextjs:nodejs /app/data

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "server.js"]
