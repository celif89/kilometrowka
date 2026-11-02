import { describe, expect, it } from "vitest";
import { buildLedger, continuityGaps, placeFold, samePlace } from "../src/engine/ledger";
import { kmForPair, knownPlaces } from "../src/engine/suggest";
import type { Trip, Vehicle } from "../src/engine/types";
import { googleMapsRoute, mapsAddress } from "../src/lib/maps";

const vehicle: Vehicle = { id: 1, name: "A", plate: "B", start_date: "2026-11-01", start_odometer: 0, end_date: null, default_driver: null, active: true };
let id = 0;
const trip = (origin: string, destination: string, km = 10): Trip => ({
  id: ++id, vehicle_id: 1, day: "2026-11-02", seq: id, purpose: "C", origin, destination, km, driver: "J", route_id: null, note: null,
});

describe("porównywanie miejsc", () => {
  it("literówki w polskich znakach, kropkach i wielkości liter to to samo miejsce", () => {
    expect(samePlace("Gród, ul. Młyńska", "Grod, ul. Mlyńska")).toBe(true);
    expect(samePlace("Gród, ul. Młyńska", "gród ul młyńska")).toBe(true);
    expect(samePlace("Wieś Śl., al.. Młodych", "Wieś Śl, al. Młodych")).toBe(true);
    expect(samePlace("Gród, ul. Młyńska", "Gród, ul. Młyńska 2")).toBe(false);
    expect(placeFold("Żory, ul. Bałdyka")).toBe("zory ul baldyka");
  });

  it("brak ostrzeżenia o przerwie, gdy adres różni się tylko literówką", () => {
    const l = buildLedger(vehicle, [trip("Dom", "Gród, ul. Młyńska"), trip("Gród, ul. Mlyńska", "Urząd")]);
    expect(continuityGaps(l).size).toBe(0);
  });

  it("podpowiedzi łączą warianty adresu i zostawiają najczęstszą pisownię", () => {
    const trips = [trip("Dom", "Gród, ul. Młyńska", 11), trip("Dom", "Gród, ul. Młyńska", 11), trip("Gród, ul. Mlyńska", "Dom", 11)];
    const places = knownPlaces(trips, []);
    expect(places.filter((p) => samePlace(p, "Gród, ul. Młyńska"))).toEqual(["Gród, ul. Młyńska"]);
    expect(kmForPair(trips, [], "dom", "Grod ul Mlynska")).toBe(11);
  });
});

describe("Google Maps", () => {
  it("adres w kolejności ulica, miejscowość, kraj", () => {
    expect(mapsAddress("Wilkowice, ul. Wyzwolenia")).toBe("Wyzwolenia, Wilkowice, Polska");
    expect(mapsAddress("Wilkowice, ul. Wyzwolenia 25")).toBe("Wyzwolenia 25, Wilkowice, Polska");
    expect(mapsAddress("Siemianowice Śl., al.. Młodych")).toBe("Młodych, Siemianowice Śl., Polska");
    expect(mapsAddress("Świerklany, ul. Plebiscytowa")).toBe("Plebiscytowa, Świerklany, Polska");
    expect(mapsAddress("Gród, Plac Wolności 1")).toBe("Plac Wolności 1, Gród, Polska");
    expect(mapsAddress("Urząd Gminy Wilkowice")).toBe("Urząd Gminy Wilkowice, Polska");
  });

  it("link do trasy samochodowej", () => {
    const url = new URL(googleMapsRoute("Gród, ul. Krzywa", "Wilkowice, ul. Wyzwolenia"));
    expect(url.searchParams.get("origin")).toBe("Krzywa, Gród, Polska");
    expect(url.searchParams.get("destination")).toBe("Wyzwolenia, Wilkowice, Polska");
    expect(url.searchParams.get("travelmode")).toBe("driving");
  });
});
