"""Tworzy syntetyczny arkusz w układzie „Ewidencja_pojazdu.xlsx” (dane fikcyjne) do testów importu.

Uruchomienie: python3 tests/fixtures/make_fixture.py
"""
from datetime import datetime
from pathlib import Path

import openpyxl

wb = openpyxl.Workbook()
ws = wb.active
ws.title = "2025 Auto"
ws["A1"] = "Firma Testowa Jan Kowalski"
ws["A2"] = "00-001 Miasteczko"
ws["A3"] = "ul. Prosta 1"
ws["A4"] = "NIP: 123 456 78 90"
ws["A5"] = "REGON: 123456789"
ws["E1"] = "Pojazd rejestrowany: Auto X"
ws["E2"] = "Numer rejestracyjny pojazdu rejestrowanego: AB 12345"
ws["E3"] = "Dzień rozpoczęcia prowadzenie ewidencji: 30.11.2025"
ws["E4"] = "Stan licznika przebiegu pojazdu na dzień rozpoczęcia prowadzenia ewidencji: 100"

HOME, OFFICE, SITE = "Miasteczko, ul. Prosta", "Gród, ul. Krzywa", "Gród, ul. M. Skłodowskiej-Curie"


def block(row, title, trips):
    ws.cell(row, 1, title)
    ws.cell(row + 1, 1, "Stan licznika na początek miesiąca")
    hdr = ["Nr kolejny wpisu", "Data wyjazdu", "Cel wyjazdu", "Opis trasy wyjazdu (skąd - dokąd)", None,
           "Liczba faktycznie przejechanych kilometów", "Stan licznika  (wyjazd/przyjazd)",
           "Imię i nazwisko osoby kierującej pojazdem"]
    for c, v in enumerate(hdr, 1):
        if v:
            ws.cell(row + 3, c, v)
    r = row + 4
    for n, (d, purpose, route, km, split) in enumerate(trips, 1):
        ws.cell(r, 1, n)
        ws.cell(r, 2, d)
        ws.cell(r, 3, purpose)
        if split:
            a, b = route.split(" - ")
            ws.cell(r, 4, a + " - ")
            ws.cell(r + 1, 4, b)
        else:
            ws.cell(r, 4, route)
            ws.merge_cells(start_row=r, start_column=4, end_row=r + 1, end_column=5)
        ws.cell(r, 6, km)
        ws.cell(r, 8, "Jan Kowalski")
        r += 2
    return r


r = block(7, "Ewidencja za miesiąc grudzień, roku 2025", [
    (datetime(2025, 12, 1), "Wyjazd do biura", f"{HOME} - {OFFICE}", 12, False),
    (datetime(2025, 12, 1), "Wyjazd na budowę", f"{OFFICE} - {SITE}", 7.5, True),
    (datetime(2025, 12, 1), "Powrót do domu", f"{SITE} - {HOME}  ", 15, False),
])
ws.cell(r - 1, 12, 140)  # odczyt licznika w kolumnie L
block(r + 3, "Ewidencja za miesiąc styczeń, roku 2026", [
    (datetime(2025, 1, 2), "Wyjazd do biura", f"{HOME} - {OFFICE}", 12, False),  # zły rok
    (datetime(2026, 1, 2), "Powrót do domu", f"{OFFICE} - {HOME}", 12, False),
    (datetime(2026, 1, 3), "Wyjazd do biura", "", 12, False),  # niepełny
])
for i, (name, purpose, route, km) in enumerate([
    ("Dom-Praca", "Wyjazd do biura", f"{HOME} - {OFFICE}", 12),
    ("Praca-Dom", "Powrót do domu", f"{OFFICE} - {HOME} ", 12),
], 1):
    ws.cell(10 + 2 * i, 19, i)
    ws.cell(10 + 2 * i, 20, name)
    ws.cell(10 + 2 * i, 21, purpose)
    ws.cell(10 + 2 * i, 22, route)
    ws.cell(10 + 2 * i, 23, km)

wb.save(Path(__file__).with_name("ewidencja_syntetyczna.xlsx"))
