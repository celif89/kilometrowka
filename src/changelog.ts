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
