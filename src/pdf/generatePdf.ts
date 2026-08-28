import type { AgendaDocument } from "../types/agenda";
import type * as PdfMakeApi from "pdfmake";
import { buildFilename, saveFile, type SaveOutcome } from "../io/fileDownload";
import { ensureFontsRegistered } from "./pdfFonts";
import { buildDocDefinition } from "./docDefinition";

interface PdfMakeModule {
  default: typeof PdfMakeApi;
}

export async function generateAgendaPdf(doc: AgendaDocument): Promise<SaveOutcome> {
  // Der ESM-Namespace eines require()ten CJS-Moduls ist schreibgeschützt (nur Getter).
  // pdfmakes addFonts()/addVirtualFileSystem() mutieren "this" selbst (this.fonts = ...),
  // deshalb muss über die "default"-Eigenschaft das eigentliche, mutierbare Objekt
  // verwendet werden statt der Namespace-Bindung direkt.
  const mod = (await import("pdfmake/build/pdfmake")) as unknown as PdfMakeModule;
  const pdfMake = mod.default;

  await ensureFontsRegistered(pdfMake);
  pdfMake.setUrlAccessPolicy?.(() => false);

  const definition = buildDocDefinition(doc);
  const created = pdfMake.createPdf(definition);
  const blob = await created.getBlob();
  return saveFile(blob, buildFilename(doc.titel, "pdf"), "application/pdf", {
    description: "PDF-Datei",
    accept: { "application/pdf": [".pdf"] },
  });
}
