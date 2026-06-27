import { useState } from 'react';
import { Scale, Briefcase, Stethoscope, Users, Lock, ShieldCheck, Eye, ChevronDown, ArrowDown } from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext.tsx';

export function Hero({ onScrollToTool }: { onScrollToTool: () => void }) {
  const { t } = useTranslation();
  const h = t.landing.hero;
  return (
    <section className="bg-[#F7F7F7] px-6 pt-16 pb-20">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="font-display text-5xl md:text-6xl leading-[1.05] tracking-tight text-[#0E131B] font-medium">
          {h.titleBefore} <br className="hidden md:block" />
          <em className="italic font-normal text-[#52617A]">{h.titleEm}</em> {h.titleAfter}
        </h1>
        <p className="mt-7 text-lg md:text-xl text-[#52617A] leading-relaxed max-w-2xl mx-auto font-body">
          {h.subtitle}
          <span className="block mt-1 text-[#0E131B] font-medium">{h.subtitleEmphasis}</span>
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={onScrollToTool}
            className="group inline-flex items-center gap-2 px-8 py-4 bg-[#223159] text-[#FAFAFA] text-sm font-semibold uppercase tracking-[0.15em] hover:bg-[#1A2648] transition-colors cursor-pointer"
          >
            {h.ctaTry}
            <ArrowDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
          </button>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-1.5 px-8 py-4 border border-[#223159] text-[#0E131B] text-sm font-semibold uppercase tracking-[0.15em] hover:bg-[#223159] hover:text-[#FAFAFA] transition-colors cursor-pointer"
          >
            {h.ctaSeeHow}
          </a>
        </div>

        <div className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-[#52617A]">
          <span className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5" />
            {h.trustBrowser}
          </span>
          <span className="hidden sm:inline text-[#D4D4D0]">·</span>
          <a
            href="https://github.com/WLojek/DocCloak"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:text-[#0E131B] hover:underline underline-offset-4 transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            {h.trustOpenSource}
          </a>
          <span className="hidden sm:inline text-[#D4D4D0]">·</span>
          <span className="flex items-center gap-2">
            <Eye className="w-3.5 h-3.5" />
            {h.trustNoTracking}
          </span>
        </div>
      </div>
    </section>
  );
}

export function Audience() {
  const { t } = useTranslation();
  const a = t.landing.audience;
  const cards = [
    { icon: Scale, title: a.lawyersTitle, body: a.lawyersBody },
    { icon: Briefcase, title: a.consultantsTitle, body: a.consultantsBody },
    { icon: Stethoscope, title: a.healthcareTitle, body: a.healthcareBody },
    { icon: Users, title: a.hrTitle, body: a.hrBody },
  ];
  return (
    <section className="bg-[#F7F7F7] px-6 py-20 border-y border-[#D4D4D0]">
      <div className="max-w-5xl mx-auto">
        <p className="text-center text-xs uppercase tracking-[0.2em] text-[#52617A] mb-3 font-semibold">{a.eyebrow}</p>
        <h2 className="text-center font-display text-3xl md:text-4xl text-[#0E131B] mb-12 font-medium tracking-tight">
          {a.heading}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {cards.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="bg-[#F7F7F7] border border-[#D4D4D0] p-6 hover:border-[#223159] hover:shadow-md transition-all duration-150"
            >
              <Icon className="w-6 h-6 text-[#0E131B] mb-4" strokeWidth={1.5} />
              <h3 className="font-display text-xl text-[#0E131B] mb-2 font-medium">{title}</h3>
              <p className="text-sm text-[#52617A] leading-relaxed font-body">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HowItWorks() {
  const { t } = useTranslation();
  const h = t.landing.howItWorks;
  const steps = [
    { n: '01', title: h.step1Title, body: h.step1Body },
    { n: '02', title: h.step2Title, body: h.step2Body },
    { n: '03', title: h.step3Title, body: h.step3Body },
    { n: '04', title: h.step4Title, body: h.step4Body },
  ];
  return (
    <section id="how-it-works" className="bg-[#F7F7F7] px-6 py-20">
      <div className="max-w-5xl mx-auto">
        <p className="text-center text-xs uppercase tracking-[0.2em] text-[#52617A] mb-3 font-semibold">{h.eyebrow}</p>
        <h2 className="text-center font-display text-3xl md:text-4xl text-[#0E131B] mb-14 font-medium tracking-tight">
          {h.heading}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
          {steps.map(({ n, title, body }) => (
            <div key={n} className="flex gap-5">
              <span className="font-display text-3xl text-[#52617A] leading-none italic shrink-0">{n}</span>
              <div>
                <h3 className="font-display text-xl text-[#0E131B] mb-2 font-medium">{title}</h3>
                <p className="text-sm text-[#52617A] leading-relaxed font-body">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FAQ() {
  const { t } = useTranslation();
  const f = t.landing.faq;
  const items = [
    { q: f.q1, a: f.a1 },
    { q: f.q2, a: f.a2 },
    { q: f.q3, a: f.a3 },
    { q: f.q4, a: f.a4 },
    { q: f.q5, a: f.a5 },
    { q: f.q6, a: f.a6 },
  ];
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  return (
    <section className="bg-[#F7F7F7] px-6 py-20 border-t border-[#D4D4D0]">
      <div className="max-w-3xl mx-auto">
        <p className="text-center text-xs uppercase tracking-[0.2em] text-[#52617A] mb-3 font-semibold">{f.eyebrow}</p>
        <h2 className="text-center font-display text-3xl md:text-4xl text-[#0E131B] mb-12 font-medium tracking-tight">
          {f.heading}
        </h2>
        <div className="divide-y divide-[#D4D4D0] border-y border-[#D4D4D0]">
          {items.map((item, i) => {
            const open = openIdx === i;
            return (
              <div key={i}>
                <button
                  onClick={() => setOpenIdx(open ? null : i)}
                  className="w-full flex items-center justify-between gap-4 py-5 text-left cursor-pointer group"
                >
                  <span className="font-display text-lg text-[#0E131B] font-medium group-hover:text-[#223159]">{item.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-[#52617A] shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                  />
                </button>
                <div
                  className="grid transition-all duration-300 ease-in-out"
                  style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
                >
                  <div className="overflow-hidden">
                    <p className="pb-5 pr-8 text-sm text-[#52617A] leading-relaxed font-body">{item.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
