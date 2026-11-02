/**
 * Adres w kolejności, którą Google Maps rozumie jednoznacznie: „Wyzwolenia, Wilkowice, Polska”
 * zamiast „Wilkowice, ul. Wyzwolenia” (Google brał wtedy samą ulicę i szukał jej gdzie indziej).
 */
export function mapsAddress(address: string): string {
  const s = address.replace(/\s+/g, " ").trim();
  const m = s.match(/^([^,]+),\s*(.+)$/);
  if (!m) return `${s}, Polska`;
  const town = m[1].trim();
  const street = m[2].replace(/^(?:ul|al|os|pl)(?:\.+\s*|\s+)/i, "").trim();
  return `${street}, ${town}, Polska`;
}

/** Link do trasy samochodowej w Google Maps (na telefonie otwiera aplikację Mapy). */
export function googleMapsRoute(origin: string, destination: string): string {
  const p = new URLSearchParams({ api: "1", origin: mapsAddress(origin), destination: mapsAddress(destination), travelmode: "driving" });
  return `https://www.google.com/maps/dir/?${p.toString()}`;
}
