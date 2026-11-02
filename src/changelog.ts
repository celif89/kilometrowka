// Historia wersji. Przy każdym wydaniu: podnieś "version" w package.json, dopisz wpis NA GÓRZE
// tej listy i ten sam wpis w CHANGELOG.md (test changelog.test.ts pilnuje zgodności).

export interface Release {
  version: string;
  date: string;
  title?: string;
  changes: { kind: "new" | "improved" | "fixed"; text: string }[];
}

export const APP_VERSION: string = __APP_VERSION__;

export const RELEASES: Release[] = [
  {
    version: "1.1.2",
    date: "2026-11-02",
    title: "Poprawki wydruku",
    changes: [
      { kind: "fixed", text: "Wydruk: dzień nie jest już dzielony między strony – każda strona kończy się pełnym dniem." },
      { kind: "fixed", text: "Wydruk: nagłówek „Nr kolejny wpisu” mieści się w pierwszej kolumnie." },
    ],
  },
  {
    version: "1.1.1",
    date: "2026-11-02",
    title: "Wydruk jak w arkuszu, poprawki Pulpitu",
    changes: [
      { kind: "improved", text: "Wydruk / PDF w układzie dotychczasowego arkusza: tytuł na każdej stronie, licznik wyjazd/przyjazd w dwóch liniach, linie między dniami, „Strona X z Y” i podpis podatnika. Dane firmy i pojazdu można dołączyć jednym kliknięciem." },
      { kind: "fixed", text: "Pasek dni na Pulpicie przewija się za wybraną datą – przy klikaniu strzałek dzień nie znika z widoku." },
      { kind: "fixed", text: "Na Pulpicie widać wszystkie stałe trasy naraz: najpierw te z miejsca, w którym stoi auto, potem pozostałe." },
    ],
  },
  {
    version: "1.1.0",
    date: "2026-11-01",
    title: "Przebieg z FV Meter, przypomnienie o zamknięciu miesiąca, osobne konta",
    changes: [
      { kind: "new", text: "Przebieg Tesli wpisywany w FV Meter pobiera się sam do kontroli licznika – nie trzeba go przepisywać (Ustawienia → Przebieg z FV Meter)." },
      { kind: "new", text: "Przypomnienie na Pulpicie od 1. dnia miesiąca: sprawdź, wydrukuj i zatwierdź poprzedni miesiąc. Przy „Ewidencji” w menu pojawia się kropka." },
      { kind: "new", text: "Każde konto ma własne dane – np. osobne konto dla żony z jej autem, bez dostępu do Twojej ewidencji i FV Meter." },
      { kind: "improved", text: "Import z Excela może od razu oznaczyć zakończone miesiące jako zatwierdzone (były już podpisane w arkuszu)." },
      { kind: "improved", text: "Przypomnienie dotyczy tylko poprzedniego miesiąca – bez ciągłych komunikatów o starszych miesiącach." },
    ],
  },
  {
    version: "1.0.0",
    date: "2026-10-31",
    title: "Pierwsza wersja – koniec z arkuszem",
    changes: [
      { kind: "new", text: "Ewidencja przebiegu pojazdu w przeglądarce i na telefonie: numeracja wpisów i stan licznika liczą się same." },
      { kind: "new", text: "Stałe trasy – dodanie przejazdu jednym kliknięciem; podpowiadane są trasy zaczynające się tam, gdzie auto stoi." },
      { kind: "new", text: "Szablony dnia – kilka tras naraz (np. dom → biuro → dom) oraz „Powtórz dzień”." },
      { kind: "new", text: "Propozycje nowych stałych tras na podstawie często powtarzanych przejazdów." },
      { kind: "new", text: "Podpowiedzi miejsc, celów i kilometrów z historii przejazdów." },
      { kind: "new", text: "Wydruk / PDF i eksport do Excela w układzie dotychczasowego arkusza, z miejscem na podpis." },
      { kind: "new", text: "Zatwierdzanie miesięcy – po podpisaniu wpisów nie da się przypadkiem zmienić." },
      { kind: "new", text: "Kontrola licznika: porównanie faktycznych odczytów ze stanem wg ewidencji." },
      { kind: "new", text: "Import całej dotychczasowej ewidencji z pliku Excel (z poprawą złego roku w datach)." },
      { kind: "new", text: "Kopia zapasowa danych do pliku i ekran „Co nowego” z numerem wersji." },
    ],
  },
];
