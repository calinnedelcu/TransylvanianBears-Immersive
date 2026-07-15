import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGS, type Lang } from '../../i18n';
import { useCapeSweepTrigger } from './CapeSweepProvider';

export function LanguageToggle() {
  const { t, i18n } = useTranslation();
  const sweep = useCapeSweepTrigger();

  const current = (i18n.language?.split('-')[0] ?? 'ro') as Lang;

  const setLang = (lang: Lang) => {
    if (lang === current) return;
    sweep(() => {
      void i18n.changeLanguage(lang);
    });
  };

  return (
    <div
      role="group"
      aria-label={t('common.languageGroup')}
      className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest"
    >
      {SUPPORTED_LANGS.map((l, i) => (
        <span key={l} className="flex items-center gap-2">
          {i > 0 && <span className="text-bear-bone/30">|</span>}
          <button
            type="button"
            onClick={() => setLang(l)}
            aria-pressed={current === l}
            className={
              current === l
                ? 'text-bear-gold transition-colors'
                : 'text-bear-bone/50 hover:text-bear-bone transition-colors'
            }
          >
            {l}
          </button>
        </span>
      ))}
    </div>
  );
}
