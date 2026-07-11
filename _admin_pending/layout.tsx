"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/coupons", label: "Coupons" },
  { href: "/admin/media", label: "Media" },
  { href: "/admin/settings", label: "Settings" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/admin/login") {
    return children;
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-black">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-black/10 bg-white p-6 lg:block">
        <Link href="/admin" className="block">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-black/45">
            rep.things
          </p>
          <p className="mt-2 text-xl font-semibold">Admin</p>
        </Link>

        <nav className="mt-10 space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/admin"
                ? pathname === item.href
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-3 py-2 text-sm ${
                  isActive
                    ? "bg-black text-white"
                    : "text-black/70 hover:bg-black/5 hover:text-black"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
          className="absolute bottom-6 left-6 right-6 border border-black/20 px-3 py-2 text-sm hover:border-black"
        >
          Sign out
        </button>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-black/10 bg-white/95 px-5 py-4 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-4">
            <Link href="/admin" className="font-semibold">
              rep.things Admin
            </Link>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/admin/login" })}
              className="text-sm text-black/60"
            >
              Sign out
            </button>
          </div>
          <nav className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="shrink-0 border border-black/10 px-3 py-1.5 text-sm"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>

        <main className="mx-auto max-w-7xl px-5 py-8 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
