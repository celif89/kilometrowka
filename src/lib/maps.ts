/** Link do trasy samochodowej w Google Maps (na telefonie otwiera aplikację Mapy). */
export function googleMapsRoute(origin: string, destination: string): string {
  const p = new URLSearchParams({ api: "1", origin: origin.trim(), destination: destination.trim(), travelmode: "driving" });
  return `https://www.google.com/maps/dir/?${p.toString()}`;
}
