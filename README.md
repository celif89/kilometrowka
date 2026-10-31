# Kilometrówka 🚗

Ewidencja przebiegu pojazdu (art. 86a ust. 7 ustawy o VAT) w przeglądarce i na telefonie.
Zastępuje arkusz `Ewidencja_pojazdu.xlsx` i działa tak jak FV Meter: React + Supabase + Netlify.

> **Uruchomienie krok po kroku: [INSTRUKCJA.md](INSTRUKCJA.md)** (ok. 10 minut, jeśli masz już FV Meter).
> Historia wersji: [CHANGELOG.md](CHANGELOG.md), w aplikacji: menu → „Co nowego”.

## Co robi zamiast arkusza

| W arkuszu | W aplikacji |
|---|---|
| numer wpisu i stan licznika liczone formułami (łatwo o złe odwołanie) | liczą się same z sumy kilometrów, zawsze ciągle |
| lista tras w kolumnach S–W + `WYSZUKAJ.PIONOWO` po numerze | **stałe trasy** – jedno kliknięcie dodaje przejazd; najpierw podpowiadane są trasy z miejsca, w którym auto stoi |
| kopiowanie wierszy dzień po dniu | **szablony dnia** (np. dom → biuro → dom) i **„Powtórz dzień”** |
| — | **propozycje stałych tras** z przejazdów, które się powtarzają |
| — | podpowiedzi miejsc, celów i kilometrów z historii |
| odczyty licznika wpisywane z boku (K–L) | **kontrola licznika**: faktyczny odczyt vs. ewidencja, z różnicą |
| drukowanie arkusza | **wydruk / PDF** każdego miesiąca w tym samym układzie, z miejscem na podpis, oraz **eksport do Excela** |
| — | **zatwierdzanie miesięcy** – po podpisaniu nie da się przypadkiem zmienić wpisów |
| — | **kopia zapasowa** całych danych do pliku |

## Import z Excela

Ustawienia → „Wczytanie ewidencji z Excela”. Wczytują się: dane firmy (A1–A5), pojazd (E1–E4),
wszystkie przejazdy, stałe trasy (S–W) i liczby z kolumn K–L jako odczyty licznika.
Przy imporcie aplikacja pokazuje, co poprawiła albo zauważyła w arkuszu, np.:

* 62 wpisy z czerwca 2026 miały w dacie rok 2025 – poprawione na 2026,
* wiersz 115 ma trasę z przecinkiem zamiast myślnika – rozpoznana poprawnie,
* wiersz 686 (pierwszy wpis marca 2026) ma formułę `=G675` zamiast `=G676`, więc od marca
  arkusz pokazuje licznik o 11 km niższy niż suma kilometrów. Aplikacja liczy ciągle,
  dlatego jej stany licznika są od marca o 11 km wyższe niż w Excelu.

## Rozwój

```bash
npm install
cp .env.example .env.local   # adres i klucz Supabase
npm run dev
npm test                     # testy logiki, importu, eksportu i zgodności wersji
```

Test na prawdziwym arkuszu (plik nie trafia do repozytorium):

```bash
REAL_XLSX=/ścieżka/Ewidencja_pojazdu.xlsx npm test
```

### Wydania

Każde wydanie ma numer wersji i listę zmian: `version` w `package.json`, wpis na górze
`src/changelog.ts` i ten sam wpis w `CHANGELOG.md`. Test `tests/changelog.test.ts` pilnuje,
żeby te trzy miejsca się zgadzały.

## Struktura

```
src/engine/        logika: numeracja, licznik, podsumowania, podpowiedzi tras
src/lib/           Supabase, import z Excela, zapis .xlsx, formatowanie
src/pages/         ekrany: Pulpit, Ewidencja, Trasy, Raporty, Ustawienia, Druk, Co nowego
src/changelog.ts   historia wersji (ekran „Co nowego”)
supabase/          schemat bazy (tabele km_*, RLS)
tests/             testy (vitest) + syntetyczny arkusz do testów importu
```
