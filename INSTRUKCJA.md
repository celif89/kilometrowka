# Kilometrówka online – instrukcja uruchomienia

Aplikacja korzysta z tych samych darmowych usług co FV Meter:

| Usługa | Co robi |
|---|---|
| **Supabase** | przechowuje dane i pilnuje logowania – **możesz użyć projektu FV Meter** |
| **Netlify** | wyświetla aplikację pod Twoim adresem (np. `kilometrowka.netlify.app`) |

Najprościej użyć **tego samego projektu Supabase co FV Meter**: tabele Kilometrówki mają
przedrostek `km_`, więc niczego nie nadpiszą, zalogujesz się tym samym e-mailem i hasłem,
a codzienna synchronizacja FV Meter nie pozwoli darmowemu projektowi zasnąć.

---

## Krok 1: Tabele w Supabase

1. Wejdź na **https://supabase.com** i otwórz projekt **fv-meter**.
2. W menu po lewej kliknij **SQL Editor** → **New query**.
3. Otwórz w nowej karcie pierwszy plik:
   https://github.com/celif89/kilometrowka/blob/claude/charming-hopper-c5ayhl/supabase/migrations/20261031000000_init.sql
   i kliknij ikonę **Copy raw file** (dwa kwadraciki nad treścią pliku, po prawej).
4. Wróć do Supabase, wklej treść i kliknij **Run**. Na dole powinno pojawić się
   **„Success. No rows returned”**.
5. Kliknij **New query** jeszcze raz i tak samo uruchom drugi plik:
   https://github.com/celif89/kilometrowka/blob/claude/charming-hopper-c5ayhl/supabase/migrations/20261101000000_konta.sql

> **Masz już wersję 1.0.0?** Uruchom tylko drugi plik (punkt 5). Twoje dane zostaną przypisane
> do Twojego konta.

## Krok 2: Strona na Netlify

1. Wejdź na **https://app.netlify.com** → **Add new project** → **Import an existing project** → **GitHub**.
2. Wybierz repozytorium **celif89/kilometrowka** (jeśli go nie widzisz: „Configure the Netlify app
   on GitHub” i daj dostęp do tego repozytorium).
3. Ustawienia budowania wczytają się same z pliku `netlify.toml`.
   Jako gałąź (*Branch to deploy*) wybierz `claude/charming-hopper-c5ayhl`.
4. **Add environment variables** – dodaj te same dwie zmienne co w FV Meter
   (podejrzysz je w Netlify: strona FV Meter → **Site configuration → Environment variables**):

   | Key | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | adres projektu Supabase, np. `https://abcdefgh.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | klucz **publishable** / **anon** |

5. Kliknij **Deploy**. Po ok. minucie strona będzie gotowa. Jeśli zmienne dodajesz po pierwszym
   wdrożeniu: **Deploys → Trigger deploy → Deploy site**.
6. (opcjonalnie) **Site configuration → Change site name**, np. `kilometrowka-apc`.

## Krok 3: Przeniesienie danych z Excela

1. Otwórz stronę i zaloguj się tym samym e-mailem i hasłem co w FV Meter.
2. Na Pulpicie kliknij **Wczytaj arkusz Excel** (albo **Ustawienia → Wczytanie ewidencji z Excela**).
3. Wskaż plik **`Ewidencja_pojazdu.xlsx`**. Pojawi się podsumowanie: liczba przejazdów, miesiące,
   stałe trasy, odczyty licznika i uwagi do arkusza. Kliknij **Przenieś dane**.
4. Sprawdź:
   - **Trasy → Nazwy miejsc** – nadaj krótkie nazwy (np. „Dom”, „Biuro”, „Budowa Kowalski”),
     wtedy trasy czyta się dużo szybciej,
   - **Ustawienia → Dane firmy** – czy nagłówek wydruku jest dobry,
   - **Raporty → Kontrola licznika** – porównanie odczytów (także z FV Meter) z ewidencją.

   Przy imporcie możesz od razu oznaczyć zakończone miesiące jako zatwierdzone (były już
   podpisane w Excelu) – wtedy przypomnienie dotyczy dopiero bieżącego miesiąca.

Plik jest odczytywany w przeglądarce. Do bazy trafiają tylko dane, nie sam plik.

## Przebieg z FV Meter

Jeśli Kilometrówka korzysta z tego samego projektu Supabase co FV Meter, przebieg wpisywany
w FV Meter (zakładka **Samochód**) sam trafia do **Raportów → Kontrola licznika**.
W **Ustawieniach → Przebieg z FV Meter** wybierasz, którego auta dotyczy (domyślnie pierwszego).

## Konto dla drugiej osoby (np. żony)

Każde konto ma własne, oddzielne dane – pojazdy, przejazdy, trasy i dane firmy.

1. Supabase → **Authentication** → **Users** → **Add user** → **Create new user**.
2. Wpisz e-mail i hasło, zaznacz **Auto Confirm User**, kliknij **Create user**.
3. Ta osoba otwiera ten sam adres aplikacji i loguje się swoim e-mailem i hasłem.
   Na Pulpicie kliknie **Dodaj pojazd** (albo wczyta swój arkusz Excel) i uzupełni dane firmy w Ustawieniach.

Nowe konto nie widzi Twojej ewidencji ani danych FV Meter (FV Meter dalej ma jednego właściciela).

## Na co dzień

- **Pulpit**: wybierz dzień (domyślnie dziś) i klikaj stałe trasy po kolei – aplikacja podpowiada te,
  które zaczynają się tam, gdzie auto aktualnie stoi. Pomyłkę cofniesz przyciskiem **Cofnij**.
- **Szablony dnia** (zakładka Trasy): np. „Dzień w biurze” = dom → biuro → dom, dodawane jednym kliknięciem.
- **Początek miesiąca**: na Pulpicie pojawia się przypomnienie o poprzednim miesiącu –
  sprawdź wpisy → **Wydrukuj i podpisz** → **Zatwierdź miesiąc**. Znika po zatwierdzeniu.
- Co jakiś czas wpisz faktyczny stan licznika w **Raportach** – zobaczysz, czy ewidencja się zgadza.
- **Telefon**: otwórz adres w przeglądarce i wybierz „Dodaj do ekranu głównego”.
- **Kopia zapasowa**: Ustawienia → Pobierz kopię.

## Aktualizacje

Każda nowa wersja ma numer i opis zmian – w aplikacji: **Co nowego** (przy nowej wersji
numer w menu podświetla się na fioletowo).
