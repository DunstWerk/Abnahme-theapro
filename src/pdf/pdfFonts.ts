import arimoRegularUrl from "../assets/fonts/Arimo-Regular.ttf?url";
import arimoBoldUrl from "../assets/fonts/Arimo-Bold.ttf?url";
import arimoItalicUrl from "../assets/fonts/Arimo-Italic.ttf?url";
import arimoBoldItalicUrl from "../assets/fonts/Arimo-BoldItalic.ttf?url";

const CHUNK_SIZE = 8 * 1024;

async function fetchAsBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK_SIZE));
  }
  return btoa(binary);
}

export const FONT_FAMILY = "Arimo";

const FONT_FILES = {
  normal: "Arimo-Regular.ttf",
  bold: "Arimo-Bold.ttf",
  italics: "Arimo-Italic.ttf",
  bolditalics: "Arimo-BoldItalic.ttf",
};

let registrationPromise: Promise<void> | null = null;

/**
 * Registriert Arimo (metrisch kompatibel zu Arial, frei einbettbar, siehe
 * src/assets/fonts/OFL.txt) im pdfmake-Virtual-File-System. Wird memoized,
 * damit ein zweiter PDF-Export nicht erneut alle vier Schriftdateien lädt.
 */
export async function ensureFontsRegistered(pdfMake: {
  addVirtualFileSystem: (vfs: Record<string, string>) => void;
  addFonts: (fonts: Record<string, Record<string, string>>) => void;
}): Promise<void> {
  if (!registrationPromise) {
    registrationPromise = (async () => {
      const [normal, bold, italics, bolditalics] = await Promise.all([
        fetchAsBase64(arimoRegularUrl),
        fetchAsBase64(arimoBoldUrl),
        fetchAsBase64(arimoItalicUrl),
        fetchAsBase64(arimoBoldItalicUrl),
      ]);
      pdfMake.addVirtualFileSystem({
        [FONT_FILES.normal]: normal,
        [FONT_FILES.bold]: bold,
        [FONT_FILES.italics]: italics,
        [FONT_FILES.bolditalics]: bolditalics,
      });
      pdfMake.addFonts({ [FONT_FAMILY]: FONT_FILES });
    })();
  }
  return registrationPromise;
}
