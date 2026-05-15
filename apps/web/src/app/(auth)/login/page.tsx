import Link from "next/link";
import { AuthForm } from "@/components/forms/auth-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <section className="w-full max-w-md rounded-md border border-slate-200 bg-white p-6 shadow-panel">
        <h1 className="text-xl font-semibold text-ink">Log in</h1>
        <p className="mt-1 text-sm text-steel">Access your accounting workspace.</p>
        <div className="mt-6">
          <AuthForm mode="login" />
        </div>
        <p className="mt-4 text-sm text-steel">
          New workspace?{" "}
          <Link href="/register" className="font-medium text-palm">
            Create an account
          </Link>
        </p>
        <p className="mt-2 text-sm text-steel">
          Forgot your password?{" "}
          <Link href="/password-reset" className="font-medium text-palm">
            Reset it
          </Link>
        </p>
      </section>
    </main>
  );
}
