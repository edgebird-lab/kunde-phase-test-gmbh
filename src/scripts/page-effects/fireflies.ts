import type { EffectDefinition } from '../../lib/effects';

type EffectInitContext = { effect: EffectDefinition; element: HTMLElement; reducedMotion: boolean };

export function start({ effect, reducedMotion }: EffectInitContext): () => void {
  if (reducedMotion) return () => {};

  const density = Math.min(60, Math.max(5, Number(effect.params?.density ?? 20)));
  const color = typeof effect.params?.color === 'string' ? effect.params.color : '#aaff55';

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

  type Fly = { x: number; y: number; vx: number; vy: number; phase: number; phaseSpeed: number; r: number };
  const flies: Fly[] = Array.from({ length: density }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    vx: (Math.random() - 0.5) * 0.6,
    vy: (Math.random() - 0.5) * 0.6,
    phase: Math.random() * Math.PI * 2,
    phaseSpeed: 0.02 + Math.random() * 0.04,
    r: 2 + Math.random() * 2.5,
  }));

  let raf = 0;
  const draw = () => {
    ctx.clearRect(0, 0, W, H);
    for (const f of flies) {
      f.x += f.vx + Math.sin(f.phase * 0.7) * 0.3;
      f.y += f.vy + Math.cos(f.phase * 0.5) * 0.3;
      f.phase += f.phaseSpeed;
      if (f.x < 0) f.x = W;
      if (f.x > W) f.x = 0;
      if (f.y < 0) f.y = H;
      if (f.y > H) f.y = 0;

      const glow = Math.abs(Math.sin(f.phase));
      ctx.save();
      const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 4);
      grad.addColorStop(0, color);
      grad.addColorStop(1, 'transparent');
      ctx.globalAlpha = glow * 0.9;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = glow;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * 0.5, 0, Math.PI * 2);
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
