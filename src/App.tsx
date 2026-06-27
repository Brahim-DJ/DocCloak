import { useState, useEffect, useCallback, useRef } from 'react';
import { SpreadsheetPage } from './ui/components/SpreadsheetPage.tsx';
import { DocumentPage } from './ui/components/DocumentPage.tsx';
import { useAnonymizer } from './ui/hooks/useAnonymizer.ts';
import { useTranslation } from './i18n/LanguageContext.tsx';
import { languages } from './i18n/translations/index.ts';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Languages, Check } from 'lucide-react';
import { useToast } from './ui/components/Toast.tsx';

export default function App() {
  const { t, language, setLanguage } = useTranslation();
  const { showToast } = useToast();

  const {
    inputText, anonymizedText, entities, entries, excludedIndices,
    modelLoaded, modelLoading, modelError,
    anonymizing, detectionProgress, detectionError, downloadProgress,
    threshold, replacementMode, customLabels,
    docxFileName, hasDocxExtraction,
    activeProvider, regexRules, regexRegion,
    handleInputChange, anonymize,
    addManualEntity, removeEntity, renameLabel, toggleEntity,
    deanonymize, clear,
    handleThresholdChange, handleReplacementModeChange, handleCustomLabelsChange,
    handleSwitchProvider, handleRegexChange, handleRegexRegionChange,
    loadDocxFile, exportDocx, removeDocxFile,
  } = useAnonymizer();

  const [activeTab, setActiveTab] = useState<'documents' | 'spreadsheets'>('spreadsheets');
  const [downloading, setDownloading] = useState(false);
  const clearSnapshotRef = useRef<{ text: string; anonymized: string; entities: typeof entities; entries: typeof entries } | null>(null);

  const handleDownloadDocx = useCallback(async () => {
    if (!exportDocx) return;
    setDownloading(true);
    try {
      const blob = await exportDocx();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const ext = docxFileName?.match(/\.(docx?)$/i)?.[1] ?? 'docx';
      const baseName = docxFileName?.replace(/\.(docx?)$/i, '') ?? 'document';
      a.href = url;
      a.download = `${baseName}_redacted.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(t.textOutput.downloaded);
    } catch (err) {
      console.error('[Be Anonymized] Export failed:', err);
      showToast(t.textOutput.exportFailed ?? 'Export failed.');
    } finally {
      setDownloading(false);
    }
  }, [exportDocx, docxFileName, showToast, t]);

  // Keyboard shortcut: Cmd+Enter / Ctrl+Enter to redact
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (inputText.trim() && !anonymizing) {
          anonymize();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [inputText, anonymizing, anonymize]);

  // Clear with undo
  const handleClear = useCallback(() => {
    if (!inputText) return;
    clearSnapshotRef.current = { text: inputText, anonymized: anonymizedText, entities, entries };
    clear();
    showToast(t.toast.cleared, {
      label: t.toast.undo,
      onClick: () => {
        const snap = clearSnapshotRef.current;
        if (snap) {
          handleInputChange(snap.text);
          clearSnapshotRef.current = null;
        }
      },
    });
  }, [inputText, anonymizedText, entities, entries, clear, handleInputChange, showToast, t]);

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="px-6 py-2 border-b border-[#E8E8E5] bg-[#F7F7F7]/85 shrink-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="font-display text-lg tracking-tight text-[#223159] font-medium">Be Anonymized</span>
          <div className="flex items-center gap-4">
            {/* Language switcher */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Languages className="w-3.5 h-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-48 p-1">
                {languages.filter(l => l.code === 'en' || l.code === 'fr' || l.code === 'ar').map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-[#E8E8E5] transition-colors duration-200 flex items-center justify-between cursor-pointer"
                  >
                    <span className="text-[#0E131B]/80">{lang.nativeName}</span>
                    {language === lang.code && <Check className="w-3.5 h-3.5 text-[#223159]" />}
                  </button>
                ))}
              </PopoverContent>
            </Popover>

            {/* Nav */}
            <nav className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab('spreadsheets')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer rounded-md ${
                  activeTab === 'spreadsheets' ? 'bg-[#223159] text-white' : 'text-[#52617A] hover:text-[#223159]'
                }`}
              >
                {t.nav.spreadsheets}
              </button>
              <button
                onClick={() => setActiveTab('documents')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer rounded-md ${
                  activeTab === 'documents' ? 'bg-[#223159] text-white' : 'text-[#52617A] hover:text-[#223159]'
                }`}
              >
                {t.nav.documents}
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col max-w-6xl w-full mx-auto px-6 pt-4 pb-4 overflow-hidden">
        <div className={`flex-1 min-h-0 ${activeTab === 'spreadsheets' ? '' : 'hidden'}`}>
          <SpreadsheetPage />
        </div>
        <div className={`flex-1 min-h-0 ${activeTab === 'documents' ? '' : 'hidden'}`}>
          <DocumentPage
            inputText={inputText}
            anonymizedText={anonymizedText}
            entities={entities}
            entries={entries}
            excludedIndices={excludedIndices}
            modelLoaded={modelLoaded}
            modelLoading={modelLoading}
            modelError={modelError}
            anonymizing={anonymizing}
            detectionProgress={detectionProgress}
            detectionError={detectionError}
            downloadProgress={downloadProgress}
            threshold={threshold}
            replacementMode={replacementMode}
            customLabels={customLabels}
            docxFileName={docxFileName}
            hasDocxExtraction={hasDocxExtraction}
            activeProvider={activeProvider}
            regexRules={regexRules}
            regexRegion={regexRegion}
            handleInputChange={handleInputChange}
            anonymize={anonymize}
            addManualEntity={addManualEntity}
            removeEntity={removeEntity}
            renameLabel={renameLabel}
            toggleEntity={toggleEntity}
            deanonymize={deanonymize}
            clear={clear}
            handleThresholdChange={handleThresholdChange}
            handleReplacementModeChange={handleReplacementModeChange}
            handleCustomLabelsChange={handleCustomLabelsChange}
            handleSwitchProvider={handleSwitchProvider}
            handleRegexChange={handleRegexChange}
            handleRegexRegionChange={handleRegexRegionChange}
            loadDocxFile={loadDocxFile}
            exportDocx={exportDocx}
            removeDocxFile={removeDocxFile}
            handleClear={handleClear}
            handleDownloadDocx={handleDownloadDocx}
            downloading={downloading}
          />
        </div>
      </main>

    </div>
  );
}
