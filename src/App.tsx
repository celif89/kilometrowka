import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Notice, Spinner, ToastProvider } from "./components/ui";
import { DataProvider, useData } from "./lib/DataContext";
import { configured, supabase } from "./lib/supabase";
import { ChangelogPage } from "./pages/Changelog";
import { Dashboard } from "./pages/Dashboard";
import { LedgerPage } from "./pages/Ledger";
import { Login } from "./pages/Login";
import { PrintPage } from "./pages/Print";
import { ReportsPage } from "./pages/Reports";
import { RoutesPage } from "./pages/Routes";
import { SettingsPage } from "./pages/Settings";

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-dvh items-center justify-center p-6"><div className="max-w-md">{children}</div></div>;
}

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function Shell() {
  const { loading, error, data } = useData();
  if (!data && loading) return <Centered><Spinner label="Wczytywanie danych…" /></Centered>;
  if (!data && error) {
    const hint = /km_|relation|schema cache/i.test(error)
      ? " – wygląda na to, że w Supabase nie ma jeszcze tabel. Uruchom plik supabase/migrations/…_init.sql w SQL Editor (INSTRUKCJA.md, krok 1)."
      : "";
    return <Centered><Notice tone="error">Nie udało się wczytać danych: {error}{hint}</Notice></Centered>;
  }
  return (
    <Routes>
      <Route path="/druk/:vehicleId/:from/:to" element={<PrintPage />} />
      <Route path="*" element={
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/ewidencja" element={<LedgerPage />} />
            <Route path="/ewidencja/:month" element={<LedgerPage />} />
            <Route path="/trasy" element={<RoutesPage />} />
            <Route path="/raporty" element={<ReportsPage />} />
            <Route path="/ustawienia" element={<SettingsPage />} />
            <Route path="/co-nowego" element={<ChangelogPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      } />
    </Routes>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [owner, setOwner] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setOwner(null); return; }
    // pierwsze konto zostaje właścicielem danych; kolejne nie mają dostępu
    supabase.rpc("km_claim_ownership").then(({ data, error }) => setOwner(!error && data === true));
  }, [session?.user.id]);

  if (!configured) {
    return (
      <Centered>
        <Notice tone="warn">
          Brak konfiguracji Supabase. Ustaw zmienne <b>VITE_SUPABASE_URL</b> i <b>VITE_SUPABASE_ANON_KEY</b>
          {" "}(Netlify → Site configuration → Environment variables) i wdróż stronę ponownie.
        </Notice>
      </Centered>
    );
  }
  if (session === undefined) return <Centered><Spinner /></Centered>;
  if (!session) return <Login />;
  if (owner === null) return <Centered><Spinner label="Sprawdzanie dostępu…" /></Centered>;
  if (!owner) {
    return (
      <Centered>
        <Notice tone="error">
          To konto nie ma dostępu do danych (albo w Supabase brakuje funkcji km_claim_ownership – uruchom plik z tabelami).{" "}
          <button className="underline" onClick={() => supabase.auth.signOut()}>Wyloguj</button>
        </Notice>
      </Centered>
    );
  }
  return (
    <BrowserRouter>
      <ToastProvider>
        <DataProvider>
          <ScrollTop />
          <Shell />
        </DataProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
