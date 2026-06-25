import { useState } from 'react';
import type { DetectedEntity, EntityType, ReplacementEntry } from '../../core/types.ts';
import type { RegexRegionId, ProviderId } from '../../core/engine.ts';
import type { ReplacementMode } from '../../core/session.ts';
import { TextInput } from './TextInput.tsx';
import { TextOutput } from './TextOutput.tsx';
import { EntityTable } from './EntityTable.tsx';
import { DeAnonymize } from './DeAnonymize.tsx';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { ArrowRight, Settings, Plus, X, ChevronDown, FileText, Download } from 'lucide-react';
import { PROVIDERS, REGEX_REGIONS } from '../../core/engine.ts';
import { useTranslation } from '../../i18n/LanguageContext.tsx';

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  inputText: string;
  anonymizedText: string;
  entities: DetectedEntity[];
  entries: ReplacementEntry[];
  excludedIndices: Set<number>;
  modelLoaded: boolean;
  modelLoading: boolean;
  modelError: boolean;
  anonymizing: boolean;
  detectionProgress: number | null;
  detectionError: string | null;
  downloadProgress: { downloaded: number; total: number } | null;
  threshold: number;
  replacementMode: ReplacementMode;
  customLabels: string[];
  docxFileName: string | null;
  hasDocxExtraction: boolean;
  activeProvider: ProviderId;
  regexRules: boolean;
  regexRegion: RegexRegionId;
  handleInputChange: (text: string) => void;
  anonymize: () => void;
  addManualEntity: (start: number, end: number, type: EntityType) => void;
  removeEntity: (index: number) => void;
  renameLabel: (original: string, newLabel: string) => void;
  toggleEntity: (index: number) => void;
  deanonymize: (text: string) => string;
  clear: () => void;
  handleThresholdChange: (value: number) => void;
  handleReplacementModeChange: (mode: ReplacementMode) => void;
  handleCustomLabelsChange: (labels: string[]) => void;
  handleSwitchProvider: (id: ProviderId) => void;
  handleRegexChange: (enabled: boolean) => void;
  handleRegexRegionChange: (region: RegexRegionId) => void;
  loadDocxFile: (file: File) => Promise<{ success: boolean; error?: string }>;
  exportDocx: () => Promise<Blob>;
  removeDocxFile: () => void;
  handleClear: () => void;
  handleDownloadDocx: () => void;
  downloading: boolean;
}

export function DocumentPage(props: Props) {
  const { t } = useTranslation();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newLabelInput, setNewLabelInput] = useState('');
  const [labelsExpanded, setLabelsExpanded] = useState(false);

  const handleAddLabel = () => {
    const label = newLabelInput.trim().toLowerCase();
    if (!label || props.customLabels.includes(label)) return;
    props.handleCustomLabelsChange([...props.customLabels, label]);
    setNewLabelInput('');
  };

  const handleRemoveLabel = (label: string) => {
    props.handleCustomLabelsChange(props.customLabels.filter((l) => l !== label));
  };

  const progressPercent = props.downloadProgress
    ? (props.downloadProgress.total > 0 ? Math.min(100, Math.round((props.downloadProgress.downloaded / props.downloadProgress.total) * 100)) : 0)
    : 0;

  return (
    <div className="h-full flex flex-col">
      {/* Model download overlay */}
      {props.modelLoading && (
        <div className="fixed inset-0 z-40 bg-[#F9F9F7]/95 flex items-center justify-center">
          <Card className="max-w-sm w-full mx-6 border-[#111111] shadow-[4px_4px_0px_0px_#111111]">
            <CardContent className="pt-8 pb-8 text-center">
              <h2 className="font-serif text-xl tracking-tight uppercase mb-4">
                <span className="font-bold text-[#111111]">Doc</span>
                <span className="font-normal text-[#525252]">Cloak</span>
              </h2>
              <p className="text-sm text-[#525252] mb-6 font-body">{t.loading.preparingEngine}</p>
              <Progress value={progressPercent} className="mb-3" />
              {props.downloadProgress ? (
                <p className="label-meta text-[#525252]">
                  {props.downloadProgress.total > 0
                    ? t.loading.progress(formatBytes(props.downloadProgress.downloaded), formatBytes(props.downloadProgress.total), progressPercent)
                    : formatBytes(props.downloadProgress.downloaded)}
                </p>
              ) : (
                <p className="label-meta text-[#525252]">{t.loading.initializing}</p>
              )}
              <p className="label-meta text-[#525252] mt-4">
                {props.downloadProgress && props.downloadProgress.total > 0
                  ? t.loading.oneTimeSetupWithSize(formatBytes(props.downloadProgress.total))
                  : t.loading.oneTimeSetup}
              </p>
              {props.downloadProgress && props.downloadProgress.total > 100 * 1024 * 1024 && (
                <p className="text-xs text-[#CC0000] mt-2 font-medium">{t.loading.largeModelWarning}</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Anonymizing overlay */}
      {props.anonymizing && (
        <div className="fixed inset-0 z-40 bg-[#F9F9F7]/80 flex items-center justify-center">
          <Card className="border-[#111111] shadow-[4px_4px_0px_0px_#111111]">
            <CardContent className="pt-8 pb-8 px-10 text-center">
              <div className="flex justify-center gap-[6px] mb-6">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-2 h-8 bg-[#111111]/30" style={{ animation: 'redact-bar 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite', animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
              <p className="font-serif text-base font-bold mb-1 uppercase tracking-tight">{t.anonymizing.title}</p>
              {props.detectionProgress !== null && (
                <div className="w-48 mx-auto mt-3 mb-2">
                  <Progress value={Math.round(props.detectionProgress * 100)} className="h-1.5" />
                  <p className="text-[10px] text-muted-foreground mt-1">{Math.round(props.detectionProgress * 100)}%</p>
                </div>
              )}
              <p className="text-sm text-[#525252] font-body">{t.anonymizing.description}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sub-header: settings + status */}
      <div className="flex items-center justify-end gap-3 px-4 py-2 border-b border-[#E5E5E0] bg-[#F9F9F7]/85 shrink-0">
        {/* Settings */}
        <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Settings className="w-3.5 h-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 max-h-[calc(100vh-5rem)] overflow-auto">
            <div className="space-y-3">
              <div>
                <span className="label-meta text-muted-foreground">{t.settings.detectionModel}</span>
                <div className="mt-2 space-y-2">
                  {PROVIDERS.map((p) => {
                    const modelT = t.settings.models[p.id as keyof typeof t.settings.models];
                    return (
                      <button
                        key={p.id}
                        onClick={() => { setSettingsOpen(false); props.handleSwitchProvider(p.id); }}
                        disabled={props.modelLoading}
                        className={`w-full text-left px-3 py-2 border transition-colors cursor-pointer ${
                          props.activeProvider === p.id
                            ? 'border-[#111111] bg-[#111111]/5 text-[#111111]'
                            : 'border-[#E5E5E0] text-[#525252] hover:border-[#111111]'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <p className="text-xs font-medium">{modelT?.label ?? p.label}</p>
                        <p className="text-[10px] text-muted-foreground font-light mt-0.5">{modelT?.description ?? p.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="border-t border-[#E5E5E0] pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="label-meta text-muted-foreground">{t.settings.detectionSensitivity}</span>
                  <span className="label-meta text-[#111111]">{Math.round((1 - props.threshold) * 100)}%</span>
                </div>
                <Slider
                  min={5} max={95} step={1}
                  value={[Math.round((1 - props.threshold) * 100)]}
                  onValueChange={([v]) => props.handleThresholdChange(1 - v / 100)}
                />
                <div className="flex justify-between mt-1.5">
                  <span className="label-meta text-muted-foreground">{t.settings.fewerMatches}</span>
                  <span className="label-meta text-muted-foreground">{t.settings.moreMatches}</span>
                </div>
              </div>
              <div className="border-t border-[#E5E5E0] pt-3 space-y-1">
                <p className="text-xs text-muted-foreground leading-relaxed font-light">{t.settings.sensitivityExplanation}</p>
                <p className="text-xs text-muted-foreground leading-relaxed font-light">{t.settings.confidenceThreshold(props.threshold.toFixed(2))}</p>
              </div>
              <div className="border-t border-[#E5E5E0] pt-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-xs font-medium text-[#111111]">{t.settings.regexRules}</p>
                    <p className="text-[10px] text-muted-foreground font-light mt-0.5">{t.settings.regexRulesDescription}</p>
                  </div>
                  <button
                    role="switch"
                    aria-checked={props.regexRules}
                    onClick={() => props.handleRegexChange(!props.regexRules)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                      props.regexRules ? 'bg-[#111111]' : 'bg-[#E5E5E0]'
                    }`}
                  >
                    <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                      props.regexRules ? 'translate-x-4' : 'translate-x-0'
                    }`} />
                  </button>
                </label>
                {props.regexRules && (
                  <div className="mt-2">
                    <span className="label-meta text-muted-foreground">{t.settings.regexRegion}</span>
                    <select
                      value={props.regexRegion}
                      onChange={(e) => props.handleRegexRegionChange(e.target.value as RegexRegionId)}
                      className="mt-1 w-full px-2 py-1.5 text-xs border border-[#C8C5BC] bg-white text-[#111111] cursor-pointer focus:outline-none focus:border-[#111111]"
                    >
                      {REGEX_REGIONS.map((r) => (
                        <option key={r} value={r}>{t.settings.regexRegions[r] ?? r}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="border-t border-[#E5E5E0] pt-3">
                <span className="label-meta text-muted-foreground">{t.settings.replacementStyle}</span>
                <div className="mt-2 space-y-2">
                  <button
                    onClick={() => props.handleReplacementModeChange('labeled')}
                    className={`w-full text-left px-3 py-2 border transition-colors cursor-pointer ${
                      props.replacementMode === 'labeled'
                        ? 'border-[#111111] bg-[#111111]/5 text-[#111111]'
                        : 'border-[#E5E5E0] text-[#525252] hover:border-[#111111]'
                    }`}
                  >
                    <p className="text-xs font-medium">{t.settings.labeledPlaceholders}</p>
                    <p className="text-[10px] text-muted-foreground font-light mt-0.5">{t.settings.labeledDescription}</p>
                  </button>
                  <button
                    onClick={() => props.handleReplacementModeChange('blanked')}
                    className={`w-full text-left px-3 py-2 border transition-colors cursor-pointer ${
                      props.replacementMode === 'blanked'
                        ? 'border-[#111111] bg-[#111111]/5 text-[#111111]'
                        : 'border-[#E5E5E0] text-[#525252] hover:border-[#111111]'
                    }`}
                  >
                    <p className="text-xs font-medium">{t.settings.blankedOut}</p>
                    <p className="text-[10px] text-muted-foreground font-light mt-0.5">{t.settings.blankedDescription}</p>
                  </button>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Status badge */}
        <Badge variant="outline" className="gap-2 h-7">
          <span className={`w-2 h-2 inline-block ${props.modelLoaded ? 'bg-[#2D6A4F]' : props.modelError ? 'bg-[#CC0000]' : 'bg-[#B8860B]'}`} />
          {props.modelLoaded ? t.header.ready : props.modelError ? t.header.error : t.header.notReady}
        </Badge>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-auto px-6 pt-4 pb-4">
        {/* Custom labels */}
        {props.activeProvider !== 'bardsai' && (
          <div className="mb-6">
            <button
              onClick={() => setLabelsExpanded(!labelsExpanded)}
              className="w-full flex items-center justify-between px-4 py-3 bg-[#111111] text-[#F9F9F7] cursor-pointer hover:bg-[#222222] transition-colors duration-150"
            >
              <div className="flex items-baseline gap-2">
                <span className="label-meta text-[#F9F9F7] tracking-[0.15em]">{t.settings.customLabels}</span>
                {!labelsExpanded && props.customLabels.length > 0 && (
                  <span className="text-[10px] text-[#F9F9F7]/60 font-mono">{props.customLabels.join(', ')}</span>
                )}
              </div>
              <ChevronDown className={`w-4 h-4 text-[#F9F9F7] transition-transform duration-200 ${labelsExpanded ? 'rotate-180' : ''}`} />
            </button>
            <div className="grid transition-all duration-300 ease-in-out" style={{ gridTemplateRows: labelsExpanded ? '1fr' : '0fr' }}>
              <div className="overflow-hidden">
                <div className="border border-t-0 border-[#E5E5E0] p-4">
                  <p className="text-xs text-muted-foreground font-light mb-3">{t.settings.customLabelsDescription}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      type="text"
                      value={newLabelInput}
                      onChange={(e) => setNewLabelInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddLabel(); }}
                      placeholder={t.settings.customLabelsPlaceholder}
                      className="w-52 text-xs px-3 py-2 border-b-2 border-[#111111] bg-transparent text-[#111111] font-mono placeholder:text-muted-foreground focus:outline-none focus:bg-[#F0F0F0]"
                      style={{ borderRadius: 0 }}
                    />
                    <button
                      onClick={handleAddLabel}
                      disabled={!newLabelInput.trim()}
                      className="text-xs px-4 py-2 bg-[#111111] text-[#F9F9F7] hover:bg-[#F9F9F7] hover:text-[#111111] border border-[#111111] transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer uppercase tracking-wider font-sans font-medium flex items-center gap-1.5"
                    >
                      <Plus className="w-3 h-3" /> {t.settings.addLabel}
                    </button>
                    {props.customLabels.map((label) => (
                      <span key={label} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 bg-[#111111] text-[#F9F9F7] font-mono shadow-[2px_2px_0px_0px_#E5E5E0] hover:shadow-[3px_3px_0px_0px_#CC0000] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all duration-150">
                        {label}
                        <button onClick={() => handleRemoveLabel(label)} className="text-[#F9F9F7]/60 hover:text-[#CC0000] transition-colors cursor-pointer" aria-label={`Remove ${label}`}>
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* File bar */}
        {props.docxFileName && props.anonymizedText && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-b-0 border-[#A8A498] bg-[#F4F3EE] shadow-[0_2px_24px_-6px_rgba(17,17,17,0.08)]">
            <div className="flex items-center gap-2.5 px-4 py-2.5 border-r-0 md:border-r border-[#C8C5BC]">
              <div className="w-7 h-7 bg-[#FFFFFF] border border-[#C8C5BC] flex items-center justify-center flex-shrink-0">
                <FileText className="w-3.5 h-3.5 text-[#525252]" />
              </div>
              <p className="text-xs text-[#111111] truncate font-medium">{props.docxFileName}</p>
            </div>
            <div className="flex items-center justify-end px-4 py-2">
              {props.hasDocxExtraction && props.entries.length > 0 && (
                <button
                  onClick={props.handleDownloadDocx}
                  disabled={props.downloading}
                  className="flex items-center gap-2 px-3 py-1.5 border border-[#C8C5BC] bg-[#FFFFFF] text-[#111111] hover:bg-[#111111] hover:text-[#F9F9F7] hover:border-[#111111] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium"
                >
                  <Download className="w-3 h-3" /> {t.textOutput.downloadDocx}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Document panels */}
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-0 border border-[#A8A498] bg-[#FFFFFF] shadow-[0_2px_24px_-6px_rgba(17,17,17,0.08)] ${props.docxFileName && props.anonymizedText ? 'border-t-0' : ''}`}>
          <div className="md:border-r border-[#C8C5BC] bg-[#FFFFFF] flex flex-col">
            <TextInput
              value={props.inputText}
              onChange={props.handleInputChange}
              onClear={props.handleClear}
              entities={props.entities}
              onAddEntity={props.addManualEntity}
              onRemoveEntity={props.removeEntity}
              docxFileName={props.docxFileName}
              onLoadDocx={props.loadDocxFile}
              onRemoveDocx={props.removeDocxFile}
            />
          </div>
          <div className="bg-[#FFFFFF] border-t md:border-t-0 border-[#C8C5BC] flex flex-col">
            <TextOutput value={props.anonymizedText} entries={props.entries} loading={props.anonymizing} />
          </div>
        </div>

        {/* Redact button */}
        <div className="sticky bottom-0 z-30 bg-[#F9F9F7] py-4 -mx-6 px-6">
          <div className="flex flex-col items-center gap-2">
            <div className="w-full border-t border-[#E5E5E0]" />
            <Button
              onClick={props.anonymize}
              disabled={!props.inputText.trim() || props.anonymizing}
              size="lg"
              className="gap-2 px-12 py-4 text-sm uppercase tracking-[0.15em] font-semibold bg-[#111111] text-[#F9F9F7] hover:bg-[#222222] hover:text-[#F9F9F7] transition-colors disabled:bg-[#111111]/55 disabled:text-[#F9F9F7] disabled:cursor-not-allowed"
            >
              {props.anonymizing ? t.redactButton.redacting : <>{t.redactButton.redact} <ArrowRight className="w-4 h-4" /></>}
            </Button>
            <p className="label-meta text-muted-foreground/50">{t.redactButton.shortcutHint}</p>
            <div className="w-full border-t border-[#E5E5E0]" />
            {props.detectionError && (
              <div className="max-w-lg w-full border-2 border-[#CC0000] bg-[#CC0000]/5 p-4 text-center">
                <p className="text-sm font-sans font-semibold text-[#CC0000] uppercase tracking-wider">Detection failed</p>
                <p className="text-xs text-[#525252] mt-1.5">The model could not process this text. Please try again or refresh the page.</p>
              </div>
            )}
          </div>
        </div>

        {/* Entity table */}
        {props.replacementMode === 'labeled' && (
          <EntityTable
            entities={props.entities}
            entries={props.entries}
            excludedIndices={props.excludedIndices}
            onToggle={props.toggleEntity}
            onRenameLabel={props.renameLabel}
          />
        )}

        {/* De-anonymize */}
        {props.replacementMode === 'labeled' && props.entries.length > 0 && (
          <div className="mt-12">
            <div className="py-6 text-center font-serif text-xl text-[#E5E5E0] tracking-[1em] select-none">&#10043; &#10043; &#10043;</div>
            <div className="mb-2">
              <div className="flex items-baseline gap-3">
                <span className="font-serif text-lg font-bold text-[#111111] uppercase tracking-tight">02</span>
                <div>
                  <h2 className="font-serif text-lg font-bold text-[#111111] uppercase tracking-tight leading-tight">{t.step2.title}</h2>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{t.step2.description}</p>
                  <p className="text-xs text-muted-foreground/60 mt-1 leading-relaxed italic">{t.step2.example}</p>
                </div>
              </div>
            </div>
            <div className="border-b border-[#E5E5E0] mb-6" />
            <DeAnonymize onDeanonymize={props.deanonymize} hasMapping={props.entries.length > 0} />
          </div>
        )}
      </div>
    </div>
  );
}
