# Historia zmian

Numer wersji widać w aplikacji (menu → „Co nowego”). Format: `główna.funkcje.poprawki`.

## 1.1.0 – 2026-11-01 – Przebieg z FV Meter, przypomnienie o zamknięciu miesiąca, osobne konta

- **Nowe:** Przebieg Tesli wpisywany w FV Meter pobiera się sam do kontroli licznika – nie trzeba go przepisywać (Ustawienia → Przebieg z FV Meter).
- **Nowe:** Przypomnienie na Pulpicie od 1. dnia miesiąca: sprawdź, wydrukuj i zatwierdź poprzedni miesiąc. Przy „Ewidencji” w menu pojawia się kropka.
- **Nowe:** Każde konto ma własne dane – np. osobne konto dla żony z jej autem, bez dostępu do Twojej ewidencji i FV Meter.
- **Ulepszone:** Import z Excela może od razu oznaczyć zakończone miesiące jako zatwierdzone (były już podpisane w arkuszu).
- **Ulepszone:** Przypomnienie dotyczy tylko poprzedniego miesiąca – bez ciągłych komunikatów o starszych miesiącach.
- **Baza danych:** uruchom w Supabase plik `supabase/migrations/20261101000000_konta.sql` (INSTRUKCJA.md).

## 1.0.0 – 2026-10-31 – Pierwsza wersja – koniec z arkuszem

- **Nowe:** Ewidencja przebiegu pojazdu w przeglądarce i na telefonie: numeracja wpisów i stan licznika liczą się same.
- **Nowe:** Stałe trasy – dodanie przejazdu jednym kliknięciem; podpowiadane są trasy zaczynające się tam, gdzie auto stoi.
- **Nowe:** Szablony dnia – kilka tras naraz (np. dom → biuro → dom) oraz „Powtórz dzień”.
- **Nowe:** Propozycje nowych stałych tras na podstawie często powtarzanych przejazdów.
- **Nowe:** Podpowiedzi miejsc, celów i kilometrów z historii przejazdów.
- **Nowe:** Wydruk / PDF i eksport do Excela w układzie dotychczasowego arkusza, z miejscem na podpis.
- **Nowe:** Zatwierdzanie miesięcy – po podpisaniu wpisów nie da się przypadkiem zmienić.
- **Nowe:** Kontrola licznika: porównanie faktycznych odczytów ze stanem wg ewidencji.
- **Nowe:** Import całej dotychczasowej ewidencji z pliku Excel (z poprawą złego roku w datach).
- **Nowe:** Kopia zapasowa danych do pliku i ekran „Co nowego” z numerem wersji.
