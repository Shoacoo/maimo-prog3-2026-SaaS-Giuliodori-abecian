import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/session";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  redirect("/dashboard/trips");
}
