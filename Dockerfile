# Dev image for the MediFlow backend — used by both the Next.js app and the
# realtime socket server (same deps, different commands).
#
# Source is bind-mounted at runtime for hot reload; node_modules is installed
# here and preserved via an anonymous volume in compose, so the Linux binaries
# aren't shadowed by the host's macOS ones.
FROM node:22-alpine

# Next.js / SWC needs libc compatibility on Alpine.
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Install deps from the lockfile; this layer is cached unless deps change.
COPY package.json package-lock.json ./
RUN npm ci

# 3000 = Next app, 4000 = realtime socket server.
EXPOSE 3000 4000

CMD ["npm", "run", "dev"]
