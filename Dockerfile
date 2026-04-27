FROM node:20-alpine

WORKDIR /app

COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

RUN cd backend && npm install && \
    cd ../frontend && npm install

COPY backend/ ./backend/
COPY frontend/ ./frontend/

WORKDIR /app/backend
RUN npm run build

EXPOSE 3001

CMD ["npm", "run", "start"]