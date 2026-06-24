import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/account";

export default async function AccountPage() {
  const context = await getUserContext();
  if (!context) redirect("/login");
  redirect(context.accountType === "clinic" ? "/clinic/dashboard" : "/patient/dashboard");
}
