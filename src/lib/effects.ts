export const EFFECT_TYPE_CATALOG = [
  'text-reveal-mask-up',
  'text-stagger-words',
  'text-typewriter',
  'text-fade-up',
  'text-highlight-words',
  'text-blur-in',
  'structure-parallax-scroll',
  'structure-parallax-sticky',
  'structure-sticky-reveal',
  'structure-zoom-on-scroll',
  'structure-slide-in',
  'structure-tilt-hover',
  'structure-bounce-in',
  'special-laser-scan',
  'special-soft-particles',
  'special-glow-pulse',
  'special-magnetic-hover',
  'special-confetti-burst',
  'text-word-shadow',
  'page-cherry-blossom',
  'page-snowfall',
  'page-fireflies',
  'page-soft-particles',
] as const;

export type EffectType = (typeof EFFECT_TYPE_CATALOG)[number];

export const EFFECT_TRIGGER_CATALOG = [
  'in-view',
  'on-load',
  'on-hover',
  'scroll-progress',
] as const;

export type EffectTrigger = (typeof EFFECT_TRIGGER_CATALOG)[number];

export interface EffectDefinition {
  type: EffectType | string;
  trigger?: EffectTrigger;
  duration?: number;
  delay?: number;
  easing?: string;
  once?: boolean;
  enabled?: boolean;
  params?: Record<string, unknown>;
}

export interface EffectTarget {
  effects?: EffectDefinition[];
}

export const EFFECT_TYPES = new Set<string>(EFFECT_TYPE_CATALOG);
export const EFFECT_TRIGGERS = new Set<string>(EFFECT_TRIGGER_CATALOG);

export const DEFAULT_EFFECT_OPTIONS = {
  trigger: 'in-view' as EffectTrigger,
  duration: 600,
  delay: 0,
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  once: true,
} as const;

export function toEffectDatasetValue(effects: EffectDefinition[] | undefined): string | null {
  if (!Array.isArray(effects) || effects.length === 0) return null;
  return JSON.stringify(effects);
}

export function parseEffectDatasetValue(raw: string | null | undefined): EffectDefinition[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as EffectDefinition[]) : [];
  } catch {
    return [];
  }
}

function toFiniteNonNegative(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

function normalizeTrigger(value: unknown): EffectTrigger {
  const t = String(value || '').trim();
  return EFFECT_TRIGGERS.has(t) ? (t as EffectTrigger) : DEFAULT_EFFECT_OPTIONS.trigger;
}

export function normalizeEffect(effect: EffectDefinition): EffectDefinition {
  const normalizedType = String(effect.type || '').trim();
  const isPageAmbient = normalizedType.startsWith('page-');
  const normalized: EffectDefinition = {
    type: normalizedType,
    trigger: isPageAmbient ? 'on-load' : normalizeTrigger(effect.trigger),
    duration: toFiniteNonNegative(effect.duration, DEFAULT_EFFECT_OPTIONS.duration),
    delay: toFiniteNonNegative(effect.delay, DEFAULT_EFFECT_OPTIONS.delay),
    easing: typeof effect.easing === 'string' && effect.easing.trim()
      ? effect.easing.trim()
      : DEFAULT_EFFECT_OPTIONS.easing,
    once: isPageAmbient
      ? false
      : (typeof effect.once === 'boolean' ? effect.once : DEFAULT_EFFECT_OPTIONS.once),
    params: (effect.params && typeof effect.params === 'object' && !Array.isArray(effect.params))
      ? effect.params
      : {},
  };
  if (effect.enabled === false) {
    normalized.enabled = false;
  }
  return normalized;
}

export function normalizeEffects(effects: EffectDefinition[] | undefined): EffectDefinition[] {
  if (!Array.isArray(effects)) return [];
  return effects
    .filter((effect) => !!effect && typeof effect === 'object')
    .map((effect) => normalizeEffect(effect))
    .filter((effect) => !!effect.type);
}
