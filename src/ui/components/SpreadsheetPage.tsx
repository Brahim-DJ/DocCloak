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
    <div className="flex flex-row h-full border border-[#A8A498] shadow-[0_2px_24px_-6px_rgba(17,17,17,0.08)]">
      {/* Sidebar */}
      <div className="w-44 shrink-0 bg-[#F4F3EE] border-r border-[#C8C5BC] flex flex-col items-stretch pt-8 gap-1 px-2">
        <button
          type="button"
          onClick={() => setMode('anonymize')}
          className={`w-full text-left px-4 py-2.5 text-sm font-medium border-l-2 transition-colors cursor-pointer ${
            mode === 'anonymize'
              ? 'border-[#111111] bg-white text-[#111111]'
              : 'border-transparent text-[#707070] hover:text-[#111111] hover:bg-white/50'
          }`}
        >
          {t.spreadsheet.anonymizeTab}
        </button>
        <button
          type="button"
          onClick={() => setMode('restore')}
          className={`w-full text-left px-4 py-2.5 text-sm font-medium border-l-2 transition-colors cursor-pointer ${
            mode === 'restore'
              ? 'border-[#111111] bg-white text-[#111111]'
              : 'border-transparent text-[#707070] hover:text-[#111111] hover:bg-white/50'
          }`}
        >
          {t.spreadsheet.restoreTab}
        </button>
      </div>

      {/* Content area */}
      <div className="flex-1 bg-white min-w-0 relative">
        <div className={mode === 'anonymize' ? '' : 'hidden'}>
          <AnonymizeView sessionRef={sessionRef} />
        </div>
        <div className={mode === 'restore' ? '' : 'hidden'}>
          <RestoreView sessionRef={sessionRef} />
        </div>
      </div>
    </div>
  );
}
