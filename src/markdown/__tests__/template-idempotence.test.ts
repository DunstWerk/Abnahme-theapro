import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseAgenda } from "../parseAgenda";
import { serializeAgenda } from "../serializeAgenda";

const templatePath = fileURLToPath(new URL("../../templates/vorlage-standard.md", import.meta.url));

describe("Vorlage vorlage-standard.md", () => {
  it("ist ein sauberes, unbenutztes Template und round-tripped byteidentisch", () => {
    const raw = readFileSync(templatePath, "utf-8");
    const doc = parseAgenda(raw);
    expect(doc.warnings.filter((w) => w.severity === "warn")).toEqual([]);

    const exportedMatch = /^exported:\s*(.+)$/m.exec(raw);
    expect(exportedMatch).not.toBeNull();
    const now = new Date(exportedMatch![1].trim());

    const reserialized = serializeAgenda(doc, { now });
    expect(reserialized).toBe(raw);
  });

  it("alle Punkte sind offen (frisches Template)", () => {
    const raw = readFileSync(templatePath, "utf-8");
    const doc = parseAgenda(raw);
    const allItems: string[] = [];
    for (const top of doc.tops) {
      for (const item of top.items) allItems.push(item.status);
      for (const sec of top.sections) for (const item of sec.items) allItems.push(item.status);
    }
    expect(allItems.length).toBeGreaterThan(0);
    expect(allItems.every((s) => s === "offen")).toBe(true);
  });
});
