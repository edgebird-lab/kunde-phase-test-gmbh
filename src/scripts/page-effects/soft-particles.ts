import type { EffectDefinition } from '../../lib/effects';

type EffectInitContext = { effect: EffectDefinition; element: HTMLElement; reducedMotion: boolean };

export function start({ effect, reducedMotion }: EffectInitContext): () => void {
  if (reducedMotion) return () => {};

  const density = Math.min(80, Math.max(4, Number(effect.params?.density ?? 18)));
  const size = Math.min(24, Math.max(2, Number(effect.params?.size ?? 6)));
  const color = typeof effect.params?.color === 'string' ? effect.params.color : '#ffd84d';

  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9998;overflow:hidden;';
  document.body.appendChild(container);

  for (let i = 0; i < density; i++) {
    const p = document.createElement('span');
    const x = Math.random() * 100;
    const y = Math.random() * 100;
    const dur = 3200 + Math.random() * 2600;
    const delay = Math.random() * -5000;
    p.style.cssText = `
      position:absolute;
      left:${x}%;top:${y}%;
      width:${size}px;height:${size}px;
      border-radius:50%;
      background:${color};
      opacity:0;
      animation:odv4-soft-particle ${dur}ms ${delay}ms ease-in-out infinite;
    `;
    container.appendChild(p);
  }

  const style = document.createElement('style');
  style.id = 'odv4-page-soft-particles-css';
  style.textContent = `
    @keyframes odv4-soft-particle {
      0%,100% { opacity:0; transform:translateY(0) scale(1); }
      25% { opacity:0.55; }
      50% { opacity:0.3; transform:translateY(-18px) scale(1.15); }
      75% { opacity:0.55; }
    }
  `;
  if (!document.getElementById('odv4-page-soft-particles-css')) {
    document.head.appendChild(style);
  }

  return () => {
    container.remove();
    document.getElementById('odv4-page-soft-particles-css')?.remove();
  };
}
