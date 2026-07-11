# rep.markets

Mobile-first fashion storefront + admin dashboard.

## Stack

- Next.js 15
- Prisma + PostgreSQL
- NextAuth (admin login)
- Tailwind CSS
- Zustand cart

## Local development

```bash
pnpm install
cp .env.example .env
# set DATABASE_URL to a local Postgres URL
pnpm db:push
pnpm db:seed
pnpm dev
```

- Store: http://localhost:3002  
- Admin: http://localhost:3002/admin/login  

## Deploy on Railway

1. Open https://railway.app/new  
2. **Deploy from GitHub repo** → `g0tPaid/rep-markets`  
3. Click the service → **Variables** → **Add variable** / **Add from database**:
   - Add a **PostgreSQL** plugin to the project (New → Database → PostgreSQL)
   - On the web service, set:
     - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (Railway reference)
     - `NEXTAUTH_URL` = your public URL (e.g. `https://….up.railway.app`)
     - `NEXTAUTH_SECRET` = long random string
     - `ADMIN_EMAIL` = e.g. `admin@rep.markets`
     - `ADMIN_PASSWORD` = strong password
4. Generate a public domain: service → **Settings** → **Networking** → **Generate domain**
5. Update `NEXTAUTH_URL` to that exact `https://…` URL, then redeploy
6. After deploy is healthy, open **Shell** and run:

```bash
pnpm db:seed
```

7. Open `/admin/login` and sign in

## Custom domain

Service → **Settings** → **Networking** → **Custom Domain** → add your domain → copy DNS records to your registrar.  
Then set `NEXTAUTH_URL` to `https://your-domain.com` and redeploy.
