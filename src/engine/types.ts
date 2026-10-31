// Typy danych zapisywanych w bazie (tabele km_*).

export interface Vehicle {
  id: number;
  name: string;
  plate: string;
  start_date: string;
  start_odometer: number;
  end_date: string | null;
  default_driver: string | null;
  active: boolean;
}

export interface Route {
  id: number;
  name: string | null;
  purpose: string;
  origin: string;
  destination: string;
  km: number;
  color: string | null;
  position: number;
  archived: boolean;
}

export interface Template {
  id: number;
  name: string;
  route_ids: number[];
  position: number;
}

export interface Trip {
  id: number;
  vehicle_id: number;
  day: string;
  seq: number;
  purpose: string;
  origin: string;
  destination: string;
  km: number;
  driver: string;
  route_id: number | null;
  note: string | null;
}

export type NewTrip = Omit<Trip, "id">;

export interface OdometerReading {
  id: number;
  vehicle_id: number;
  day: string;
  km: number;
  note: string | null;
}

export interface MonthClose {
  vehicle_id: number;
  month: string;
  closed_at: string;
}

export interface Company {
  name: string;
  address1: string;
  address2: string;
  nip: string;
  regon: string;
  signatory: string;
}
