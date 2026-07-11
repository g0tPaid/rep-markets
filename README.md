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

## Deploy on Render (free)

### Option A — Blueprint (fastest)

1. Open https://dashboard.render.com/select-repo?type=blueprint  
2. Connect GitHub and select **`g0tPaid/rep-markets`**  
3. Render reads `render.yaml` and creates:
   - Free **Web Service**
   - Free **Postgres** (expires after 30 days unless upgraded)
4. Fill these when prompted:
   - `NEXTAUTH_URL` → leave blank first, then set to your live URL after deploy (e.g. `https://rep-markets.onrender.com`)
   - `ADMIN_EMAIL` → e.g. `admin@rep.markets`
   - `ADMIN_PASSWORD` → strong password
5. Click **Apply** and wait for the first deploy

### Option B — Manual

1. **New → PostgreSQL** → Free → create `rep-markets-db`  
2. **New → Web Service** → repo `g0tPaid/rep-markets`  
3. Settings:
   - Runtime: **Node**
   - Build: `corepack enable && pnpm install && pnpm build`
   - Start: `pnpm exec prisma migrate deploy && pnpm start`
   - Instance: **Free**
4. Environment:
   - `DATABASE_URL` = Internal Database URL from Postgres
   - `NEXTAUTH_URL` = `https://YOUR-SERVICE.onrender.com`
   - `NEXTAUTH_SECRET` = long random string
   - `ADMIN_EMAIL` / `ADMIN_PASSWORD` = admin login

### After first deploy — seed once

In Render → Web Service → **Shell**:

```bash
pnpm db:seed
```

Then open:

`https://YOUR-SERVICE.onrender.com/admin/login`

### Custom domain

Web Service → **Settings → Custom Domains** → add your domain → copy DNS records to your registrar.  
Then update `NEXTAUTH_URL` to `https://your-domain.com` and redeploy.

### Free-tier notes

- Web service **sleeps after ~15 min** idle (first load can take ~1 min)
- Free Postgres **expires in 30 days** unless you upgrade
