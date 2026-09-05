"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import NewsRadar from "@/components/NewsRadar";
import AIBriefing from "@/components/AIBriefing";
import StockSearch from "@/components/StockSearch";

type Transaction = {
  id: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  note: string | null;
  occurred_at: string;
};

type Budget = {
  id: string;
  category: string;
  monthly_limit: number;
};

const CATEGORIES = ["Food", "Transport", "Rent", "Subscriptions", "Fun", "Other"];
const CHART_COLORS = ["#C9A227", "#3E7A5F", "#7A8290", "#A8452F", "#8A7220", "#EDEAE2"];
const WARNING_THRESHOLD = 0.9; // flag a category once spend hits 90% of its budget

export default function DashboardClient({
  initialTransactions,
  initialBudgets,
  userEmail,
}: {
  initialTransactions: Transaction[];
  initialBudgets: Budget[];
  userEmail: string;
}) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [budgets, setBudgets] = useState(initialBudgets);
  const [budgetInputs, setBudgetInputs] = useState<Record<string, string>>({});
  const [savingBudget, setSavingBudget] = useState<string | null>(null);
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

  const categoryBreakdown = CATEGORIES.map((cat) => ({
    name: cat,
    value: transactions
      .filter((t) => t.type === "expense" && t.category === cat)
      .reduce((sum, t) => sum + Number(t.amount), 0),
  })).filter((c) => c.value > 0);

  // Budgets are monthly, so spend is scoped to the current calendar month —
  // a transaction from last month shouldn't count against this month's limit.
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const spentThisMonthByCategory = CATEGORIES.reduce<Record<string, number>>((acc, cat) => {
    acc[cat] = transactions
      .filter((t) => t.type === "expense" && t.category === cat && t.occurred_at.startsWith(currentMonthKey))
      .reduce((sum, t) => sum + Number(t.amount), 0);
    return acc;
  }, {});

  const budgetByCategory = budgets.reduce<Record<string, Budget>>((acc, b) => {
    acc[b.category] = b;
    return acc;
  }, {});

  const overOrNearBudget = CATEGORIES.filter((cat) => {
    const b = budgetByCategory[cat];
    if (!b || b.monthly_limit <= 0) return false;
    return spentThisMonthByCategory[cat] / b.monthly_limit >= WARNING_THRESHOLD;
  });

  async function handleDelete(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (!error) {
      setTransactions(transactions.filter((t) => t.id !== id));
    }
  }

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

  async function handleSaveBudget(cat: string) {
    const raw = budgetInputs[cat];
    const limit = Number(raw);
    if (!raw || Number.isNaN(limit) || limit <= 0) return;

    setSavingBudget(cat);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSavingBudget(null);
      return;
    }

    // Upsert on the (user_id, category) unique constraint already defined in
    // the schema — sets the limit if new, updates it if one already exists.
    const { data, error } = await supabase
      .from("budgets")
      .upsert(
        { user_id: user.id, category: cat, monthly_limit: limit },
        { onConflict: "user_id,category" }
      )
      .select()
      .single();

    setSavingBudget(null);
    if (!error && data) {
      setBudgets((prev) => [...prev.filter((b) => b.category !== cat), data]);
      setBudgetInputs((prev) => ({ ...prev, [cat]: "" }));
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
      <nav className="flex items-center justify-between px-6 md:px-12 py-5 border-b border-[color:var(--hairline)] gap-4">
        <a href="/" className="font-display text-xl shrink-0">Vantiq</a>
        <StockSearch />
        <div className="flex items-center gap-4 text-sm text-[color:var(--slate)] shrink-0">
          <span>{userEmail}</span>
          <button onClick={handleLogout} className="hover:text-paper transition-colors">
            Log out
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 md:px-12 py-10">
        {overOrNearBudget.length > 0 && (
          <div className="border border-[color:var(--loss)] bg-[color:var(--loss)]/10 rounded-sm px-5 py-3 mb-6 text-sm">
            <span className="text-[color:var(--loss)] font-medium">Budget alert: </span>
            <span>
              {overOrNearBudget
                .map((cat) => {
                  const b = budgetByCategory[cat];
                  const pct = Math.round((spentThisMonthByCategory[cat] / b.monthly_limit) * 100);
                  return `${cat} at ${pct}%`;
                })
                .join(", ")}{" "}
              of this month&apos;s limit.
            </span>
          </div>
        )}

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

        <AIBriefing />

        <NewsRadar />

        {categoryBreakdown.length > 0 && (
          <div className="border border-[color:var(--hairline)] rounded-sm p-6 mb-8">
            <h2 className="font-display text-lg mb-4">Where it went</h2>
            <div className="grid md:grid-cols-2 gap-6 items-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {categoryBreakdown.map((entry, i) => (
                      <Cell key={entry.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "var(--ink-raised)", border: "1px solid var(--hairline)", borderRadius: 4 }}
                    formatter={(value) => `₹${Number(value).toLocaleString("en-IN")}`}
                  />
                </PieChart>
              </ResponsiveContainer>
              <ul className="space-y-2 text-sm">
                {categoryBreakdown.map((c, i) => (
                  <li key={c.name} className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block"
                        style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                      {c.name}
                    </span>
                    <span className="text-[color:var(--slate)]">₹{c.value.toLocaleString("en-IN")}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="border border-[color:var(--hairline)] rounded-sm p-6 mb-8">
          <h2 className="font-display text-lg mb-4">Monthly budgets</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {CATEGORIES.map((cat) => {
              const b = budgetByCategory[cat];
              const spent = spentThisMonthByCategory[cat] ?? 0;
              const pct = b && b.monthly_limit > 0 ? Math.min(100, (spent / b.monthly_limit) * 100) : 0;
              const isOver = b ? spent > b.monthly_limit : false;
              const isNear = b && !isOver ? spent / b.monthly_limit >= WARNING_THRESHOLD : false;
              const barColor = isOver
                ? "var(--loss)"
                : isNear
                ? "var(--brass)"
                : "var(--gain)";

              return (
                <div key={cat} className="border border-[color:var(--hairline)] rounded-sm p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">{cat}</span>
                    {b ? (
                      <span className="text-xs text-[color:var(--slate)]">
                        ₹{spent.toLocaleString("en-IN")} / ₹{Number(b.monthly_limit).toLocaleString("en-IN")}
                      </span>
                    ) : (
                      <span className="text-xs text-[color:var(--slate)]">No limit set</span>
                    )}
                  </div>

                  {b && (
                    <div className="w-full h-1.5 bg-[color:var(--ink)] rounded-full overflow-hidden mb-3">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: barColor }}
                      />
                    </div>
                  )}

                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder={b ? "Update limit (₹)" : "Set limit (₹)"}
                      value={budgetInputs[cat] ?? ""}
                      onChange={(e) => setBudgetInputs((prev) => ({ ...prev, [cat]: e.target.value }))}
                      className="flex-1 bg-[color:var(--ink-raised)] border border-[color:var(--hairline)] rounded-sm px-2 py-1 text-sm focus:outline-none focus:border-[color:var(--brass)]"
                    />
                    <button
                      onClick={() => handleSaveBudget(cat)}
                      disabled={savingBudget === cat || !budgetInputs[cat]}
                      className="px-3 py-1 text-xs bg-[color:var(--brass)] text-[color:var(--ink)] rounded-sm hover:bg-[color:var(--brass-dim)] transition-colors disabled:opacity-50"
                    >
                      {savingBudget === cat ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              );
            })}
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
                  <li key={t.id} className="flex justify-between items-center border-b border-[color:var(--hairline)] pb-3 text-sm group">
                    <div>
                      <p>{t.category}{t.note ? ` — ${t.note}` : ""}</p>
                      <p className="text-[color:var(--slate)] text-xs">{t.occurred_at}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={t.type === "income" ? "text-[color:var(--gain)]" : "text-[color:var(--loss)]"}>
                        {t.type === "income" ? "+" : "-"}₹{Number(t.amount).toLocaleString("en-IN")}
                      </span>
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="opacity-0 group-hover:opacity-100 text-[color:var(--slate)] hover:text-[color:var(--loss)] transition-opacity text-xs"
                        aria-label="Delete transaction"
                      >
                        ✕
                      </button>
                    </div>
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
