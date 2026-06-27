import { useRef, useState, useCallback } from 'react';
import { readXlsx, writeAnonymizedXlsx, isExcelFile } from '../../core/xlsx.ts';
import { AnonymizationSession } from '../../core/session.ts';
import { FileSpreadsheet, X, Upload, Download, Copy } from 'lucide-react';
import { useToast } from './Toast.tsx';
import { useTranslation } from '../../i18n/LanguageContext.tsx';

interface Props {
  sessionRef: React.MutableRefObject<AnonymizationSession>;
}

export function RestoreView({ sessionRef }: Props) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const restoreFileInputRef = useRef<HTMLInputElement>(null);

  const [subTab, setSubTab] = useState<'paste' | 'upload'>('paste');

  // Paste mode
  const [pasteInput, setPasteInput] = useState('');
  const [pasteResult, setPasteResult] = useState('');

  // Upload mode
  const [redactedFile, setRedactedFile] = useState<File | null>(null);
  const [restoredBlob, setRestoredBlob] = useState<Blob | null>(null);
  const [restoring, setRestoring] = useState(false);

  const handleRestoreText = useCallback(() => {
    const result = sessionRef.current.deanonymize(pasteInput);
    setPasteResult(result);
  }, [pasteInput, sessionRef]);

  const handleCopyResult = useCallback(async () => {
    await navigator.clipboard.writeText(pasteResult);
    showToast(t.spreadsheet.copied);
  }, [pasteResult, showToast, t]);

  const handleRestoreFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isExcelFile(file.name)) {
      showToast(t.spreadsheet.unsupportedFormat);
      e.target.value = '';
      return;
    }
    setRestoring(true);
    try {
      const ext = await readXlsx(file);
      const replacements: Array<{ sheetIndex: number; colIndex: number; rowIndex: number; value: string }> = [];
      for (let si = 0; si < ext.sheets.length; si++) {
        const sheet = ext.sheets[si];
        for (let ri = 0; ri < sheet.rows.length; ri++) {
          for (let ci = 0; ci < sheet.rows[ri].length; ci++) {
            const cellVal = sheet.rows[ri][ci] ?? '';
            if (cellVal.length === 0) continue;
            const restored = sessionRef.current.deanonymize(cellVal);
            if (restored !== cellVal) {
              replacements.push({ sheetIndex: si, colIndex: ci, rowIndex: ri + 1, value: restored });
            }
          }
        }
      }
      const blob = writeAnonymizedXlsx(ext.workbook, replacements);
      setRedactedFile(file);
      setRestoredBlob(blob);
    } catch (err) {
      console.error('[Be Anonymized] Failed to restore xlsx:', err);
      showToast(t.spreadsheet.failedToRestore);
    } finally {
      setRestoring(false);
      e.target.value = '';
    }
  }, [sessionRef, showToast, t]);

  const handleRestoreDownload = useCallback(() => {
    if (!restoredBlob || !redactedFile) return;
    const baseName = redactedFile.name.replace(/\.xlsx$/i, '');
    const url = URL.createObjectURL(restoredBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseName}_restored.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(t.spreadsheet.downloaded);
  }, [restoredBlob, redactedFile, showToast, t]);

  return (
    <div className="flex flex-col h-full">
      {/* Sub-tab bar */}
      <div className="flex border-b border-[#D4D4D0] bg-[#F7F7F7] shrink-0">
        <button
          onClick={() => setSubTab('paste')}
          className={`px-5 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
            subTab === 'paste' ? 'border-[#223159] text-[#0E131B] bg-white' : 'border-transparent text-[#52617A] hover:text-[#0E131B]'
          }`}
        >
          {t.spreadsheet.pasteSubTab}
        </button>
        <button
          onClick={() => setSubTab('upload')}
          className={`px-5 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
            subTab === 'upload' ? 'border-[#223159] text-[#0E131B] bg-white' : 'border-transparent text-[#52617A] hover:text-[#0E131B]'
          }`}
        >
          {t.spreadsheet.uploadSubTab}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {subTab === 'paste' ? (
          <div className="max-w-2xl mx-auto">
            <p className="text-xs font-medium text-[#0E131B] mb-3">{t.spreadsheet.pasteDescription}</p>
            <textarea
              value={pasteInput}
              onChange={(e) => setPasteInput(e.target.value)}
              placeholder={t.spreadsheet.pastePlaceholder}
              className="w-full bg-transparent border border-[#D4D4D0] p-4 text-sm text-[#0E131B] placeholder:text-[#52617A] resize-none focus:outline-none focus:border-[#223159] min-h-[200px] font-light"
            />
            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={handleRestoreText}
                disabled={!pasteInput.trim()}
                className="px-5 py-2 text-xs font-medium bg-[#223159] text-[#FAFAFA] hover:bg-[#1A2648] transition-colors disabled:bg-[#223159]/55 disabled:cursor-not-allowed cursor-pointer"
              >
                {t.spreadsheet.restoreButton}
              </button>
              {pasteResult && (
                <button
                  onClick={handleCopyResult}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium border border-[#D4D4D0] text-[#52617A] hover:text-[#0E131B] hover:border-[#223159] transition-colors cursor-pointer"
                >
                  <Copy className="w-3 h-3" /> {t.spreadsheet.copied}
                </button>
              )}
            </div>
            {pasteResult && (
              <div className="mt-6">
                <p className="text-xs font-medium text-[#0E131B] mb-2">{t.spreadsheet.restoreLabel}</p>
                <div className="border border-[#D4D4D0] p-4 text-sm leading-relaxed whitespace-pre-wrap break-words text-foreground font-light max-h-[400px] overflow-auto">
                  {pasteResult}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-md mx-auto">
            <p className="text-xs font-medium text-[#0E131B] mb-3">{t.spreadsheet.uploadDescription}</p>
            <input ref={restoreFileInputRef} type="file" accept=".xlsx" onChange={handleRestoreFile} className="hidden" />
            {redactedFile && restoredBlob ? (
              <div className="flex items-center justify-between px-3 py-2.5 border border-[#D4D4D0] bg-[#F7F7F7]">
                <div className="flex items-center gap-2 min-w-0">
                  <FileSpreadsheet className="w-4 h-4 text-[#52617A] shrink-0" />
                  <span className="text-xs text-[#0E131B] truncate">{redactedFile.name}</span>
                  <button
                    onClick={() => { setRedactedFile(null); setRestoredBlob(null); }}
                    className="text-muted-foreground hover:text-[#DC2626] transition-colors cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <button
                  onClick={handleRestoreDownload}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-[#D4D4D0] bg-[#FFFFFF] text-[#0E131B] hover:bg-[#223159] hover:text-[#FAFAFA] transition-colors cursor-pointer text-xs font-medium"
                >
                  <Download className="w-3 h-3" />
                  {t.spreadsheet.downloadRestored}
                </button>
              </div>
            ) : (
              <button
                onClick={() => restoreFileInputRef.current?.click()}
                disabled={restoring}
                className="w-full flex items-center justify-center gap-2 px-4 py-6 border border-dashed border-[#D4D4D0] hover:border-[#223159]/40 text-xs text-[#52617A] hover:text-[#0E131B] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {restoring ? (
                  <>{t.spreadsheet.restoring}</>
                ) : (
                  <><Upload className="w-4 h-4" /> {t.spreadsheet.uploadRedacted}</>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
