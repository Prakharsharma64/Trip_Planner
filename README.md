# India Trip Planner — Bucket List App

A multi-user bucket list app with 159 destinations across 28 states and 8 UTs. Login-only auth with 3 pre-seeded users.

## Setup

1. **Copy environment file**
   ```bash
   cp .env.example .env
   ```

2. **Add `JWT_SECRET` to `.env`** (min 32 characters)
   ```
   JWT_SECRET=your-secret-key-min-32-characters-long
   ```

3. **Install dependencies**
   ```bash
   npm install
   cd client && npm install && cd ..
   ```

4. **Seed database**
   ```bash
   npm run seed        # 159 destinations
   npm run seed:users  # 3 users
   ```

5. **Start backend**
   ```bash
   npm start
   ```

6. **Start frontend (development)**
   ```bash
   npm run dev:client
   ```
   Open http://localhost:5173

## Login Credentials

| Name | Email | Password | Role |
|------|-------|----------|------|
| Prakhar Sharma | prakhar@tripplanner.in | PrakharAdmin@2026 | admin |
| Abhinav Jain | abhinav@tripplanner.in | AbhinavUser@2026 | user |
| Harshit Chauhan | harshit@tripplanner.in | HarshitUser@2026 | user |

## Run Both (Development)

```bash
npm run dev
```
Starts backend (3000) + frontend dev server (5173) in one terminal.

## Production Build (Local)

```bash
npm run build
npm start
```
Builds React app and serves everything from port 3000.

## Deploy on Render

1. Push to GitHub and connect repo to Render.
2. Create a **Web Service** (not static site).
3. **Build Command:** `npm install && npm run build`
4. **Start Command:** `npm start`
5. **Environment Variables:** Add `MONGODB_URI` and `JWT_SECRET`
6. Deploy.

Or use the included `render.yaml` for blueprint deploy.

## API

- `POST /api/auth/login` — email, password → JWT
- `GET /api/auth/me` — current user (auth required)
- `GET /api/destinations` — paginated, filters: tier, maxBudget, state, category
- `GET /api/destinations/states` — list states
- `GET /api/destinations/suggestions` — suggestions by budget
- `GET /api/bucket` — user's bucket list (auth required)
- `POST /api/bucket` — add destination (auth required)
- `PATCH /api/bucket/:id` — update status/notes
- `DELETE /api/bucket/:id` — remove
- `GET /api/users/me` — profile (auth required)
- `PATCH /api/users/me` — update name
