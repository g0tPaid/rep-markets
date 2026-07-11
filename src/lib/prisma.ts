// Temporary stub until Prisma packages install successfully.
export const prisma = new Proxy(
  {},
  {
    get() {
      throw new Error('Database is not connected yet. Storefront uses mock catalog data.');
    },
  },
) as never;
