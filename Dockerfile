FROM node:22-bookworm-slim AS build
RUN --mount=type=secret,id=build_ca \
    if [ -f /run/secrets/build_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/build_ca; fi; \
    apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates python3 build-essential \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g bun@1.3.4
WORKDIR /app
COPY package.json bun.lock ./
RUN --mount=type=secret,id=build_ca \
    if [ -f /run/secrets/build_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/build_ca; fi; \
    bun install --frozen-lockfile
# Explicit inputs keep accidental nested clones and local files out of the image.
COPY src ./src
COPY prisma ./prisma
COPY public ./public
COPY scripts ./scripts
COPY tests ./tests
COPY deploy ./deploy
COPY next.config.ts tsconfig.json postcss.config.mjs tailwind.config.ts components.json eslint.config.mjs ./
# Disposable build database; no runtime secrets or client data enter the image.
ENV DATABASE_URL=file:/tmp/parrotrehome-build.db NEXTAUTH_URL=http://localhost:3000 MAIL_TRANSPORT=preview NEXT_TELEMETRY_DISABLED=1
RUN --mount=type=secret,id=build_ca \
    if [ -f /run/secrets/build_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/build_ca; fi; \
    bun run db:generate \
    && python3 -c 'import sqlite3; c=sqlite3.connect("/tmp/parrotrehome-build.db"); c.execute("PRAGMA user_version=0"); c.close()' \
    && bun x prisma db push --skip-generate \
    && bun test ./tests/receipt-pdf.test.ts ./tests/whatsapp.test.ts ./tests/visit-tracking.test.ts ./tests/cookie-consent.test.ts ./tests/bird-age.test.ts ./tests/demo-workflow.test.ts ./tests/image-upload.test.ts ./tests/deployment-bootstrap.test.ts ./tests/session-policy.test.ts ./tests/email-transport.test.ts ./tests/email-signatures.test.ts \
    && python3 tests/test_audit_migration.py \
    && python3 tests/test_visit_migration.py \
    && python3 tests/test_seller_migration.py \
    && python3 tests/test_public_phone_migration.py \
    && python3 tests/test_receipt_migration.py \
    && bun test ./tests/email-inbox.test.ts \
    && bun test ./tests/auth-integration.test.ts \
    && bun run build \
    && rm -f /tmp/parrotrehome-build.db

FROM build AS setup
CMD ["bash", "scripts/docker-init.sh"]

FROM node:22-bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000 NEXT_TELEMETRY_DISABLED=1
COPY --from=build --chown=node:node /app/.next/standalone ./
USER node
EXPOSE 3000
CMD ["node", "server.js"]
