import { useRef, useState } from 'react';
import { AnonymizationSession } from '../../core/session.ts';
import { AnonymizeView } from './AnonymizeView.tsx';
import { RestoreView } from './RestoreView.tsx';
import { useTranslation } from '../../i18n/LanguageContext.tsx';

export function SpreadsheetPage() {
  const { t } = useTranslation();
  const sessionRef = useRef(new AnonymizationSession());
  const [mode, setMode] = useState<'anonymize' | 'restore'>('anonymize');

  return (
    <div className="flex flex-row h-full border border-[#D4D4D0] shadow-lg">
      {/* Sidebar */}
      <div className="w-44 shrink-0 bg-[#F7F7F7] border-r border-[#D4D4D0] flex flex-col items-stretch pt-8 gap-1 px-2">
        <button
          type="button"
          onClick={() => setMode('anonymize')}
          className={`w-full text-left px-4 py-2.5 text-sm font-medium border-l-2 transition-colors cursor-pointer ${
            mode === 'anonymize'
              ? 'border-[#223159] bg-white text-[#0E131B]'
              : 'border-transparent text-[#52617A] hover:text-[#0E131B] hover:bg-white/50'
          }`}
        >
          {t.spreadsheet.anonymizeTab}
        </button>
        <button
          type="button"
          onClick={() => setMode('restore')}
          className={`w-full text-left px-4 py-2.5 text-sm font-medium border-l-2 transition-colors cursor-pointer ${
            mode === 'restore'
              ? 'border-[#223159] bg-white text-[#0E131B]'
              : 'border-transparent text-[#52617A] hover:text-[#0E131B] hover:bg-white/50'
          }`}
        >
          {t.spreadsheet.restoreTab}
        </button>
      </div>

      {/* Content area */}
      <div className="flex-1 bg-white min-w-0 relative">
        <div className={`h-full ${mode === 'anonymize' ? '' : 'hidden'}`}>
          <AnonymizeView sessionRef={sessionRef} />
        </div>
        <div className={`h-full ${mode === 'restore' ? '' : 'hidden'}`}>
          <RestoreView sessionRef={sessionRef} />
        </div>
      </div>
    </div>
  );
}
