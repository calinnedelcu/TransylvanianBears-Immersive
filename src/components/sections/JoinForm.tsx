import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';

type JoinFormProps = {
  open: boolean;
  onClose: () => void;
  /** Recipient email address; mailto target. */
  recipient: string;
};

type FormState = {
  name: string;
  school: string;
  email: string;
  motivation: string;
};

const EMPTY: FormState = { name: '', school: '', email: '', motivation: '' };

export function JoinForm({ open, onClose, recipient }: JoinFormProps) {
  const { t } = useTranslation();
  const [values, setValues] = useState<FormState>(EMPTY);
  const [submitted, setSubmitted] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);
  const formId = useId();

  // ESC closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Focus first field on open
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => firstFieldRef.current?.focus(), 60);
    return () => window.clearTimeout(id);
  }, [open]);

  // Reset state when closed
  useEffect(() => {
    if (!open) {
      setSubmitted(false);
      setValues(EMPTY);
    }
  }, [open]);

  const update = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);
    if (!values.name.trim() || !values.school.trim() || !values.email.trim() || !values.motivation.trim()) {
      return;
    }
    const body = [
      `${t('join.form.mailNameRow')}: ${values.name}`,
      `${t('join.form.mailSchoolRow')}: ${values.school}`,
      `${t('join.form.mailEmailRow')}: ${values.email}`,
      '',
      `${t('join.form.mailMotivationRow')}:`,
      values.motivation,
    ].join('\n');
    const mailto = `mailto:${recipient}?subject=${encodeURIComponent(t('join.mailSubject'))}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    // Close after a short delay so the mail client has time to launch
    window.setTimeout(onClose, 300);
  };

  if (typeof document === 'undefined') return null;
  if (!open) return null;

  return createPortal(
    <motion.div
      key="join-form-modal"
      className="fixed inset-0 z-[120] flex items-center justify-center px-4 py-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${formId}-title`}
    >
          {/* Backdrop */}
          <button
            type="button"
            aria-label={t('join.form.close')}
            onClick={onClose}
            className="absolute inset-0 bg-bear-night/85 backdrop-blur-md cursor-default"
          />

          {/* Card */}
          <motion.div
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-lg
              border border-bear-burgundy/60 bg-bear-night
              shadow-[0_30px_80px_rgba(74,14,31,0.55)]"
            initial={{ y: 24, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 16, opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Decorative gold border accent */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-bear-gold/70 to-transparent"
            />

            {/* Close X */}
            <button
              type="button"
              onClick={onClose}
              aria-label={t('join.form.close')}
              className="absolute right-3 top-3 rounded-full p-2 text-bear-bone/70
                hover:text-bear-gold hover:bg-bear-burgundy/40 transition-colors
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bear-gold"
            >
              <X className="h-4 w-4" />
            </button>

            <form onSubmit={handleSubmit} className="px-6 pt-7 pb-6 md:px-8 md:pt-8 md:pb-7" noValidate>
              <h2
                id={`${formId}-title`}
                className="font-display text-2xl md:text-3xl text-bear-bone leading-tight mb-1"
              >
                {t('join.form.title')}
              </h2>
              <p className="text-bear-bone/65 text-sm mb-6 leading-relaxed">
                {t('join.form.subtitle')}
              </p>

              <div className="space-y-4">
                <Field
                  id={`${formId}-name`}
                  label={t('join.form.nameLabel')}
                  required
                  showError={submitted && !values.name.trim()}
                  errorText={t('join.form.required')}
                >
                  <input
                    ref={firstFieldRef}
                    id={`${formId}-name`}
                    type="text"
                    value={values.name}
                    onChange={update('name')}
                    placeholder={t('join.form.namePlaceholder')}
                    autoComplete="name"
                    className={inputCls}
                  />
                </Field>

                <Field
                  id={`${formId}-school`}
                  label={t('join.form.schoolLabel')}
                  required
                  showError={submitted && !values.school.trim()}
                  errorText={t('join.form.required')}
                >
                  <input
                    id={`${formId}-school`}
                    type="text"
                    value={values.school}
                    onChange={update('school')}
                    placeholder={t('join.form.schoolPlaceholder')}
                    className={inputCls}
                  />
                </Field>

                <Field
                  id={`${formId}-email`}
                  label={t('join.form.emailLabel')}
                  required
                  showError={submitted && !values.email.trim()}
                  errorText={t('join.form.required')}
                >
                  <input
                    id={`${formId}-email`}
                    type="email"
                    value={values.email}
                    onChange={update('email')}
                    placeholder={t('join.form.emailPlaceholder')}
                    autoComplete="email"
                    className={inputCls}
                  />
                </Field>

                <Field
                  id={`${formId}-motivation`}
                  label={t('join.form.motivationLabel')}
                  required
                  showError={submitted && !values.motivation.trim()}
                  errorText={t('join.form.required')}
                >
                  <textarea
                    id={`${formId}-motivation`}
                    value={values.motivation}
                    onChange={update('motivation')}
                    placeholder={t('join.form.motivationPlaceholder')}
                    rows={4}
                    className={`${inputCls} resize-none`}
                  />
                </Field>
              </div>

              <div className="mt-7 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3">
                <Button type="button" variant="ghost" size="md" onClick={onClose}>
                  {t('join.form.cancel')}
                </Button>
                <Button type="submit" variant="primary" size="md">
                  {t('join.form.submit')}
                </Button>
              </div>
            </form>
          </motion.div>
    </motion.div>,
    document.body,
  );
}

const inputCls =
  'w-full rounded-md bg-bear-night/60 border border-bear-burgundy/50 px-3.5 py-2.5 ' +
  'text-bear-bone text-[15px] placeholder:text-bear-bone/35 ' +
  'transition-colors focus:outline-none focus:border-bear-gold/70 focus:bg-bear-night/80 ' +
  'hover:border-bear-burgundy/70';

type FieldProps = {
  id: string;
  label: string;
  required?: boolean;
  showError?: boolean;
  errorText?: string;
  children: React.ReactNode;
};

function Field({ id, label, required, showError, errorText, children }: FieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block font-mono text-[10px] uppercase tracking-[0.22em] text-bear-gold/80 mb-1.5"
      >
        {label}
        {required && <span className="text-bear-gold ml-1">*</span>}
      </label>
      {children}
      {showError && errorText && (
        <p className="mt-1 text-[11px] text-bear-bone/60 italic">{errorText}</p>
      )}
    </div>
  );
}
