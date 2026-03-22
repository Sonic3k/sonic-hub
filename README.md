# Sonic Hub

Task tracking application — clean, simple, extendable.

## Structure

```
sonic-hub/
├── sonic-hub-api/      # Spring Boot 3.3.12 / Java 17 backend
└── sonic-hub-admin/    # React 18 + Vite + TypeScript frontend
```

## Stack

**Backend**
- Spring Boot 3.3.12, Java 17
- PostgreSQL + JPA (ddl-auto: update)
- Railway-compatible (Nixpacks)

**Frontend**
- React 18 + Vite + TypeScript
- TanStack Query + Axios
- Tailwind CSS

## Local Development

**Backend**
```bash
cd sonic-hub-api
# Set env vars or update application.properties for local DB
mvn spring-boot:run
# Runs on http://localhost:8080
```

**Frontend**
```bash
cd sonic-hub-admin
npm install
cp .env.example .env   # set VITE_API_URL=http://localhost:8080
npm run dev
# Runs on http://localhost:3000
```

## Deploy on Railway

1. **sonic-hub-api** — New Service → link this repo → Root Directory: `sonic-hub-api` → add PostgreSQL plugin
2. **sonic-hub-admin** — New Service → link this repo → Root Directory: `sonic-hub-admin` → add env var `VITE_API_URL=https://your-api.railway.app`
