# Kanban Board

Веб-приложение для управления задачами в формате Kanban-доски.

## Стек

- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS + dnd-kit
- **Backend**: Express.js + TypeScript + Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: JWT
- **Containerization**: Docker + Docker Compose

## Функциональность

- Регистрация и авторизация пользователей
- Создание, редактирование и удаление досок
- Управление списками внутри досок
- Создание и перемещение карточек (drag-and-drop)
- Добавление описаний и сроков к карточкам
- Адаптивный UI для мобильных устройств

## Структура проекта

```
kanban-board/
├── backend/              # Express API сервер
│   ├── src/
│   │   ├── controllers/ # Обработчики запросов
│   │   ├── middleware/  # Промежуточное ПО
│   │   ├── models/      # Prisma клиент
│   │   ├── routes/      # Маршруты API
│   │   └── utils/       # Утилиты
│   └── prisma/          # Схема БД
├── frontend/            # React приложение
│   ├── src/
│   │   ├── components/  # UI компоненты
│   │   ├── context/    # React Context
│   │   ├── pages/     # Страницы
│   │   ├── styles/    # CSS стили
│   │   ├── types/     # TypeScript типы
│   │   └── utils/     # Утилиты API
└── docker-compose.yml   # Контейнеры
```

## Локальный запуск

### Требования

- Docker и Docker Compose
- Node.js 20+ (для разработки)

### Запуск

```bash
# Клонирование репозитория
git clone <repo-url>
cd kanban-board

# Запуск всех сервисов
docker-compose up -d

# Или через npm
npm run start
```

### Доступ к сервисам

- **Backend API**: http://localhost:3001
- **Frontend**: http://localhost:5173

### Остановка

```bash
docker-compose down
# Удалить данные
docker-compose down -v
```

## Разработка

### Backend

```bash
cd backend
npm install
npm run dev          # Запуск с watch
npm run build       # Компиляция
```

### Frontend

```bash
cd frontend
npm install
npm run dev         # Запуск dev сервера
npm run build      # Сборка
npm run lint       # Линтинг
```

## Переменные окружения

### Backend (.env)

```
PORT=3001
DATABASE_URL=postgresql://kanban:kanban@db:5432/kanban?schema=public
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
NODE_ENV=development
```

## API Endpoints

### Auth
- `POST /api/auth/register` - Регистрация
- `POST /api/auth/login` - Вход
- `GET /api/auth/me` - Текущий пользователь

### Boards
- `GET /api/boards` - Список досок
- `POST /api/boards` - Создать доску
- `GET /api/boards/:id` - Доска
- `PUT /api/boards/:id` - Обновить
- `DELETE /api/boards/:id` - Удалить

### Lists
- `POST /api/boards/:boardId/lists` - Создать список
- `PUT /api/lists/:id` - Обновить
- `DELETE /api/lists/:id` - Удалить

### Cards
- `POST /api/lists/:listId/cards` - Создать карточку
- `PUT /api/cards/:id` - Обновить
- `DELETE /api/cards/:id` - Удалить
- `PUT /api/cards/:id/move` - Переместить

## Лицензия

MIT