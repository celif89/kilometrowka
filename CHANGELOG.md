# Historia zmian

Numer wersji widać w aplikacji (menu → „Co nowego”). Format: `główna.funkcje.poprawki`.

## 1.3.0 – 2026-11-11 – Kopiowanie dnia na inne dni

- **Nowe:** Kopiowanie dnia: przycisk „Kopiuj” przy każdym dniu w Ewidencji (i „Kopiuj na inne dni” na Pulpicie) kopiuje przejazdy na wybrane dni – można zaznaczyć kilka dni w kalendarzu i wybrać, które przejazdy skopiować.
- **Ulepszone:** Kopie dopisują się na koniec dni, które mają już przejazdy (kalendarz je oznacza); dni w zatwierdzonych miesiącach są zablokowane, a całość można cofnąć jednym kliknięciem.

## 1.2.1 – 2026-11-02 – Literówki w adresach, nazwy miejsc w formularzu, Google Maps

- **Poprawione:** Adresy różniące się tylko polskimi znakami, kropkami lub wielkością liter (np. „Mlyńska” i „Młyńska”) są traktowane jako to samo miejsce – znika fałszywe ostrzeżenie „poprzedni przejazd skończył się w…”, działa nazwa miejsca i podpowiedź km.
- **Poprawione:** Google Maps: adres przekazywany jako „ulica, miejscowość, Polska” – np. „Wilkowice, ul. Wyzwolenia” nie prowadzi już do innej ulicy Wyzwolenia.
- **Ulepszone:** W polach „Skąd” i „Dokąd” można wpisać nazwę miejsca (np. „Praca”) – wstawia się pełny adres. Podpowiedzi pokazują nazwę i adres.
- **Ulepszone:** Podpowiedzi miejsc łączą warianty tego samego adresu, a wpisany adres z literówką jest zamieniany na znaną pisownię.

## 1.2.0 – 2026-11-02 – Excel jak wydruk, wybór czcionki, Google Maps

- **Nowe:** Eksport do Excela w układzie wydruku: przejazd w dwóch wierszach z licznikiem wyjazd/przyjazd, linie między dniami, tytuł w nagłówku i „Strona X z Y” w stopce, podział stron tylko między dniami.
- **Nowe:** Wybór czcionki wydruku i eksportu: Calibri, Arial, Arial Narrow, Times New Roman, Tahoma (zapamiętywany w ustawieniach konta).
- **Nowe:** Przy wpisywaniu przejazdu i stałej trasy: przycisk „Sprawdź km w Google Maps” otwiera trasę skąd → dokąd (na telefonie w aplikacji Mapy).
- **Ulepszone:** Na stronie wydruku można od razu pobrać Excel z tymi samymi ustawieniami.

## 1.1.2 – 2026-11-02 – Poprawki wydruku

- **Poprawione:** Wydruk: dzień nie jest już dzielony między strony – każda strona kończy się pełnym dniem.
- **Poprawione:** Wydruk: nagłówek „Nr kolejny wpisu” mieści się w pierwszej kolumnie.

## 1.1.1 – 2026-11-02 – Wydruk jak w arkuszu, poprawki Pulpitu

- **Ulepszone:** Wydruk / PDF w układzie dotychczasowego arkusza: tytuł na każdej stronie, licznik wyjazd/przyjazd w dwóch liniach, linie między dniami, „Strona X z Y” i podpis podatnika. Dane firmy i pojazdu można dołączyć jednym kliknięciem.
- **Poprawione:** Pasek dni na Pulpicie przewija się za wybraną datą – przy klikaniu strzałek dzień nie znika z widoku.
- **Poprawione:** Na Pulpicie widać wszystkie stałe trasy naraz: najpierw te z miejsca, w którym stoi auto, potem pozostałe.

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
