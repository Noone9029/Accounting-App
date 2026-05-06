import Link from "next/link";
import { AuthForm } from "@/components/forms/auth-form";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <section className="w-full max-w-md rounded-md border border-slate-200 bg-white p-6 shadow-panel">
        <h1 className="text-xl font-semibold text-ink">Create account</h1>
        <p className="mt-1 text-sm text-steel">Start with a user account, then create an organization.</p>
        <div className="mt-6">
          <AuthForm mode="register" />
        </div>
        <p className="mt-4 text-sm text-steel">
          Already registered?{" "}
          <Link href="/login" className="font-medium text-palm">
            Log in
          </Link>
        </p>
      </section>
    </main>
  );
}
