type EffectDefinition = {
  duration?: number;
  delay?: number;
  easing?: string;
  once?: boolean;
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

export function start({ effect, element, reducedMotion }: EffectInitContext): void | (() => void) {
  if (reducedMotion) return;
  if (element.dataset.laserScanInit === '1') return;
  element.dataset.laserScanInit = '1';
  element.classList.add('effect-special-laser-scan');
  const textTargets = Array.from(element.querySelectorAll<HTMLElement>('h1,h2,h3,h4,h5,h6,p,li,span,strong,em,a,[data-effect-text]'));
  const anchor = textTargets.find((el) => (el.textContent || '').trim().length > 0) || null;
  if (!anchor && !(element.textContent || '').trim()) {
    delete element.dataset.laserScanInit;
    return;
  }
  const beam = document.createElement('span');
  beam.className = 'effect-laser-beam';
  beam.setAttribute('aria-hidden', 'true');
  (anchor || element).appendChild(beam);

  const intensity = Math.min(1, Math.max(0.4, parseNumber(effect.params?.intensity, 0.9)));
  beam.style.setProperty('--laser-intensity', intensity.toFixed(2));
  const color = parseHexColor(effect.params?.color, '#ff2a2a');
  beam.style.setProperty('--laser-color', color);
  const thickness = Math.min(8, Math.max(1, parseNumber(effect.params?.thickness, 3)));
  beam.style.setProperty('--laser-thickness', `${thickness}px`);
  const direction = String(effect.params?.direction || 'ltr') === 'rtl' ? 'rtl' : 'ltr';
  beam.style.setProperty('--laser-from', direction === 'rtl' ? '120%' : '-120%');
  beam.style.setProperty('--laser-to', direction === 'rtl' ? '-120%' : '120%');
  const travel = String(effect.params?.travel || 'edge') === 'text' ? 'text' : 'edge';
  beam.classList.toggle('effect-laser-beam--text', travel === 'text');
  const textLen = ((anchor || element).textContent || '').trim().length;
  const duration = Math.max(7875, parseNumber(effect.duration, 15750), textLen * 405);
  const delay = parseNumber(effect.delay, 0);
  const easing = String(effect.easing || 'cubic-bezier(0.22, 1, 0.36, 1)');

  const run = () => {
    beam.animate(
      [{ transform: 'translateX(var(--laser-from, -120%))' }, { transform: 'translateX(var(--laser-to, 120%))' }],
      { duration, delay, easing, fill: 'none' },
    );
  };

  let intervalId: number | null = null;
  if (effect.once === false) {
    run();
    intervalId = window.setInterval(run, Math.max(duration + 900, 3600));
  } else {
    run();
  }

  return () => {
    if (intervalId != null) window.clearInterval(intervalId);
    if (beam.parentElement) beam.parentElement.removeChild(beam);
    delete element.dataset.laserScanInit;
  };
}
