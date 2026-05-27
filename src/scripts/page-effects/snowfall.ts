import type { EffectDefinition } from '../../lib/effects';

type EffectInitContext = { effect: EffectDefinition; element: HTMLElement; reducedMotion: boolean };

export function start({ effect, reducedMotion }: EffectInitContext): () => void {
  if (reducedMotion) return () => {};

  const density = Math.min(120, Math.max(10, Number(effect.params?.density ?? 50)));
  const color = typeof effect.params?.color === 'string' ? effect.params.color : '#ffffff';

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9998;';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d')!;
  let W = window.innerWidth, H = window.innerHeight;
  canvas.width = W; canvas.height = H;

  const onResize = () => {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W; canvas.height = H;
  };
  window.addEventListener('resize', onResize);

  type Flake = { x: number; y: number; r: number; speed: number; drift: number; opacity: number };
  const flakes: Flake[] = Array.from({ length: density }, () => ({
    x: Math.random() * W,
    y: Math.random() * H - H,
    r: 1.5 + Math.random() * 3.5,
    speed: 0.6 + Math.random() * 1.8,
    drift: (Math.random() - 0.5) * 0.8,
    opacity: 0.3 + Math.random() * 0.7,
  }));

  let raf = 0;
  const draw = () => {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = color;
    for (const f of flakes) {
      f.y += f.speed;
      f.x += f.drift;
      if (f.y > H + 10) { f.y = -10; f.x = Math.random() * W; }
      ctx.globalAlpha = f.opacity;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
    raf = requestAnimationFrame(draw);
  };
  draw();

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', onResize);
    canvas.remove();
  };
}
