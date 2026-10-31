import { useState } from "react";
import { Logo } from "../components/Layout";
import { Notice } from "../components/ui";
import { APP_VERSION } from "../changelog";
import { supabase } from "../lib/supabase";

const MESSAGES: Record<string, string> = {
  "Invalid login credentials": "Nieprawidłowy e-mail lub hasło",
  "Email not confirmed":
    "Konto nie jest potwierdzone. W Supabase: Authentication → Users → Twoje konto → „Confirm email” (albo utwórz je ponownie z zaznaczonym „Auto Confirm User”).",
  "Invalid path specified in request URL":
    "Zły adres Supabase w Netlify (VITE_SUPABASE_URL) – powinien wyglądać jak https://xxxx.supabase.co",
  "Invalid API key": "Zły klucz Supabase w Netlify (VITE_SUPABASE_ANON_KEY) – użyj klucza publishable / anon",
};

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(MESSAGES[error.message] ?? error.message);
    setBusy(false);
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute -top-40 -left-32 size-[32rem] rounded-full bg-brand-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 -bottom-40 size-[28rem] rounded-full bg-road-500/20 blur-3xl" />
      <form onSubmit={submit} className="card relative w-full max-w-sm animate-pop p-8">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo compact />
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Kilometrówka</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Zaloguj się, aby prowadzić ewidencję</p>
        </div>
        <div className="space-y-4">
          <label className="block">
            <span className="label">E-mail</span>
            <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="block">
            <span className="label">Hasło</span>
            <input className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error && <Notice tone="error">{error}</Notice>}
          <button className="btn btn-primary w-full py-3" disabled={busy}>{busy ? "Logowanie…" : "Zaloguj się"}</button>
          <p className="text-center font-mono text-[11px] text-slate-400">v{APP_VERSION}</p>
        </div>
      </form>
    </div>
  );
}
