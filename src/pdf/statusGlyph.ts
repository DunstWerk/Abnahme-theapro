import type { CanvasElement } from "pdfmake/interfaces";
import type { ItemStatus } from "../types/agenda";
import { pdfColors } from "./pdfStyles";

const SIZE = 9;

/**
 * Arimo enthält keine Ballot-Box-Glyphen (U+2610/2611/2612) – Status-Icons
 * werden deshalb als pdfmake-canvas gezeichnet statt als Zeichen gesetzt.
 */
export function statusGlyph(status: ItemStatus): { canvas: CanvasElement[] } {
  switch (status) {
    case "offen":
      return {
        canvas: [{ type: "rect", x: 0, y: 0, w: SIZE, h: SIZE, r: 1.5, lineColor: pdfColors.grey, lineWidth: 1 }],
      };
    case "iO":
      return {
        canvas: [
          {
            type: "rect",
            x: 0,
            y: 0,
            w: SIZE,
            h: SIZE,
            r: 1.5,
            color: pdfColors.olive,
            lineColor: pdfColors.olive,
            lineWidth: 1,
          },
          {
            type: "polyline",
            lineColor: "#FFFFFF",
            lineWidth: 1.4,
            points: [
              { x: 1.8, y: 4.8 },
              { x: 3.6, y: 7 },
              { x: 7.3, y: 2 },
            ],
          },
        ],
      };
    case "mangel":
      return {
        canvas: [
          {
            type: "rect",
            x: 0,
            y: 0,
            w: SIZE,
            h: SIZE,
            r: 1.5,
            color: pdfColors.coral,
            lineColor: pdfColors.coral,
            lineWidth: 1,
          },
          { type: "line", x1: 4.5, y1: 1.8, x2: 4.5, y2: 5.6, lineColor: "#FFFFFF", lineWidth: 1.4 },
          { type: "ellipse", x: 4.5, y: 7.3, r1: 0.8, r2: 0.8, color: "#FFFFFF", lineColor: "#FFFFFF" },
        ],
      };
    case "entfaellt":
    default:
      return {
        canvas: [
          { type: "rect", x: 0, y: 0, w: SIZE, h: SIZE, r: 1.5, color: "#8A8A8A", lineColor: "#8A8A8A", lineWidth: 1 },
          { type: "line", x1: 2, y1: 4.5, x2: 7, y2: 4.5, lineColor: "#FFFFFF", lineWidth: 1.4 },
        ],
      };
  }
}

const CHECKBOX_SIZE = 8.5;

/**
 * Gezeichnetes Ankreuzfeld für §3 der Niederschrift (ohne Eckenradius, damit es wie ein
 * echtes Formularfeld wirkt, nicht wie ein Status-Icon). Gleicher Grund wie bei statusGlyph:
 * Arimo hat keine Ballot-Box-Glyphen.
 */
export function checkboxGlyph(checked: boolean): { canvas: CanvasElement[] } {
  const canvas: CanvasElement[] = [
    { type: "rect", x: 0, y: 0, w: CHECKBOX_SIZE, h: CHECKBOX_SIZE, lineColor: pdfColors.grey, lineWidth: 0.75 },
  ];
  if (checked) {
    canvas.push({
      type: "polyline",
      lineColor: pdfColors.coral,
      lineWidth: 1.3,
      points: [
        { x: 1.6, y: 4.6 },
        { x: 3.4, y: 6.8 },
        { x: 7, y: 1.8 },
      ],
    });
  }
  return { canvas };
}
