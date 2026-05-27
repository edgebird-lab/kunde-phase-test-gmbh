import type { EffectDefinition } from '../../lib/effects';

type EffectInitContext = { effect: EffectDefinition; element: HTMLElement; reducedMotion: boolean };

export function start({ effect, reducedMotion }: EffectInitContext): () => void {
  if (reducedMotion) return () => {};

  const density = Math.min(80, Math.max(5, Number(effect.params?.density ?? 30)));
  const colors = ['#ffb7c5', '#ff91a8', '#ffd1dc', '#ff6b8e', '#ffe4ec'];

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

  type Petal = { x: number; y: number; size: number; speed: number; wind: number; angle: number; spin: number; color: string };
  const petals: Petal[] = Array.from({ length: density }, () => ({
    x: Math.random() * W,
    y: Math.random() * H - H,
    size: 4 + Math.random() * 8,
    speed: 1.2 + Math.random() * 2,
    wind: (Math.random() - 0.5) * 1.5,
    angle: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.06,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));

  let raf = 0;
  const draw = () => {
    ctx.clearRect(0, 0, W, H);
    for (const p of petals) {
      p.y += p.speed;
      p.x += p.wind;
      p.angle += p.spin;
      if (p.y > H + 20) { p.y = -20; p.x = Math.random() * W; }
      if (p.x > W + 20) p.x = -20;
      if (p.x < -20) p.x = W + 20;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
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
