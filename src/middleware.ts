import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/admin/login',
  },
  callbacks: {
    authorized: ({ token, req }) => {
      const path = req.nextUrl.pathname;
      if (path.startsWith('/admin/login')) return true;
      if (path.startsWith('/admin')) {
        return token?.role === 'ADMIN';
      }
      return true;
    },
  },
});

export const config = {
  matcher: ['/admin/:path*'],
};
