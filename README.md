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

## Railway deploy

1. Create a new Railway project from GitHub repo `g0tPaid/rep-markets`
2. Add a **PostgreSQL** plugin and link it (sets `DATABASE_URL`)
3. Set variables:
   - `NEXTAUTH_URL` = your Railway public URL (later your custom domain)
   - `NEXTAUTH_SECRET` = long random string
   - `ADMIN_EMAIL` / `ADMIN_PASSWORD` = your admin login
4. Deploy
5. After first deploy, run seed once from Railway shell or locally against prod DB:

```bash
pnpm db:seed
```

6. Open `/admin/login` and sign in

## Custom domain

Railway service → Settings → Networking → Custom Domain → add your domain → copy the DNS records into your registrar.
