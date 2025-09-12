# ===== MadServ Fullstack (Node.js + Express + SQLite) =====
# Build stage
FROM node:18-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --production

# Runtime stage
FROM node:18-alpine
WORKDIR /app
ENV NODE_ENV=production
# Create a non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=build /app/node_modules ./node_modules
COPY . .
RUN mkdir -p /app/data && chown -R appuser:appgroup /app
USER appuser
EXPOSE 3000
CMD ["node", "server.js"]
