import { normalizeEffects, parseEffectDatasetValue, type EffectDefinition } from '../lib/effects';

type EffectInitContext = {
  effect: EffectDefinition;
  element: HTMLElement;
  reducedMotion: boolean;
};

type EffectInitializer = (ctx: EffectInitContext) => void;
type EffectCleanup = void | (() => void);
type SpecialEffectModule = { start: (ctx: EffectInitContext) => EffectCleanup | Promise<EffectCleanup> };
type IoCallbackEntry = { fn: () => void; once: boolean };
const cleanupCallbacks = new Map<HTMLElement, Array<() => void>>();
/** Per-element → per IntersectionObserver threshold (callbacks must not bleed across thresholds). */
const ioCallbacks = new Map<HTMLElement, Map<number, IoCallbackEntry[]>>();
const observerByThreshold = new Map<number, IntersectionObserver>();
const scrollProgressNodes = new Set<HTMLElement>();

let scrollBound = false;
let scrollTicking = false;

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getEffectNodes(root: ParentNode): HTMLElement[] {
  if (root === document) return Array.from(document.querySelectorAll<HTMLElement>('[data-effects]'));
  return Array.from(root.querySelectorAll<HTMLElement>('[data-effects]'));
}

function addCleanup(element: HTMLElement, cleanup: () => void): void {
  const list = cleanupCallbacks.get(element) || [];
  list.push(cleanup);
  cleanupCallbacks.set(element, list);
}

function getDuration(effect: EffectDefinition): number {
  return Number(effect.duration ?? 600);
}

function getDelay(effect: EffectDefinition): number {
  return Number(effect.delay ?? 0);
}

function getEasing(effect: EffectDefinition): string {
  return String(effect.easing || 'cubic-bezier(0.22, 1, 0.36, 1)');
}

function parseNumberParam(effect: EffectDefinition, key: string, fallback: number): number {
  const raw = effect.params?.[key];
  const n = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function toThreshold(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(1, Math.max(0, value));
}

function ensureScrollBinding(): void {
  if (scrollBound) return;
  const onScroll = () => {
    if (scrollTicking) return;
    scrollTicking = true;
    window.requestAnimationFrame(() => {
      for (const element of scrollProgressNodes) {
        const rect = element.getBoundingClientRect();
        const total = window.innerHeight + rect.height;
        const progress = Math.min(1, Math.max(0, (window.innerHeight - rect.top) / total));
        element.style.setProperty('--effect-scroll-progress', progress.toFixed(3));
      }
      scrollTicking = false;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  scrollBound = true;
}

function runWhenInView(
  element: HTMLElement,
  threshold: number,
  once: boolean,
  fn: () => void,
): void {
  let byEl = ioCallbacks.get(element);
  if (!byEl) {
    byEl = new Map();
    ioCallbacks.set(element, byEl);
  }
  const list = byEl.get(threshold) ?? [];
  const ioEntry: IoCallbackEntry = { fn, once };
  list.push(ioEntry);
  byEl.set(threshold, list);

  const existingObs = observerByThreshold.get(threshold);
  const observer =
    existingObs ||
    new IntersectionObserver((entries) => {
      for (const ioEntryOuter of entries) {
        const target = ioEntryOuter.target as HTMLElement;
        if (!ioEntryOuter.isIntersecting) continue;
        const map = ioCallbacks.get(target);
        const callbacks = map?.get(threshold);
        if (!callbacks?.length) continue;

        const keep: IoCallbackEntry[] = [];
        for (const cb of callbacks) {
          cb.fn();
          if (!cb.once) keep.push(cb);
        }

        if (keep.length) {
          map!.set(threshold, keep);
        } else {
          map!.delete(threshold);
          if (map!.size === 0) ioCallbacks.delete(target);
          observer.unobserve(target);
        }
      }
    }, { threshold });
  if (!existingObs) observerByThreshold.set(threshold, observer);

  observer.observe(element);
  addCleanup(element, () => {
    const map = ioCallbacks.get(element);
    const arr = map?.get(threshold);
    if (!arr) return;
    const idx = arr.indexOf(ioEntry);
    if (idx >= 0) arr.splice(idx, 1);
    if (arr.length === 0) {
      map!.delete(threshold);
      observer.unobserve(element);
      if (map!.size === 0) ioCallbacks.delete(element);
    }
  });
}

function runByTrigger(
  element: HTMLElement,
  effect: EffectDefinition,
  run: () => void,
  defaultThreshold = 0.2,
): void {
  if (effect.trigger === 'in-view') {
    const threshold = toThreshold(parseNumberParam(effect, 'threshold', defaultThreshold), defaultThreshold);
    runWhenInView(
      element,
      threshold,
      effect.once !== false,
      run,
    );
    return;
  }
  if (effect.trigger === 'on-hover') {
    const onEnter = () => run();
    element.addEventListener('mouseenter', onEnter);
    addCleanup(element, () => element.removeEventListener('mouseenter', onEnter));
    return;
  }
  if (effect.trigger === 'scroll-progress') {
    const onScrollProgress = () => run();
    scrollProgressNodes.add(element);
    ensureScrollBinding();
    onScrollProgress();
    return;
  }
  run();
}

function animateOnLoad(element: HTMLElement, keyframes: Keyframe[], effect: EffectDefinition): void {
  element.animate(keyframes, {
    duration: getDuration(effect),
    delay: getDelay(effect),
    easing: getEasing(effect),
    fill: 'forwards',
  });
}

function applyTextRevealMaskUp({ effect, element, reducedMotion }: EffectInitContext): void {
  if (reducedMotion) {
    element.classList.add('effect-ready');
    return;
  }
  element.classList.add('effect-text-reveal-mask-up');
  element.style.opacity = '0';
  element.style.transform = 'translateY(15rem)';
  const revealDuration = Math.max(1200, getDuration(effect));
  const revealEffect = { ...effect, duration: revealDuration };
  const run = () => animateOnLoad(element, [
    { opacity: 0, transform: 'translateY(15rem)' },
    { opacity: 1, transform: 'translateY(0)' },
  ], revealEffect);
  runByTrigger(element, effect, run, 0.2);
}

function applyTextStaggerWords({ effect, element, reducedMotion }: EffectInitContext): void {
  if (reducedMotion) {
    element.classList.add('effect-ready');
    return;
  }
  const stagger = parseNumberParam(effect, 'stagger', 70);
  const targets = getTextTargets(element);
  let globalWordIndex = 0;
  for (const target of targets) {
    const text = (target.textContent || '').trim();
    if (!text) continue;
    const words = text.split(/\s+/);
    const startIndex = globalWordIndex;
    globalWordIndex += words.length;
    target.innerHTML = '';
    for (const word of words) {
      const span = document.createElement('span');
      span.className = 'effect-stagger-word';
      span.textContent = word;
      span.style.display = 'inline-block';
      target.appendChild(span);
      target.appendChild(document.createTextNode(' '));
    }
    const run = () => {
      const spans = Array.from(target.querySelectorAll<HTMLElement>('.effect-stagger-word'));
      spans.forEach((span, index) => {
        span.animate([
          { opacity: 0, transform: 'translateY(2.5rem) rotate(-4deg)' },
          { opacity: 1, transform: 'translateY(0) rotate(0)' },
        ], {
          duration: getDuration(effect),
          delay: getDelay(effect) + ((startIndex + index) * stagger),
          easing: getEasing(effect),
          fill: 'forwards',
        });
      });
    };
    runByTrigger(element, effect, run, 0.15);
  }
}

function applyTextTypewriter({ effect, element, reducedMotion }: EffectInitContext): void {
  if (reducedMotion) return;
  const charsPerSecond = Math.max(2, parseNumberParam(effect, 'charsPerSecond', 8));
  const targets = getTextTargets(element);
  let cumulativeDelay = getDelay(effect);
  for (const target of targets) {
    const original = target.textContent || '';
    if (!original.trim()) continue;
    const delay = cumulativeDelay;
    const intervalMs = Math.floor(1000 / charsPerSecond);
    cumulativeDelay += original.length * intervalMs + 200;
    const run = () => {
      let cursor = 0;
      target.textContent = '';
      const timer = window.setInterval(() => {
        cursor += 1;
        target.textContent = original.slice(0, cursor);
        if (cursor >= original.length) window.clearInterval(timer);
      }, intervalMs);
      addCleanup(element, () => window.clearInterval(timer));
    };
    runByTrigger(element, { ...effect, delay }, run, 0.2);
  }
}

function applyStructureParallax({ effect, element, reducedMotion }: EffectInitContext): void {
  if (reducedMotion) return;
  element.classList.add('effect-structure-parallax-scroll');
  const speed = parseNumberParam(effect, 'speed', 0.16);
  const update = () => {
    const rect = element.getBoundingClientRect();
    const y = (window.innerHeight - rect.top) * speed;
    element.style.setProperty('--effect-parallax-y', `${Math.round(y)}px`);
  };
  update();
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  addCleanup(element, () => {
    window.removeEventListener('scroll', update);
    window.removeEventListener('resize', update);
  });
}

function applyStructureStickyReveal({ effect, element, reducedMotion }: EffectInitContext): void {
  if (reducedMotion) return;
  element.classList.add('effect-structure-sticky-reveal');
  runByTrigger(
    element,
    effect,
    () => element.classList.add('effect-sticky-revealed'),
    0.2,
  );
}

function applyStructureZoomOnScroll({ effect, element, reducedMotion }: EffectInitContext): void {
  if (reducedMotion) return;
  element.classList.add('effect-structure-zoom-on-scroll');
  element.style.setProperty('--effect-zoom-min', String(parseNumberParam(effect, 'minScale', 1)));
  element.style.setProperty('--effect-zoom-max', String(parseNumberParam(effect, 'maxScale', 1.08)));
  runByTrigger(
    element,
    effect,
    () => {
      scrollProgressNodes.add(element);
      ensureScrollBinding();
    },
    0.15,
  );
}

function applyTextFadeUp({ effect, element, reducedMotion }: EffectInitContext): void {
  if (reducedMotion) {
    element.classList.add('effect-ready');
    return;
  }
  element.classList.add('effect-text-fade-up');
  const distance = parseNumberParam(effect, 'distance', 30);
  element.style.opacity = '0';
  element.style.transform = `translateY(${distance}px)`;
  const run = () => animateOnLoad(element, [
    { opacity: 0, transform: `translateY(${distance}px)` },
    { opacity: 1, transform: 'translateY(0)' },
  ], effect);
  runByTrigger(element, effect, run, 0.15);
}

function applyTextHighlightWords({ effect, element, reducedMotion }: EffectInitContext): void {
  if (reducedMotion) {
    element.classList.add('effect-ready');
    return;
  }
  const stagger = parseNumberParam(effect, 'stagger', 120);
  const color = typeof effect.params?.color === 'string' && effect.params.color ? effect.params.color : '';
  const targets = getTextTargets(element);
  let globalWordIndex = 0;
  for (const target of targets) {
    const text = (target.textContent || '').trim();
    if (!text) continue;
    const words = text.split(/\s+/);
    const startIndex = globalWordIndex;
    globalWordIndex += words.length;
    target.innerHTML = '';
    for (const word of words) {
      const span = document.createElement('span');
      span.className = 'effect-highlight-word';
      span.textContent = word;
      if (color) span.style.setProperty('--highlight-color', color);
      target.appendChild(span);
      target.appendChild(document.createTextNode(' '));
    }
    const run = () => {
      const spans = Array.from(target.querySelectorAll<HTMLElement>('.effect-highlight-word'));
      spans.forEach((span, index) => {
        const delay = getDelay(effect) + (startIndex + index) * stagger;
        span.style.transitionDelay = `${delay}ms`;
        span.style.transitionDuration = `${getDuration(effect)}ms`;
        span.classList.add('effect-highlighted');
      });
    };
    runByTrigger(element, effect, run, 0.15);
  }
}

function applyTextBlurIn({ effect, element, reducedMotion }: EffectInitContext): void {
  if (reducedMotion) {
    element.classList.add('effect-ready');
    return;
  }
  element.classList.add('effect-text-blur-in');
  const blurAmount = parseNumberParam(effect, 'blurAmount', 12);
  element.style.opacity = '0';
  element.style.filter = `blur(${blurAmount}px)`;
  const run = () => animateOnLoad(element, [
    { opacity: 0, filter: `blur(${blurAmount}px)` },
    { opacity: 1, filter: 'blur(0px)' },
  ], effect);
  runByTrigger(element, effect, run, 0.15);
}

function applyStructureSlideIn({ effect, element, reducedMotion }: EffectInitContext): void {
  if (reducedMotion) {
    element.classList.add('effect-ready');
    return;
  }
  element.classList.add('effect-structure-slide-in');
  const direction = String(effect.params?.direction || 'up');
  const distance = parseNumberParam(effect, 'distance', 60);
  let startTransform = `translateY(${distance}px)`;
  if (direction === 'down') startTransform = `translateY(-${distance}px)`;
  else if (direction === 'left') startTransform = `translateX(${distance}px)`;
  else if (direction === 'right') startTransform = `translateX(-${distance}px)`;
  element.style.opacity = '0';
  element.style.transform = startTransform;
  const run = () => animateOnLoad(element, [
    { opacity: 0, transform: startTransform },
    { opacity: 1, transform: 'translate(0, 0)' },
  ], effect);
  runByTrigger(element, effect, run, 0.15);
}

function applyStructureTiltHover({ effect, element, reducedMotion }: EffectInitContext): void {
  if (reducedMotion) return;
  element.classList.add('effect-structure-tilt-hover');
  const maxTilt = parseNumberParam(effect, 'maxTilt', 8);
  const perspective = parseNumberParam(effect, 'perspective', 800);
  element.style.perspective = `${perspective}px`;
  const onMove = (e: MouseEvent) => {
    const rect = element.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    element.style.transform = `perspective(${perspective}px) rotateY(${dx * maxTilt}deg) rotateX(${-dy * maxTilt}deg)`;
  };
  const onLeave = () => {
    element.style.transform = `perspective(${perspective}px) rotateY(0deg) rotateX(0deg)`;
  };
  element.addEventListener('mousemove', onMove);
  element.addEventListener('mouseleave', onLeave);
  addCleanup(element, () => {
    element.removeEventListener('mousemove', onMove);
    element.removeEventListener('mouseleave', onLeave);
  });
}

function applyStructureParallaxSticky({ element, reducedMotion }: EffectInitContext): void {
  if (reducedMotion) return;
  element.classList.add('effect-structure-parallax-sticky');
}

function applyStructureBounceIn({ effect, element, reducedMotion }: EffectInitContext): void {
  if (reducedMotion) {
    element.classList.add('effect-ready');
    return;
  }
  element.classList.add('effect-structure-bounce-in');
  const intensity = parseNumberParam(effect, 'intensity', 1.0);
  const over1 = 1 + 0.06 * intensity;
  const over2 = 1 - 0.03 * intensity;
  element.style.opacity = '0';
  element.style.transform = `scale(${0.8 + 0.2 * (1 - Math.min(intensity, 2) / 2)})`;
  const startScale = 0.8;
  const run = () => animateOnLoad(element, [
    { opacity: 0, transform: `scale(${startScale})` },
    { opacity: 1, transform: `scale(${over1})`, offset: 0.6 },
    { opacity: 1, transform: `scale(${over2})`, offset: 0.8 },
    { opacity: 1, transform: 'scale(1)' },
  ], effect);
  runByTrigger(element, effect, run, 0.15);
}

function applyTextWordShadow({ effect, element, reducedMotion }: EffectInitContext): void {
  const color = typeof effect.params?.color === 'string' ? effect.params.color : '#000000';
  const blur = parseNumberParam(effect, 'blur', 8);
  const opacity = Math.min(1, Math.max(0, parseNumberParam(effect, 'opacity', 0.5)));
  const offsetX = parseNumberParam(effect, 'offsetX', 2);
  const offsetY = parseNumberParam(effect, 'offsetY', 4);

  // Convert hex to rgba
  const hexToRgba = (hex: string, a: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
  };
  const shadowColor = color.startsWith('#') ? hexToRgba(color, opacity) : color;
  const shadowValue = `${offsetX}px ${offsetY}px ${blur}px ${shadowColor}`;

  const targets = getTextTargets(element);
  const run = () => {
    for (const target of targets) {
      target.style.textShadow = shadowValue;
      if (!reducedMotion) {
        target.animate(
          [{ textShadow: 'none', opacity: 0 }, { textShadow: shadowValue, opacity: 1 }],
          { duration: getDuration(effect), delay: getDelay(effect), easing: getEasing(effect), fill: 'forwards' }
        );
      }
    }
  };
  runByTrigger(element, effect, run, 0.15);
}

const baseRegistry: Record<string, EffectInitializer> = {
  'text-reveal-mask-up': applyTextRevealMaskUp,
  'text-stagger-words': applyTextStaggerWords,
  'text-typewriter': applyTextTypewriter,
  'text-fade-up': applyTextFadeUp,
  'text-highlight-words': applyTextHighlightWords,
  'text-blur-in': applyTextBlurIn,
  'text-word-shadow': applyTextWordShadow,
  'structure-parallax-scroll': applyStructureParallax,
  'structure-parallax-sticky': applyStructureParallaxSticky,
  'structure-sticky-reveal': applyStructureStickyReveal,
  'structure-zoom-on-scroll': applyStructureZoomOnScroll,
  'structure-slide-in': applyStructureSlideIn,
  'structure-tilt-hover': applyStructureTiltHover,
  'structure-bounce-in': applyStructureBounceIn,
};

const specialLoaders: Record<string, () => Promise<SpecialEffectModule>> = {
  'special-laser-scan': () => import('./special-effects/laser-scan'),
  /** Element-scoped ambient particles (distinct from full-page `page-soft-particles`). */
  'special-soft-particles': () => import('./special-effects/soft-particles'),
  'special-glow-pulse': () => import('./special-effects/glow-pulse'),
  'special-magnetic-hover': () => import('./special-effects/magnetic-hover'),
  'special-confetti-burst': () => import('./special-effects/confetti-burst'),
  'page-cherry-blossom': () => import('./page-effects/cherry-blossom'),
  'page-snowfall': () => import('./page-effects/snowfall'),
  'page-fireflies': () => import('./page-effects/fireflies'),
  'page-soft-particles': () => import('./page-effects/soft-particles'),
};
const TEXT_INFLUENCING_TYPES = new Set([
  'text-reveal-mask-up',
  'text-stagger-words',
  'text-typewriter',
  'text-fade-up',
  'text-highlight-words',
  'text-blur-in',
]);

const TEXT_ELEMENT_SELECTOR = 'h1,h2,h3,h4,h5,h6,p,li,td,th,blockquote,[data-effect-text]';

function getTextTargets(element: HTMLElement): HTMLElement[] {
  const found = Array.from(element.querySelectorAll<HTMLElement>(TEXT_ELEMENT_SELECTOR));
  return found.length > 0 ? found : [element];
}

function runEffect(effect: EffectDefinition, element: HTMLElement, reducedMotion: boolean): void {
  const init = baseRegistry[effect.type];
  if (init) {
    init({ effect, element, reducedMotion });
    return;
  }
  const lazy = specialLoaders[effect.type];
  if (!lazy) return;
  void lazy()
    .then((module) => module.start({ effect, element, reducedMotion }))
    .then((cleanup) => {
      if (typeof cleanup === 'function') addCleanup(element, cleanup);
    })
    .catch((err) => {
      if (import.meta.env?.DEV) {
        console.warn(`[effects-runtime] Failed to load effect "${effect.type}":`, err);
      }
    });
}

export function mountEffectsRuntime(root: ParentNode = document): void {
  const reducedMotion = prefersReducedMotion();
  const nodes = getEffectNodes(root);
  for (const node of nodes) {
    if (node.dataset.effectsInit === '1') continue;
    const effects = normalizeEffects(parseEffectDatasetValue(node.dataset.effects));
    const filteredEffects: EffectDefinition[] = [];
    let textInfluencingUsed = false;
    for (const effect of effects) {
      if (TEXT_INFLUENCING_TYPES.has(effect.type)) {
        if (textInfluencingUsed) continue;
        textInfluencingUsed = true;
      }
      filteredEffects.push(effect);
    }
    for (const effect of filteredEffects) {
      if (effect.enabled === false) continue;
      runEffect(effect, node, reducedMotion);
    }
    node.dataset.effectsInit = '1';
  }
}

export function unmountEffectsRuntime(): void {
  for (const observer of observerByThreshold.values()) observer.disconnect();
  observerByThreshold.clear();
  ioCallbacks.clear();
  for (const [element, cleanups] of cleanupCallbacks.entries()) {
    for (const cleanup of cleanups) cleanup();
    cleanupCallbacks.delete(element);
  }
  scrollProgressNodes.clear();
  document
    .querySelectorAll<HTMLElement>('[data-effects-init]')
    .forEach((node) => delete node.dataset.effectsInit);
}
