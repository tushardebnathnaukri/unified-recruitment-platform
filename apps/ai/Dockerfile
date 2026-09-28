# The Launchpad preview: one container serving the built site AND the AI server.
#
# The build context is NOT the repo. The deploy assembles it (see "Deploying"
# in CLAUDE.md): this file at the root, `apps/ai` as `server/`, and the built
# `apps/web/dist` as `public/`. GEMINI_API_KEY comes from the Launchpad
# project's environment, never from this image.
#
# Node 24 runs the server's TypeScript directly, and it has no dependencies,
# so there is nothing to install.
FROM node:24-alpine
WORKDIR /app
COPY server/ ./server/
COPY public/ ./public/
ENV NODE_ENV=production PORT=3000 STATIC_DIR=/app/public
EXPOSE 3000
USER node
CMD ["node", "server/src/server.ts"]
