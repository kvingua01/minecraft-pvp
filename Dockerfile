FROM node:24-bookworm-slim@sha256:55fb5f5a527ea2c5c4a95f963e48ef90aa38c7b346054fdc8ee9957a2b55d205
WORKDIR /app
ENV NODE_ENV=production
COPY --chown=node:node package.json package-lock.json ./
RUN --mount=type=secret,id=build_ca \
    if [ -f /run/secrets/build_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/build_ca; fi; \
    npm ci --omit=dev --no-audit --no-fund --fetch-retries=1 --fetch-timeout=30000 && rm -rf /root/.npm
COPY --chown=node:node server.js ./
COPY --chown=node:node lib ./lib
COPY --chown=node:node shared ./shared
COPY --chown=node:node public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
