import type { Language } from '../types.ts';
import { en } from './en.ts';
import { pl } from './pl.ts';
import { de } from './de.ts';
import { fr } from './fr.ts';
import { es } from './es.ts';
import { pt } from './pt.ts';
import { sv } from './sv.ts';
import { no } from './no.ts';
import { ar } from './ar.ts';

export const languages: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', translations: en },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', translations: pl },
  { code: 'de', name: 'German', nativeName: 'Deutsch', translations: de },
  { code: 'fr', name: 'French', nativeName: 'Fran\u00E7ais', translations: fr },
  { code: 'es', name: 'Spanish', nativeName: 'Espa\u00F1ol', translations: es },
  { code: 'pt', name: 'Portuguese', nativeName: 'Portugu\u00EAs', translations: pt },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', translations: sv },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk', translations: no },
  { code: 'ar', name: 'Arabic', nativeName: '\u0627\u0644\u0639\u0631\u0628\u064A\u0629', translations: ar },
];

export function getLanguage(code: string): Language {
  return languages.find((l) => l.code === code) ?? languages[0];
}
