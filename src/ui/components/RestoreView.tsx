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
      console.error('[DocCloak] Failed to restore xlsx:', err);
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
      <div className="flex border-b border-[#E5E5E0] bg-[#F9F9F7] shrink-0">
        <button
          onClick={() => setSubTab('paste')}
          className={`px-5 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
            subTab === 'paste' ? 'border-[#111111] text-[#111111] bg-white' : 'border-transparent text-[#707070] hover:text-[#111111]'
          }`}
        >
          {t.spreadsheet.pasteSubTab}
        </button>
        <button
          onClick={() => setSubTab('upload')}
          className={`px-5 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
            subTab === 'upload' ? 'border-[#111111] text-[#111111] bg-white' : 'border-transparent text-[#707070] hover:text-[#111111]'
          }`}
        >
          {t.spreadsheet.uploadSubTab}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {subTab === 'paste' ? (
          <div className="max-w-2xl mx-auto">
            <p className="text-xs font-medium text-[#111111] mb-3">{t.spreadsheet.pasteDescription}</p>
            <textarea
              value={pasteInput}
              onChange={(e) => setPasteInput(e.target.value)}
              placeholder={t.spreadsheet.pastePlaceholder}
              className="w-full bg-transparent border border-[#E5E5E0] p-4 text-sm text-[#111111] placeholder:text-[#707070] resize-none focus:outline-none focus:border-[#111111] min-h-[200px] font-light"
            />
            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={handleRestoreText}
                disabled={!pasteInput.trim()}
                className="px-5 py-2 text-xs font-medium bg-[#111111] text-[#F9F9F7] hover:bg-[#222222] transition-colors disabled:bg-[#111111]/55 disabled:cursor-not-allowed cursor-pointer"
              >
                {t.spreadsheet.restoreButton}
              </button>
              {pasteResult && (
                <button
                  onClick={handleCopyResult}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium border border-[#C8C5BC] text-[#525252] hover:text-[#111111] hover:border-[#111111] transition-colors cursor-pointer"
                >
                  <Copy className="w-3 h-3" /> {t.spreadsheet.copied}
                </button>
              )}
            </div>
            {pasteResult && (
              <div className="mt-6">
                <p className="text-xs font-medium text-[#111111] mb-2">{t.spreadsheet.restoreLabel}</p>
                <div className="border border-[#E5E5E0] p-4 text-sm leading-relaxed whitespace-pre-wrap break-words text-foreground font-light max-h-[400px] overflow-auto">
                  {pasteResult}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-md mx-auto">
            <p className="text-xs font-medium text-[#111111] mb-3">{t.spreadsheet.uploadDescription}</p>
            <input ref={restoreFileInputRef} type="file" accept=".xlsx" onChange={handleRestoreFile} className="hidden" />
            {redactedFile && restoredBlob ? (
              <div className="flex items-center justify-between px-3 py-2.5 border border-[#E5E5E0] bg-[#F9F9F7]">
                <div className="flex items-center gap-2 min-w-0">
                  <FileSpreadsheet className="w-4 h-4 text-[#525252] shrink-0" />
                  <span className="text-xs text-[#111111] truncate">{redactedFile.name}</span>
                  <button
                    onClick={() => { setRedactedFile(null); setRestoredBlob(null); }}
                    className="text-muted-foreground hover:text-[#CC0000] transition-colors cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <button
                  onClick={handleRestoreDownload}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-[#C8C5BC] bg-[#FFFFFF] text-[#111111] hover:bg-[#111111] hover:text-[#F9F9F7] transition-colors cursor-pointer text-xs font-medium"
                >
                  <Download className="w-3 h-3" />
                  {t.spreadsheet.downloadRestored}
                </button>
              </div>
            ) : (
              <button
                onClick={() => restoreFileInputRef.current?.click()}
                disabled={restoring}
                className="w-full flex items-center justify-center gap-2 px-4 py-6 border border-dashed border-[#C8C5BC] hover:border-[#111111]/40 text-xs text-[#525252] hover:text-[#111111] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
