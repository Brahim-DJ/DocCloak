import { useRef, useState, useCallback, useMemo } from 'react';
import { readXlsx, writeAnonymizedXlsx, isExcelFile } from '../../core/xlsx.ts';
import type { XlsxExtraction, SheetData } from '../../core/xlsx.ts';
import { AnonymizationSession } from '../../core/session.ts';
import type { ReplacementEntry } from '../../core/types.ts';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FileSpreadsheet, X, Upload, Download, Copy, Check, ChevronDown } from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext.tsx';
import { useToast } from './Toast.tsx';

const PREVIEW_ROWS = 50;

const colKey = (si: number, ci: number) => `${si}:${ci}`;

export function ExcelTool() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sessionRef = useRef(new AnonymizationSession());

  const [xlsxFile, setXlsxFile] = useState<File | null>(null);
  const [xlsxFileName, setXlsxFileName] = useState<string | null>(null);
  const [extraction, setExtraction] = useState<XlsxExtraction | null>(null);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set());
  const [columnListOpen, setColumnListOpen] = useState(false);
  const [anonymizeDone, setAnonymizeDone] = useState(false);
  const [originalText, setOriginalText] = useState('');
  const [anonymizedText, setAnonymizedText] = useState('');
  const [entries, setEntries] = useState<ReplacementEntry[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deanonymizeInput, setDeanonymizeInput] = useState('');
  const [deanonymizeResult, setDeanonymizeResult] = useState('');

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
      showToast(t.textInput.unsupportedFormat);
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
      setOriginalText('');
      setAnonymizedText('');
      setEntries([]);
      sessionRef.current.clear();
    } catch (err) {
      showToast('Failed to read spreadsheet');
      console.error('[DocCloak] Failed to read xlsx:', err);
    }
  }, [showToast, t]);

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
    setOriginalText('');
    setAnonymizedText('');
    setEntries([]);
    setDeanonymizeInput('');
    setDeanonymizeResult('');
    sessionRef.current.clear();
  }, []);

  const anonymize = useCallback(() => {
    if (!extraction) return;
    sessionRef.current.clear();
    const session = sessionRef.current;

    const replLines: string[] = [];
    for (let si = 0; si < extraction.sheets.length; si++) {
      const sheet = extraction.sheets[si];
      const headerParts = sheet.headers.map((h, ci) => {
        const key = colKey(si, ci);
        return selectedColumns.has(key) ? h : h;
      });
      replLines.push(headerParts.join(' | '));
      for (const row of sheet.rows) {
        const parts = row.map((cell, ci) => {
          const key = colKey(si, ci);
          if (selectedColumns.has(key) && cell.length > 0) {
            return session.anonymize(cell, 'OTHER');
          }
          return cell;
        });
        replLines.push(parts.join(' | '));
      }
    }
    setOriginalText(
      extraction.sheets.map((sheet) => {
        const si = extraction.sheets.indexOf(sheet);
        const headerParts = sheet.headers.map((h, ci) => {
          const key = colKey(si, ci);
          return selectedColumns.has(key) ? `[${h}]` : h;
        });
        const lines = [headerParts.join(' | ')];
        for (const row of sheet.rows) {
          lines.push(row.join(' | '));
        }
        return sheet.name + ':\n' + lines.join('\n');
      }).join('\n\n')
    );
    setAnonymizedText(replLines.join('\n\n'));
    setEntries(session.getEntries());
    setAnonymizeDone(true);
  }, [extraction, selectedColumns]);

  const handleDownload = useCallback(async () => {
    if (!xlsxFile || !extraction || !anonymizeDone) return;
    setDownloading(true);
    try {
      const replacements: Array<{ sheetIndex: number; colIndex: number; rowIndex: number; value: string }> = [];
      const session = sessionRef.current;

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
      showToast(t.textOutput.downloaded);
    } catch (err) {
      console.error('[DocCloak] Export failed:', err);
      showToast(t.textOutput.exportFailed ?? 'Export failed.');
    } finally {
      setDownloading(false);
    }
  }, [xlsxFile, extraction, anonymizeDone, selectedColumns, showToast, t, xlsxFileName]);

  const copyAnonymized = useCallback(async () => {
    await navigator.clipboard.writeText(anonymizedText);
    setCopied(true);
    showToast(t.toast.copiedToClipboard);
    setTimeout(() => setCopied(false), 2000);
  }, [anonymizedText, showToast, t]);

  const handleDeanonymize = useCallback(() => {
    const result = sessionRef.current.deanonymize(deanonymizeInput);
    setDeanonymizeResult(result);
  }, [deanonymizeInput]);

  const copyDeanonymized = useCallback(async () => {
    await navigator.clipboard.writeText(deanonymizeResult);
    showToast(t.toast.copiedToClipboard);
  }, [deanonymizeResult, showToast, t]);

  const previewRows = useMemo(() => {
    if (!activeSheet) return [];
    return activeSheet.rows.slice(0, PREVIEW_ROWS);
  }, [activeSheet]);

  const columnCount = activeSheet?.headers.length ?? 0;
  const selectedCount = selectedColumns.size;

  if (!extraction) {
    return (
      <div
        className="border border-[#A8A498] bg-[#FFFFFF] shadow-[0_2px_24px_-6px_rgba(17,17,17,0.08)]"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <input ref={fileInputRef} type="file" accept=".xlsx" onChange={handleFileInput} className="hidden" />
        <div className="flex flex-col items-center justify-center py-20 px-6">
          <div className="w-14 h-14 bg-[#F4F3EE] border border-[#C8C5BC] flex items-center justify-center mb-5">
            <FileSpreadsheet className="w-7 h-7 text-[#525252]" />
          </div>
          <p className="font-serif text-lg font-bold text-[#111111] mb-2 uppercase tracking-tight">
            Upload Spreadsheet
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            .xlsx — columns and rows preserved
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-6 py-3 bg-[#111111] text-[#F9F9F7] hover:bg-[#222222] transition-colors cursor-pointer text-sm font-medium"
          >
            <Upload className="w-4 h-4" />
            Upload Spreadsheet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-[#A8A498] bg-[#FFFFFF] shadow-[0_2px_24px_-6px_rgba(17,17,17,0.08)]">
      <input ref={fileInputRef} type="file" accept=".xlsx" onChange={handleFileInput} className="hidden" />

      {/* File bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#C8C5BC] bg-[#F4F3EE]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 bg-[#FFFFFF] border border-[#C8C5BC] flex items-center justify-center flex-shrink-0">
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#525252]" />
          </div>
          <p className="text-xs text-[#111111] truncate font-medium">{xlsxFileName}</p>
        </div>
        <div className="flex items-center gap-2">
          {anonymizeDone && entries.length > 0 && (
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-[#C8C5BC] bg-[#FFFFFF] text-[#111111] hover:bg-[#111111] hover:text-[#F9F9F7] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium"
            >
              <Download className="w-3 h-3" />
              Download Redacted
            </button>
          )}
          <button
            onClick={clear}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#525252] hover:text-[#CC0000] transition-colors cursor-pointer font-medium"
          >
            <X className="w-3 h-3" />
            {t.textInput.clear}
          </button>
        </div>
      </div>

      {/* Sheet tabs */}
      {extraction.sheets.length > 1 && (
        <div className="flex border-b border-[#E5E5E0] bg-[#F9F9F7]">
          {extraction.sheets.map((sheet, si) => (
            <button
              key={si}
              onClick={() => setActiveSheetIndex(si)}
              className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                si === activeSheetIndex
                  ? 'border-[#111111] text-[#111111] bg-white'
                  : 'border-transparent text-[#707070] hover:text-[#111111]'
              }`}
            >
              {sheet.name}
            </button>
          ))}
        </div>
      )}

      {/* Column selection: table preview */}
      {activeSheet && !anonymizeDone && (
        <div className="p-4 border-b border-[#E5E5E0]">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-[#111111]">
              Select columns to anonymize
            </p>
            <div className="flex items-center gap-2">
              <button onClick={selectAllColumns} className="text-[10px] text-[#525252] hover:text-[#111111] cursor-pointer underline">Select all</button>
              <button onClick={deselectAllColumns} className="text-[10px] text-[#525252] hover:text-[#111111] cursor-pointer underline">Clear</button>
            </div>
          </div>
          <div className="overflow-auto max-h-[320px] border border-[#E5E5E0]">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#F4F3EE] border-b border-[#E5E5E0]">
                  {activeSheet.headers.map((h, ci) => (
                    <th key={ci} className="px-3 py-2 text-left font-medium text-[#111111] whitespace-nowrap">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={selectedColumns.has(colKey(activeSheetIndex, ci))}
                          onCheckedChange={() => toggleCurrentColumn(ci)}
                        />
                        <span>{h || `Col ${ci + 1}`}</span>
                      </label>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, ri) => (
                  <tr key={ri} className="border-b border-[#E5E5E0] even:bg-[#F9F9F7]">
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-3 py-1.5 text-[#525252] max-w-[200px] truncate whitespace-nowrap">
                        {cell || '\u00A0'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {activeSheet.rows.length > PREVIEW_ROWS && (
            <p className="text-[10px] text-muted-foreground mt-2">
              Showing {PREVIEW_ROWS} of {activeSheet.rows.length} rows
            </p>
          )}

          {/* Collapsible column list for many columns */}
          {columnCount > 0 && (
            <div className="mt-3">
              <button
                onClick={() => setColumnListOpen(!columnListOpen)}
                className="flex items-center gap-1.5 text-xs text-[#525252] hover:text-[#111111] cursor-pointer"
              >
                <ChevronDown className={`w-3 h-3 transition-transform ${columnListOpen ? 'rotate-180' : ''}`} />
                Column list ({selectedCount} selected)
              </button>
              {columnListOpen && (
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 max-h-[200px] overflow-auto p-2 border border-[#E5E5E0] bg-[#F9F9F7]">
                  {activeSheet.headers.map((h, ci) => (
                    <label key={ci} className="flex items-center gap-2 cursor-pointer text-xs text-[#525252] hover:text-[#111111] px-2 py-1 rounded hover:bg-[#F0F0F0]">
                      <Checkbox
                        checked={selectedColumns.has(colKey(activeSheetIndex, ci))}
                        onCheckedChange={() => toggleCurrentColumn(ci)}
                      />
                      <span className="truncate">{h || `Col ${ci + 1}`}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Two-panel text view */}
      {(anonymizeDone || activeSheet) && (
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Original panel */}
          <div className="border-r border-[#C8C5BC] min-h-[200px] flex flex-col">
            <div className="px-4 py-2.5 bg-[#F4F3EE] border-b border-[#C8C5BC]">
              <p className="text-xs font-medium text-[#111111]">Original</p>
            </div>
            <div className="p-4 text-sm leading-relaxed whitespace-pre-wrap break-words text-foreground font-light overflow-auto max-h-[50vh]">
              {anonymizeDone ? originalText : activeSheet ? (
                <div>
                  <p className="text-xs font-medium text-[#111111] mb-2">{activeSheet.name}</p>
                  <div className="text-xs text-[#525252] font-mono">
                    {activeSheet.headers.join(' | ')}
                    {activeSheet.rows.slice(0, Math.min(activeSheet.rows.length, 200)).map((row, ri) => (
                      <div key={ri} className="truncate">{row.join(' | ')}</div>
                    ))}
                    {activeSheet.rows.length > 200 && (
                      <p className="text-[10px] text-muted-foreground mt-2">
                        ... and {activeSheet.rows.length - 200} more rows
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-xs">No data</p>
              )}
            </div>
          </div>

          {/* Anonymized panel */}
          <div className="min-h-[200px] flex flex-col">
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#F4F3EE] border-b border-[#C8C5BC]">
              <p className="text-xs font-medium text-[#111111]">Anonymized</p>
              {anonymizeDone && anonymizedText && (
                <button
                  onClick={copyAnonymized}
                  className="flex items-center gap-1.5 text-xs text-[#525252] hover:text-[#111111] cursor-pointer"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              )}
            </div>
            <div className="p-4 text-sm leading-relaxed whitespace-pre-wrap break-words text-foreground font-light overflow-auto max-h-[50vh]">
              {!anonymizeDone ? (
                <p className="text-muted-foreground text-xs">
                  {selectedCount > 0
                    ? `${selectedCount} column${selectedCount !== 1 ? 's' : ''} selected — click "Anonymize Spreadsheet" below`
                    : 'Select columns above, then anonymize'}
                </p>
              ) : anonymizedText ? (
                anonymizedText
              ) : (
                <p className="text-muted-foreground text-xs">No data to display</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer with anonymize button */}
      <div className="border-t border-[#E5E5E0] px-4 py-3 bg-[#F5F5F3] flex items-center justify-between">
        <p className="label-meta text-muted-foreground">
          {activeSheet ? `${activeSheet.rows.length} rows, ${columnCount} columns` : '\u00A0'}
        </p>
        {!anonymizeDone && (
          <Button
            onClick={anonymize}
            disabled={selectedCount === 0}
            className="gap-2 px-6 py-2 text-xs uppercase tracking-wider font-semibold bg-[#111111] text-[#F9F9F7] hover:bg-[#222222] transition-colors disabled:bg-[#111111]/55 disabled:text-[#F9F9F7] disabled:cursor-not-allowed"
          >
            Anonymize Spreadsheet
          </Button>
        )}
        {anonymizeDone && (
          <div className="flex items-center gap-2">
            {entries.length > 0 && (
              <p className="text-[10px] text-muted-foreground">
                {entries.length} entr{entries.length !== 1 ? 'ies' : 'y'} redacted
              </p>
            )}
          </div>
        )}
      </div>

      {/* De-anonymize section */}
      {anonymizeDone && entries.length > 0 && (
        <div className="border-t border-[#E5E5E0]">
          <div className="py-6 text-center font-serif text-xl text-[#E5E5E0] tracking-[1em] select-none">&#10043; &#10043; &#10043;</div>
          <div className="px-6 mb-4">
            <h3 className="font-serif text-base font-bold text-[#111111] uppercase tracking-tight mb-1">
              {t.step2.title}
            </h3>
            <p className="text-xs text-muted-foreground">{t.step2.description}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-t border-[#E5E5E0]">
            {/* Input */}
            <div className="border-r border-[#C8C5BC] flex flex-col">
              <div className="px-4 py-2.5 bg-[#F4F3EE] border-b border-[#C8C5BC]">
                <p className="text-xs font-medium text-[#111111]">{t.deAnonymize.pasteLabel}</p>
              </div>
              <textarea
                value={deanonymizeInput}
                onChange={(e) => setDeanonymizeInput(e.target.value)}
                placeholder={t.deAnonymize.inputPlaceholder}
                className="w-full bg-transparent p-4 text-sm text-[#111111] placeholder:text-[#707070] resize-none focus:outline-none min-h-[120px] font-light"
                style={{ fieldSizing: 'content' } as React.CSSProperties}
              />
              <div className="px-4 pb-3">
                <button
                  onClick={handleDeanonymize}
                  disabled={!deanonymizeInput.trim()}
                  className="px-4 py-2 text-xs font-medium bg-[#111111] text-[#F9F9F7] hover:bg-[#222222] transition-colors disabled:bg-[#111111]/55 disabled:cursor-not-allowed cursor-pointer"
                >
                  {t.deAnonymize.restoreButton}
                </button>
              </div>
            </div>
            {/* Output */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between px-4 py-2.5 bg-[#F4F3EE] border-b border-[#C8C5BC]">
                <p className="text-xs font-medium text-[#111111]">{t.deAnonymize.restoredLabel}</p>
                {deanonymizeResult && (
                  <button onClick={copyDeanonymized} className="text-xs text-[#525252] hover:text-[#111111] cursor-pointer flex items-center gap-1">
                    <Copy className="w-3 h-3" /> {t.deAnonymize.copy}
                  </button>
                )}
              </div>
              <div className="p-4 text-sm leading-relaxed whitespace-pre-wrap break-words text-foreground font-light min-h-[120px]">
                {deanonymizeResult || <span className="text-muted-foreground">{t.deAnonymize.outputPlaceholder}</span>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
