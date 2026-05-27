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

export function start({ effect, element, reducedMotion }: EffectInitContext): void | (() => void) {
  if (reducedMotion) return;
  if (element.dataset.magneticHoverInit === '1') return;
  element.dataset.magneticHoverInit = '1';
  element.classList.add('effect-special-magnetic-hover');

  const strength = Math.max(0.05, Math.min(0.5, parseNumber(effect.params?.strength, 0.25)));
  const range = Math.max(50, Math.min(300, parseNumber(effect.params?.range, 150)));

  const onMove = (e: MouseEvent) => {
    const rect = element.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > range) {
      element.style.transform = 'translate(0, 0)';
      return;
    }
    const factor = (1 - dist / range) * strength;
    element.style.transform = `translate(${dx * factor}px, ${dy * factor}px)`;
  };

  const onLeave = () => {
    element.style.transform = 'translate(0, 0)';
  };

  element.addEventListener('mousemove', onMove);
  element.addEventListener('mouseleave', onLeave);

  return () => {
    element.removeEventListener('mousemove', onMove);
    element.removeEventListener('mouseleave', onLeave);
    element.style.removeProperty('transform');
    delete element.dataset.magneticHoverInit;
  };
}
