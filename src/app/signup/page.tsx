"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="min-h-full flex items-center justify-center bg-[color:var(--ink)] text-[color:var(--paper)] px-6">
        <div className="w-full max-w-sm text-center">
          <h1 className="font-display text-2xl mb-3">Check your email</h1>
          <p className="text-[color:var(--slate)]">
            We&apos;ve sent a confirmation link to {email}. Click it to activate your account.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full flex items-center justify-center bg-[color:var(--ink)] text-[color:var(--paper)] px-6">
      <div className="w-full max-w-sm">
        <a href="/" className="font-display text-xl block mb-8">Vantiq</a>
        <h1 className="font-display text-2xl mb-6">Create your account</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-[color:var(--slate)] mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[color:var(--ink-raised)] border border-[color:var(--hairline)] rounded-sm px-3 py-2 text-[color:var(--paper)] focus:outline-none focus:border-[color:var(--brass)]"
            />
          </div>
          <div>
            <label className="block text-sm text-[color:var(--slate)] mb-1">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[color:var(--ink-raised)] border border-[color:var(--hairline)] rounded-sm px-3 py-2 text-[color:var(--paper)] focus:outline-none focus:border-[color:var(--brass)]"
            />
          </div>
          {error && <p className="text-sm text-[color:var(--loss)]">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-[color:var(--brass)] text-[color:var(--ink)] font-medium rounded-sm hover:bg-[color:var(--brass-dim)] transition-colors disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Sign up"}
          </button>
        </form>
        <p className="text-sm text-[color:var(--slate)] mt-6">
          Already have an account?{" "}
          <a href="/login" className="text-[color:var(--brass)] hover:underline">
            Log in
          </a>
        </p>
      </div>
    </div>
  );
}
