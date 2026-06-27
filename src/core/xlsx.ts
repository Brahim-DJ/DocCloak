import * as XLSX from 'xlsx';

export interface SheetData {
  name: string;
  headers: string[];
  rows: string[][];
}

export interface XlsxExtraction {
  plainText: string;
  sheetCount: number;
  sheets: SheetData[];
  workbook: XLSX.WorkBook;
}

export interface CellReplacement {
  sheetIndex: number;
  colIndex: number;
  rowIndex: number;
  value: string;
}

const CELL_SEP = ' | ';
const ROW_SEP = '\n';
const SHEET_SEP = '\n\n';

function cellText(cell: XLSX.CellObject): string {
  if (cell.w) return cell.w;
  if (cell.v == null) return '';
  return String(cell.v);
}

export async function readXlsx(file: File): Promise<XlsxExtraction> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheets: SheetData[] = [];

  for (let si = 0; si < workbook.SheetNames.length; si++) {
    const sheetName = workbook.SheetNames[si];
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet || !worksheet['!ref']) continue;

    const range = XLSX.utils.decode_range(worksheet['!ref']);
    const rawRows: string[][] = [];

    for (let r = range.s.r; r <= range.e.r; r++) {
      const cells: string[] = [];
      for (let c = range.s.c; c <= range.e.c; c++) {
        const ref = XLSX.utils.encode_cell({ r, c });
        const cell = worksheet[ref];
        if (!cell) { cells.push(''); continue; }
        const text = cellText(cell);
        cells.push(text);
      }
      rawRows.push(cells);
    }

    let startRow = 0;
    if (worksheet['!merges']) {
      const colCount = range.e.c - range.s.c + 1;
      const titleMerge = worksheet['!merges'].find(
        (m) => m.s.r === 0 && m.s.c === 0 && m.e.r === 0 && m.e.c - m.s.c + 1 === colCount,
      );
      if (titleMerge) startRow = 1;
    }
    const headers = rawRows.length > startRow ? rawRows[startRow] : [];
    const rows = rawRows.slice(startRow + 1).filter((r) => r.some((c) => c.length > 0));

    sheets.push({ name: sheetName, headers, rows });
  }

  const plainText = sheets.map((sheet) => {
    const parts = [sheet.headers.join(CELL_SEP)];
    for (const row of sheet.rows) {
      parts.push(row.join(CELL_SEP));
    }
    return sheet.name + ':\n' + parts.join(ROW_SEP);
  }).join(SHEET_SEP);

  return {
    plainText,
    sheetCount: workbook.SheetNames.length,
    sheets,
    workbook,
  };
}

export function writeAnonymizedXlsx(
  workbook: XLSX.WorkBook,
  replacements: CellReplacement[],
): Blob {
  for (const repl of replacements) {
    const sheetName = workbook.SheetNames[repl.sheetIndex];
    if (!sheetName) continue;
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;

    const ref = XLSX.utils.encode_cell({ r: repl.rowIndex, c: repl.colIndex });
    worksheet[ref] = { t: 's', v: repl.value };
  }

  const out = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function isExcelFile(filename: string): boolean {
  return filename.split('.').pop()?.toLowerCase() === 'xlsx';
}
