"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Transaction = {
  id: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  note: string | null;
  occurred_at: string;
};

const CATEGORIES = ["Food", "Transport", "Rent", "Subscriptions", "Fun", "Other"];

export default function DashboardClient({
  initialTransactions,
  userEmail,
}: {
  initialTransactions: Transaction[];
  userEmail: string;
}) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const income = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const expense = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const balance = income - expense;

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!amount) return;
    setSubmitting(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        amount: Number(amount),
        type,
        category,
        note: note || null,
      })
      .select()
      .single();

    setSubmitting(false);
    if (!error && data) {
      setTransactions([data, ...transactions]);
      setAmount("");
      setNote("");
    }
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-full bg-[color:var(--ink)] text-[color:var(--paper)]">
      <nav className="flex items-center justify-between px-6 md:px-12 py-5 border-b border-[color:var(--hairline)]">
        <a href="/" className="font-display text-xl">Vantiq</a>
        <div className="flex items-center gap-4 text-sm text-[color:var(--slate)]">
          <span>{userEmail}</span>
          <button onClick={handleLogout} className="hover:text-paper transition-colors">
            Log out
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 md:px-12 py-10">
        <div className="grid md:grid-cols-3 gap-4 mb-10">
          <div className="border border-[color:var(--hairline)] rounded-sm p-5">
            <p className="text-sm text-[color:var(--slate)] mb-1">Balance</p>
            <p className="font-display text-2xl">₹{balance.toLocaleString("en-IN")}</p>
          </div>
          <div className="border border-[color:var(--hairline)] rounded-sm p-5">
            <p className="text-sm text-[color:var(--slate)] mb-1">Income</p>
            <p className="font-display text-2xl text-[color:var(--gain)]">₹{income.toLocaleString("en-IN")}</p>
          </div>
          <div className="border border-[color:var(--hairline)] rounded-sm p-5">
            <p className="text-sm text-[color:var(--slate)] mb-1">Spent</p>
            <p className="font-display text-2xl text-[color:var(--loss)]">₹{expense.toLocaleString("en-IN")}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-[1fr_1.5fr] gap-8">
          <form onSubmit={handleAdd} className="border border-[color:var(--hairline)] rounded-sm p-6 space-y-4 h-fit">
            <h2 className="font-display text-lg mb-2">Add a transaction</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType("expense")}
                className={`flex-1 py-2 text-sm rounded-sm border ${
                  type === "expense"
                    ? "border-[color:var(--loss)] text-[color:var(--loss)]"
                    : "border-[color:var(--hairline)] text-[color:var(--slate)]"
                }`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setType("income")}
                className={`flex-1 py-2 text-sm rounded-sm border ${
                  type === "income"
                    ? "border-[color:var(--gain)] text-[color:var(--gain)]"
                    : "border-[color:var(--hairline)] text-[color:var(--slate)]"
                }`}
              >
                Income
              </button>
            </div>
            <div>
              <label className="block text-sm text-[color:var(--slate)] mb-1">Amount (₹)</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-[color:var(--ink-raised)] border border-[color:var(--hairline)] rounded-sm px-3 py-2 focus:outline-none focus:border-[color:var(--brass)]"
              />
            </div>
            <div>
              <label className="block text-sm text-[color:var(--slate)] mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[color:var(--ink-raised)] border border-[color:var(--hairline)] rounded-sm px-3 py-2 focus:outline-none focus:border-[color:var(--brass)]"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-[color:var(--slate)] mb-1">Note (optional)</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full bg-[color:var(--ink-raised)] border border-[color:var(--hairline)] rounded-sm px-3 py-2 focus:outline-none focus:border-[color:var(--brass)]"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2 bg-[color:var(--brass)] text-[color:var(--ink)] font-medium rounded-sm hover:bg-[color:var(--brass-dim)] transition-colors disabled:opacity-50"
            >
              {submitting ? "Adding..." : "Add"}
            </button>
          </form>

          <div className="border border-[color:var(--hairline)] rounded-sm p-6">
            <h2 className="font-display text-lg mb-4">Recent transactions</h2>
            {transactions.length === 0 ? (
              <p className="text-sm text-[color:var(--slate)]">
                No transactions yet. Add your first one to see it here.
              </p>
            ) : (
              <ul className="space-y-3">
                {transactions.map((t) => (
                  <li key={t.id} className="flex justify-between items-center border-b border-[color:var(--hairline)] pb-3 text-sm">
                    <div>
                      <p>{t.category}{t.note ? ` — ${t.note}` : ""}</p>
                      <p className="text-[color:var(--slate)] text-xs">{t.occurred_at}</p>
                    </div>
                    <span className={t.type === "income" ? "text-[color:var(--gain)]" : "text-[color:var(--loss)]"}>
                      {t.type === "income" ? "+" : "-"}₹{Number(t.amount).toLocaleString("en-IN")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
