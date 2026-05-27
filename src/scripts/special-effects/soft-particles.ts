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

export function start({ effect, element, reducedMotion }: EffectInitContext): void | (() => void) {
  if (reducedMotion) return;
  if (element.dataset.softParticlesInit === '1') return;
  element.dataset.softParticlesInit = '1';
  element.classList.add('effect-special-soft-particles');
  const density = Math.max(4, Math.min(80, parseNumber(effect.params?.density, 18)));
  const size = Math.max(2, Math.min(16, parseNumber(effect.params?.size, 6)));
  const color = parseHexColor(effect.params?.color, '#ffd84d');

  const layer = document.createElement('span');
  layer.className = 'effect-particles-layer';
  layer.setAttribute('aria-hidden', 'true');
  element.appendChild(layer);

  for (let i = 0; i < density; i += 1) {
    const particle = document.createElement('span');
    particle.className = 'effect-particle';
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.top = `${Math.random() * 100}%`;
    particle.style.width = `${size * (0.5 + Math.random())}px`;
    particle.style.height = particle.style.width;
    particle.style.background = color;
    particle.style.animationDelay = `${Math.random() * 2500}ms`;
    particle.style.animationDuration = `${3200 + (Math.random() * 2600)}ms`;
    layer.appendChild(particle);
  }

  return () => {
    if (layer.parentElement === element) element.removeChild(layer);
    delete element.dataset.softParticlesInit;
  };
}
