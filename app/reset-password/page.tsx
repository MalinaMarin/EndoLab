import { PasswordForm } from "@/components/auth/password-form";

export default function ResetPasswordPage() {
  return (
    <main className="min-h-[calc(100vh-4rem)] bg-slate-50 px-6 py-14">
      <section className="mx-auto max-w-md rounded-lg border border-slate-200 bg-white p-6">
        <h1 className="text-3xl font-semibold text-slate-950">Choose a new password</h1>
        <p className="mt-2 text-sm text-slate-600">Use at least 10 characters and avoid reusing a password from another service.</p>
        <PasswordForm mode="reset" />
      </section>
    </main>
  );
}
