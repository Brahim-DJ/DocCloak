import { useRef, useState, useCallback, useMemo } from 'react';
import { readXlsx, writeAnonymizedXlsx, isExcelFile } from '../../core/xlsx.ts';
import type { XlsxExtraction, SheetData } from '../../core/xlsx.ts';
import type { ReplacementEntry } from '../../core/types.ts';
import { AnonymizationSession } from '../../core/session.ts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { FileSpreadsheet, X, Upload, Download } from 'lucide-react';
import { useToast } from './Toast.tsx';
import { useTranslation } from '../../i18n/LanguageContext.tsx';

const PREVIEW_ROWS = 200;

const colKey = (si: number, ci: number) => `${si}:${ci}`;

interface Props {
  sessionRef: React.MutableRefObject<AnonymizationSession>;
}

export function AnonymizeView({ sessionRef }: Props) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [xlsxFile, setXlsxFile] = useState<File | null>(null);
  const [xlsxFileName, setXlsxFileName] = useState<string | null>(null);
  const [extraction, setExtraction] = useState<XlsxExtraction | null>(null);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set());
  const [anonymizeDone, setAnonymizeDone] = useState(false);
  const [entries, setEntries] = useState<ReplacementEntry[]>([]);
  const [downloading, setDownloading] = useState(false);

  const [anonymizedRowsMap, setAnonymizedRowsMap] = useState<Record<number, string[][]> | null>(null);

  const activeSheet: SheetData | null = useMemo(() => {
    if (!extraction) return null;
    return extraction.sheets[activeSheetIndex] ?? null;
  }, [extraction, activeSheetIndex]);

  const toggleColumn = useCallback((si: number, ci: number) => {
    setSelectedColumns((prev) => {
      const next = new Set(prev);
      const key = colKey(si, ci);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const toggleCurrentColumn = useCallback((ci: number) => {
    toggleColumn(activeSheetIndex, ci);
  }, [toggleColumn, activeSheetIndex]);

  const selectAllColumns = useCallback(() => {
    if (!extraction) return;
    const next = new Set(selectedColumns);
    for (let si = 0; si < extraction.sheets.length; si++) {
      for (let ci = 0; ci < extraction.sheets[si].headers.length; ci++) {
        next.add(colKey(si, ci));
      }
    }
    setSelectedColumns(next);
  }, [extraction, selectedColumns]);

  const deselectAllColumns = useCallback(() => {
    setSelectedColumns(new Set());
  }, []);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!isExcelFile(file.name)) {
      showToast(t.spreadsheet.unsupportedFormat);
      return;
    }
    try {
      const ext = await readXlsx(file);
      setXlsxFile(file);
      setXlsxFileName(file.name);
      setExtraction(ext);
      setActiveSheetIndex(0);
      setSelectedColumns(new Set());
      setAnonymizeDone(false);
      setEntries([]);
      setAnonymizedRowsMap(null);
      sessionRef.current.clear();
    } catch (err) {
      showToast(t.spreadsheet.failedToRead);
      console.error('[DocCloak] Failed to read xlsx:', err);
    }
  }, [t, showToast, sessionRef]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { handleFileSelect(file); e.target.value = ''; }
  }, [handleFileSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); }, []);

  const clear = useCallback(() => {
    setXlsxFile(null);
    setXlsxFileName(null);
    setExtraction(null);
    setSelectedColumns(new Set());
    setAnonymizeDone(false);
    setEntries([]);
    setAnonymizedRowsMap(null);
    sessionRef.current.clear();
  }, [sessionRef]);

  const anonymize = useCallback(() => {
    if (!extraction) return;
    sessionRef.current.clear();
    const session = sessionRef.current;

    const rowsPerSheet: string[][][] = [];
    for (let si = 0; si < extraction.sheets.length; si++) {
      const sheet = extraction.sheets[si];
      const newRows: string[][] = [];
      for (const row of sheet.rows) {
        const parts = row.map((cell, ci) => {
          const key = colKey(si, ci);
          if (selectedColumns.has(key) && cell.length > 0) {
            return session.anonymize(cell, 'OTHER');
          }
          return cell;
        });
        newRows.push(parts);
      }
      rowsPerSheet.push(newRows);
    }

    setAnonymizedRowsMap(Object.fromEntries(rowsPerSheet.map((r, i) => [i, r])));
    setEntries(session.getEntries());
    setAnonymizeDone(true);
  }, [extraction, selectedColumns, sessionRef]);

  const handleDownload = useCallback(async () => {
    if (!xlsxFile || !extraction || !anonymizeDone) return;
    setDownloading(true);
    try {
      const session = sessionRef.current;
      const replacements: Array<{ sheetIndex: number; colIndex: number; rowIndex: number; value: string }> = [];

      for (let si = 0; si < extraction.sheets.length; si++) {
        const sheet = extraction.sheets[si];
        for (let ci = 0; ci < sheet.headers.length; ci++) {
          const key = colKey(si, ci);
          if (!selectedColumns.has(key)) continue;
          for (let ri = 0; ri < sheet.rows.length; ri++) {
            const cellVal = sheet.rows[ri][ci] ?? '';
            if (cellVal.length === 0) continue;
            const placeholder = session.getForward(cellVal);
            if (placeholder) {
              replacements.push({ sheetIndex: si, colIndex: ci, rowIndex: ri + 1, value: placeholder });
            }
          }
        }
      }

      const blob = writeAnonymizedXlsx(extraction.workbook, replacements);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const baseName = xlsxFileName!.replace(/\.xlsx$/i, '');
      a.href = url;
      a.download = `${baseName}_redacted.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(t.spreadsheet.downloaded);
    } catch (err) {
      console.error('[DocCloak] Export failed:', err);
      showToast(t.spreadsheet.exportFailed);
    } finally {
      setDownloading(false);
    }
  }, [xlsxFile, extraction, anonymizeDone, selectedColumns, showToast, xlsxFileName, sessionRef, t]);

  const columnCount = activeSheet?.headers.length ?? 0;
  const selectedCount = selectedColumns.size;
  const previewRows = useMemo(() => {
    if (!activeSheet) return [];
    return activeSheet.rows.slice(0, PREVIEW_ROWS);
  }, [activeSheet]);

  if (!extraction) {
    return (
      <div
        className="flex flex-col items-center justify-center py-24 px-6 min-h-full"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <input ref={fileInputRef} type="file" accept=".xlsx" onChange={handleFileInput} className="hidden" />
        <div className="w-14 h-14 bg-[#F4F3EE] border border-[#C8C5BC] flex items-center justify-center mb-5">
          <FileSpreadsheet className="w-7 h-7 text-[#525252]" />
        </div>
        <p className="font-serif text-lg font-bold text-[#111111] mb-2 uppercase tracking-tight">{t.spreadsheet.uploadHeading}</p>
        <p className="text-sm text-muted-foreground mb-6">{t.spreadsheet.uploadSubtitle}</p>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-6 py-3 bg-[#111111] text-[#F9F9F7] hover:bg-[#222222] transition-colors cursor-pointer text-sm font-medium"
        >
          <Upload className="w-4 h-4" />
          {t.spreadsheet.uploadButton}
        </button>
      </div>
    );
  }

  if (!activeSheet) return null;

  return (
    <div className="flex flex-col h-full">
      <input ref={fileInputRef} type="file" accept=".xlsx" onChange={handleFileInput} className="hidden" />

      {/* Sheet tabs */}
      {extraction.sheets.length > 1 && (
        <div className="flex border-b border-[#E5E5E0] bg-[#F9F9F7] shrink-0">
          {extraction.sheets.map((sheet, si) => (
            <button
              key={si}
              onClick={() => setActiveSheetIndex(si)}
              className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                si === activeSheetIndex ? 'border-[#111111] text-[#111111] bg-white' : 'border-transparent text-[#707070] hover:text-[#111111]'
              }`}
            >
              {sheet.name}
            </button>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#E5E5E0] bg-[#F5F5F3] shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={anonymize}
            disabled={selectedCount === 0 || anonymizeDone}
            className="px-4 py-1.5 bg-[#111111] text-[#F9F9F7] hover:bg-[#222222] transition-colors disabled:bg-[#111111]/55 disabled:cursor-not-allowed cursor-pointer text-xs font-medium"
          >
            {t.spreadsheet.anonymizeSelected}
          </button>
          {anonymizeDone && entries.length > 0 && (
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-[#C8C5BC] bg-[#FFFFFF] text-[#111111] hover:bg-[#111111] hover:text-[#F9F9F7] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium"
            >
              <Download className="w-3 h-3" />
              {t.spreadsheet.downloadRedacted}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {anonymizeDone && (
            <p className="text-[10px] text-muted-foreground mr-2">{t.spreadsheet.entriesRedacted(entries.length)}</p>
          )}
          <button
            onClick={clear}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#525252] hover:text-[#CC0000] transition-colors cursor-pointer font-medium"
          >
            <X className="w-3 h-3" /> {t.spreadsheet.clear}
          </button>
        </div>
      </div>

      {/* Table area */}
      <div className="flex-1 overflow-auto p-4 min-h-0">
        {/* Column selection bar */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-[#111111]">
            {anonymizeDone ? t.spreadsheet.redactedValues : t.spreadsheet.selectColumns}
          </p>
          {!anonymizeDone && (
            <div className="flex items-center gap-2">
              <button onClick={selectAllColumns} className="text-[10px] text-[#525252] hover:text-[#111111] cursor-pointer underline">{t.spreadsheet.selectAll}</button>
              <button onClick={deselectAllColumns} className="text-[10px] text-[#525252] hover:text-[#111111] cursor-pointer underline">{t.spreadsheet.deselectAll}</button>
            </div>
          )}
        </div>

        <div className="border border-[#E5E5E0] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {activeSheet.headers.map((h, ci) => (
                  <TableHead key={ci} className="whitespace-nowrap px-3 py-2">
                    {anonymizeDone ? (
                      <span>{h || t.spreadsheet.colLabel(ci)}</span>
                    ) : (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={selectedColumns.has(colKey(activeSheetIndex, ci))}
                          onCheckedChange={() => toggleCurrentColumn(ci)}
                        />
                        <span>{h || t.spreadsheet.colLabel(ci)}</span>
                      </label>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(anonymizeDone && anonymizedRowsMap?.[activeSheetIndex] ? anonymizedRowsMap[activeSheetIndex] : previewRows).map((row, ri) => (
                <TableRow key={ri}>
                  {row.map((cell, ci) => (
                    <TableCell key={ci} className="px-3 py-1.5 text-xs max-w-[250px] truncate whitespace-nowrap">
                      {cell || '\u00A0'}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {activeSheet.rows.length > PREVIEW_ROWS && (
          <p className="text-[10px] text-muted-foreground mt-2">
            {t.spreadsheet.showingRows(PREVIEW_ROWS, activeSheet.rows.length)}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-[#E5E5E0] px-4 py-2 bg-[#F5F5F3] shrink-0 flex items-center justify-between">
        <p className="label-meta text-muted-foreground">{t.spreadsheet.rowColCount(activeSheet.rows.length, columnCount)}</p>
        <p className="label-meta text-muted-foreground">{xlsxFileName}</p>
      </div>
    </div>
  );
}
