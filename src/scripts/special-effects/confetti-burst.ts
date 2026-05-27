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

const DEFAULT_COLORS = ['#ff3b30', '#ffd84d', '#34c759', '#007aff', '#ff9500', '#af52de'];

function parseColors(value: unknown): string[] {
  if (!Array.isArray(value)) return DEFAULT_COLORS;
  const valid = value.filter((c) => typeof c === 'string' && /^#([0-9a-fA-F]{6})$/.test(c.trim()));
  return valid.length > 0 ? valid : DEFAULT_COLORS;
}

export function start({ effect, element, reducedMotion }: EffectInitContext): void | (() => void) {
  if (reducedMotion) return;
  element.classList.add('effect-special-confetti-burst');

  const density = Math.max(5, Math.min(60, parseNumber(effect.params?.density, 24)));
  const spreadDeg = Math.max(60, Math.min(180, parseNumber(effect.params?.spread, 120)));
  const colors = parseColors(effect.params?.colors);
  const particles: HTMLElement[] = [];

  const burst = () => {
    for (let i = 0; i < density; i++) {
      const particle = document.createElement('span');
      particle.className = 'effect-confetti-particle';
      particle.setAttribute('aria-hidden', 'true');

      const color = colors[Math.floor(Math.random() * colors.length)];
      particle.style.background = color;

      const angle = (Math.random() * spreadDeg - spreadDeg / 2) - 90;
      const rad = (angle * Math.PI) / 180;
      const dist = 40 + Math.random() * 80;
      const cx = Math.cos(rad) * dist;
      const cy = Math.sin(rad) * dist;
      const cr = `${Math.random() * 720 - 360}deg`;

      particle.style.setProperty('--cx', `${cx}px`);
      particle.style.setProperty('--cy', `${cy}px`);
      particle.style.setProperty('--cr', cr);
      particle.style.animationDelay = `${Math.random() * 150}ms`;
      particle.style.width = `${5 + Math.random() * 6}px`;
      particle.style.height = `${4 + Math.random() * 5}px`;

      element.appendChild(particle);
      particles.push(particle);
    }

    window.setTimeout(() => {
      for (const p of particles) {
        if (p.parentElement === element) element.removeChild(p);
      }
      particles.length = 0;
    }, 1600);
  };

  burst();

  return () => {
    for (const p of particles) {
      if (p.parentElement === element) element.removeChild(p);
    }
    particles.length = 0;
  };
}
