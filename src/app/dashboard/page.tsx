import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: transactions } = await supabase
    .from("transactions")
    .select("*")
    .order("occurred_at", { ascending: false });

  const { data: budgets } = await supabase
    .from("budgets")
    .select("*")
    .order("category", { ascending: true });

  return (
    <DashboardClient
      initialTransactions={transactions ?? []}
      initialBudgets={budgets ?? []}
      userEmail={user.email ?? ""}
    />
  );
}
