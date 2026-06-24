import { PasswordForm } from "@/components/auth/password-form";

export default function ForgotPasswordPage() {
  return <PasswordPage title="Reset your password" description="Enter your account email and we will send a secure reset link." mode="forgot" />;
}

function PasswordPage({ title, description, mode }: { title: string; description: string; mode: "forgot" | "reset" }) {
  return (
    <main className="min-h-[calc(100vh-4rem)] bg-slate-50 px-6 py-14">
      <section className="mx-auto max-w-md rounded-lg border border-slate-200 bg-white p-6">
        <h1 className="text-3xl font-semibold text-slate-950">{title}</h1>
        <p className="mt-2 text-sm text-slate-600">{description}</p>
        <PasswordForm mode={mode} />
      </section>
    </main>
  );
}
