"use client";

import { FormEvent, useState } from "react";
import { Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
      callbackUrl: searchParams.get("callbackUrl") ?? "/admin",
    });

    setIsSubmitting(false);

    if (result?.error) {
      setError("Invalid admin credentials.");
      return;
    }

    router.push(result?.url ?? "/admin");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 text-black">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm border border-black/10 p-8 shadow-sm"
      >
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-black/50">
            rep.things
          </p>
          <h1 className="mt-3 text-2xl font-semibold">Admin login</h1>
        </div>

        <label className="block text-sm font-medium" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="mt-2 w-full border border-black/20 px-3 py-2 outline-none focus:border-black"
        />

        <label className="mt-5 block text-sm font-medium" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-2 w-full border border-black/20 px-3 py-2 outline-none focus:border-black"
        />

        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-8 w-full bg-black px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-black/50"
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <AdminLoginForm />
    </Suspense>
  );
}
