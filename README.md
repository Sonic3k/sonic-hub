# Sonic Hub

A personal productivity app for tracking tasks, todos, and problems — clean, simple, and built to stay out of your way.

## What it does

Sonic Hub gives you three types of items to work with:

**Tasks** — for things that take effort. Has subtasks, priority levels, due dates, and can repeat on a schedule. Status moves through Open → In Progress → Snoozed → Done → Closed.

**Todos** — for simple things. Just a title, a checkbox, and optional tags or project. No overhead.

**Problems** — for things you want to note down but aren't acting on yet. Write context, track investigation status, resolve when done.

Everything can live standalone or inside a **Project**. Move items between projects or pull them out at any time — same idea as how Claude organizes conversations.

**Tags** let you slice across everything with color labels.

---

## Stack

| Layer | Tech |
|-------|------|
| Backend | Spring Boot 3.3.12, Java 17, PostgreSQL |
| Admin UI | React 18, Vite, TypeScript, TanStack Query |
| Web UI | React 18, Vite, TypeScript, Lora + Nunito fonts |
| Deploy | Railway (Nixpacks, no Docker needed) |

---

## Project structure

```
sonic-hub/
├── sonic-hub-api/       Spring Boot backend
├── sonic-hub-admin/     Internal admin panel (React)
└── sonic-hub-web/       Main web app (React, mobile-friendly)
```

---

## Running locally

**Backend**
```bash
cd sonic-hub-api
# Set up local PostgreSQL or point to Railway DB
mvn spring-boot:run
# Runs on http://localhost:8080
```

**Web UI**
```bash
cd sonic-hub-web
npm install
cp .env.example .env        # set VITE_API_URL=http://localhost:8080
npm run dev
# Runs on http://localhost:3001
```

**Admin**
```bash
cd sonic-hub-admin
npm install
cp .env.example .env        # set VITE_API_URL=http://localhost:8080
npm run dev
# Runs on http://localhost:3000
```

---

## Deploying on Railway

Each folder is a separate Railway service pointing to the same repo.

**sonic-hub-api**
1. New Service → GitHub → `sonic-hub` → Root Directory: `sonic-hub-api`
2. Add PostgreSQL plugin — Railway auto-injects `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`
3. No extra config needed

**sonic-hub-web** and **sonic-hub-admin**
1. New Service → GitHub → `sonic-hub` → Root Directory: `sonic-hub-web` (or `sonic-hub-admin`)
2. Add variable: `VITE_API_URL=https://your-api.railway.app`

Railway uses Nixpacks to auto-detect and build each service.

---

## API overview

```
/api/tasks          CRUD, subtree, move, recurring config
/api/todos          CRUD, toggle done
/api/problems       CRUD, status tracking
/api/projects       CRUD, sub-resources (tasks/todos/problems)
/api/tags           CRUD
/actuator/health    Health check (used by Railway)
```

---

## Design decisions

- **JPA `ddl-auto: update`** — schema evolves automatically, no migration files to manage at this stage
- **Adjacency list** for task tree — simple self-referencing FK, cycle detection via PostgreSQL CTE
- **JSONB** for recurring config — flexible without schema changes
- **No auth on MVP** — personal use, single user
- **Recurring scheduler** runs at 00:05 daily via Spring `@Scheduled` — clones task and advances `nextRun`
