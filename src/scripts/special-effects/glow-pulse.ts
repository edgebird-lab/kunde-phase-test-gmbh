type EffectDefinition = {
  params?: Record<string, unknown>;
};

type EffectInitContext = {
  effect: EffectDefinition;
  element: HTMLElement;
  reducedMotion: boolean;
};

function parseNumber(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseHexColor(value: unknown, fallback: string): string {
  const s = String(value || '').trim();
  return /^#([0-9a-fA-F]{6})$/.test(s) ? s : fallback;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function start({ effect, element, reducedMotion }: EffectInitContext): void | (() => void) {
  if (reducedMotion) return;
  if (element.dataset.glowPulseInit === '1') return;
  element.dataset.glowPulseInit = '1';
  element.classList.add('effect-special-glow-pulse');

  const color = parseHexColor(effect.params?.color, '#ffd84d');
  const intensity = Math.max(0.3, Math.min(1.0, parseNumber(effect.params?.intensity, 0.6)));
  const speedKey = String(effect.params?.speed || 'normal');
  const speedMs = speedKey === 'slow' ? 2800 : speedKey === 'fast' ? 1000 : 1800;

  element.style.setProperty('--glow-color-fade', hexToRgba(color, intensity));
  element.style.setProperty('--glow-speed-ms', `${speedMs}ms`);
  element.classList.add('effect-glow-pulsing');

  return () => {
    element.classList.remove('effect-glow-pulsing');
    element.style.removeProperty('--glow-color-fade');
    element.style.removeProperty('--glow-speed-ms');
    delete element.dataset.glowPulseInit;
  };
}
