# Kilometrówka – zasady dla zmian

- Aplikacja: React 19 + Vite + Tailwind 4, dane w Supabase (tabele `km_*`), hosting Netlify. Teksty w UI po polsku.
- Przed commitem: `npm run typecheck && npm test && npm run build`.
- **Każde wydanie ma numer wersji i listę zmian** (prośba właściciela):
  1. podnieś `version` w `package.json` (poprawki → 1.0.1, nowe funkcje → 1.1.0),
  2. dopisz wpis na górze `RELEASES` w `src/changelog.ts`,
  3. ten sam wpis w `CHANGELOG.md`.
  Test `tests/changelog.test.ts` sprawdza, że te trzy miejsca się zgadzają.
- **Wypychaj zmiany większymi paczkami** (prośba właściciela): drobne poprawki zbieraj lokalnie
  i wypychaj razem jako jedno wydanie z jednym numerem wersji i jednym wpisem w historii zmian –
  nie każdą poprawkę osobno. Wyjątek: pilny błąd, który blokuje korzystanie z aplikacji.
- Zmiany schematu bazy: nowy plik w `supabase/migrations/` (nie edytuj już wgranych) i krok w INSTRUKCJA.md.
- Nie commituj prawdziwego arkusza z danymi (`*.xlsx` jest w .gitignore; wyjątek: `tests/fixtures`).
