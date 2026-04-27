FROM node:20-slim

WORKDIR /app

RUN apt-get update && apt-get install -y libssl3 postgresql-client && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

COPY . .

RUN npx prisma generate

EXPOSE 3001

# Run migrations on startup
CMD ["sh", "-c", "npx prisma db push && npm run dev"]