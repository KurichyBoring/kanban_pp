FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

ENV VITE_API_URL=http://kanban-api:3001

EXPOSE 5173

CMD ["npm", "run", "dev"]