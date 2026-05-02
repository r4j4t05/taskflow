# Railway Deployment

Deploy TaskFlow as two Railway services from the same GitHub repository.

## 1. Backend service

Create a new Railway service from the repo and set:

- Root Directory: `backend`
- Build command: handled by `backend/railway.json`
- Start command: handled by `backend/railway.json`

Add these variables:

```env
NODE_ENV=production
JWT_SECRET=replace-with-a-long-random-secret
FRONTEND_URL=https://your-frontend-service.up.railway.app
DB_PATH=/app/data/taskflow.db
SEED_DEMO_DATA=true
```

Add a Railway Volume to the backend service:

- Mount path: `/app/data`

After deployment, test:

```text
https://your-backend-service.up.railway.app/health
```

## 2. Frontend service

Create a second Railway service from the same repo and set:

- Root Directory: `frontend`
- Build command: handled by `frontend/railway.json`
- Start command: handled by `frontend/railway.json`

Add this variable:

```env
VITE_API_URL=https://your-backend-service.up.railway.app/api
```

Redeploy the frontend after setting `VITE_API_URL`.

## 3. Final CORS update

Copy the deployed frontend URL and update the backend variable:

```env
FRONTEND_URL=https://your-frontend-service.up.railway.app
```

Redeploy the backend once.

## Demo credentials

If `SEED_DEMO_DATA=true`, the backend creates:

```text
admin@taskflow.com / admin123
member@taskflow.com / member123
jordan@taskflow.com / member123
```
