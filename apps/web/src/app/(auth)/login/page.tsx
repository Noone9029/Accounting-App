import { AuthPageShell, AuthTextLink } from "@/components/auth/auth-page-shell";
import { AuthForm } from "@/components/forms/auth-form";

export default function LoginPage() {
  return (
    <AuthPageShell
      title="Log in"
      description="Access your accounting workspace."
      footer={
        <>
          <p>
            New workspace?{" "}
            <AuthTextLink href="/register">Create an account</AuthTextLink>
          </p>
          <p>
            Forgot your password?{" "}
            <AuthTextLink href="/password-reset">Reset it</AuthTextLink>
          </p>
        </>
      }
    >
      <AuthForm mode="login" />
    </AuthPageShell>
  );
}
