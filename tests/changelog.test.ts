import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { APP_VERSION, RELEASES } from "../src/changelog";

describe("wersja i lista zmian", () => {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf-8")) as { version: string };
  const md = readFileSync(new URL("../CHANGELOG.md", import.meta.url), "utf-8");

  it("najnowszy wpis w changelog.ts = wersja z package.json", () => {
    expect(APP_VERSION).toBe(pkg.version);
    expect(RELEASES[0].version).toBe(pkg.version);
  });

  it("każda wersja ma wpis w CHANGELOG.md, z datą i listą zmian", () => {
    for (const r of RELEASES) {
      expect(md).toContain(`## ${r.version} – ${r.date}`);
      expect(r.changes.length).toBeGreaterThan(0);
    }
  });

  it("wersje są unikalne i malejące", () => {
    const key = (v: string) => v.split(".").map(Number).reduce((a, x) => a * 1000 + x, 0);
    const keys = RELEASES.map((r) => key(r.version));
    expect([...keys].sort((a, b) => b - a)).toEqual(keys);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
