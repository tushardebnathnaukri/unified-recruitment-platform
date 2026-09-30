# The Launchpad preview, built FROM THE REPO — what deploy-on-push to `master`
# runs (see "Deploying" in CLAUDE.md).
#
# The same image `apps/ai/Dockerfile` makes from a hand-assembled bundle: the AI
# server as `server/`, the built `apps/web` as `public/`, one container serving
# both. That file is still what a ZIP deploy uses; this one does the assembling
# itself, so a pushed commit is all Launchpad needs. GEMINI_API_KEY comes from
# the Launchpad project's environment, never from this image, and
# `.dockerignore` keeps every `.env*` out of the build context.

# --- Build the site ------------------------------------------------------------
FROM node:24-alpine AS build
WORKDIR /repo

# The manifests first, so a change to the source does not re-run the install.
# The lockfile carries the musl builds of rolldown, Tailwind's oxide and
# lightningcss, which is what alpine needs.
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY apps/ai/package.json apps/ai/
COPY packages/ui/package.json packages/ui/
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build -w web

# --- Run it ----------------------------------------------------------------------
# Node 24 runs the server's TypeScript directly, and it has no dependencies,
# so the runtime stage carries no node_modules at all.
FROM node:24-alpine
WORKDIR /app
COPY --from=build /repo/apps/ai/package.json /repo/apps/ai/tsconfig.json ./server/
COPY --from=build /repo/apps/ai/src/ ./server/src/
COPY --from=build /repo/apps/web/dist/ ./public/
# Agent conversations (`/api/sessions`), kept across a restart of this
# container. A redeploy is a new container, so they do not survive that.
RUN mkdir -p /app/data && chown node:node /app/data
ENV NODE_ENV=production PORT=3000 STATIC_DIR=/app/public \
    SESSIONS_FILE=/app/data/sessions.json
EXPOSE 3000
USER node
CMD ["node", "server/src/server.ts"]
