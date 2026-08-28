function slugify(text: string): string {
  return (
    text
      .trim()
      .toLowerCase()
      .replace(/[äöüß]/g, (c) => ({ ä: "ae", ö: "oe", ü: "ue", ß: "ss" })[c] ?? c)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "abnahme"
  );
}

export type SaveOutcome = "picker" | "download" | "cancelled";

export interface SaveFileOptions {
  /** Kurzbeschreibung des Dateityps für den Speicherort-Dialog, z. B. "Markdown-Datei". */
  description: string;
  /** MIME-Type -> Dateiendungen, z. B. { "text/markdown": [".md"] }. */
  accept: Record<string, string[]>;
}

/**
 * Speichert eine Datei. Wo verfügbar (aktuell Chrome/Edge Desktop) über die File System Access
 * API mit einem echten Speicherort-Dialog – so kann z. B. direkt in einen SharePoint-Sync-Ordner
 * gespeichert werden statt über den Downloads-Ordner umzuwegen. Sonst (Safari, Firefox, mobile
 * Browser) klassischer Blob-Download in den Downloads-Ordner. Bricht der Nutzer den
 * Speicherort-Dialog ab, wird NICHT auf den klassischen Download zurückgefallen (sonst bekäme
 * man trotz Abbruch ungewollt eine Datei).
 */
export async function saveFile(
  content: Blob | string,
  filename: string,
  mimeType: string,
  options: SaveFileOptions,
): Promise<SaveOutcome> {
  const blob = typeof content === "string" ? new Blob([content], { type: mimeType }) : content;

  if (typeof window.showSaveFilePicker === "function") {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: options.description, accept: options.accept }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return "picker";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return "cancelled";
      }
      // Sonstiger Fehler (z. B. durch Browser-Policy blockiert) -> stiller Fallback auf Download.
    }
  }

  downloadBlobClassic(blob, filename);
  return "download";
}

function downloadBlobClassic(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function buildFilename(projektTitel: string, ext: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `abnahme-${slugify(projektTitel)}-${date}.${ext}`;
}
