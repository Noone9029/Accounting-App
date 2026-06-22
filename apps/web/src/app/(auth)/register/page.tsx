import { AuthPageShell, AuthTextLink } from "@/components/auth/auth-page-shell";
import { AuthForm } from "@/components/forms/auth-form";

export default function RegisterPage() {
  return (
    <AuthPageShell
      title="Create account"
      description="Start with a user account, then create an organization."
      footer={
        <p>
          Already registered?{" "}
          <AuthTextLink href="/login">Log in</AuthTextLink>
        </p>
      }
    >
      <AuthForm mode="register" />
    </AuthPageShell>
  );
}
