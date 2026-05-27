/**
 * CTA-Helper — kompatibel zu v3-CTA und v4-Action.
 *
 * v4-Action: { type: 'page'|'external'|'tel'|'mail'|'none', target, newTab? }
 * v3-CTA:    { label, variant, type: 'page'|'url'|'anchor'|'tel'|'mail', target }
 */

export interface CTA {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  type?: 'page' | 'url' | 'external' | 'anchor' | 'tel' | 'mail' | 'email' | 'none';
  target?: string;
  newTab?: boolean;
}

export interface ActionLike {
  type?: 'page' | 'url' | 'external' | 'anchor' | 'tel' | 'mail' | 'email' | 'none';
  target?: string;
  newTab?: boolean;
}

export function ctaHref(action: ActionLike | CTA | undefined | null): string {
  if (!action) return '#';
  const target = (action.target || '').trim();
  switch (action.type) {
    case 'url':
    case 'external':
      return target || '#';
    case 'anchor':
      return target.startsWith('#') ? target : `#${target}`;
    case 'tel':
      return `tel:${target.replace(/\s+/g, '')}`;
    case 'mail':
    case 'email':
      return `mailto:${target}`;
    case 'none':
      return '#';
    case 'page':
    default:
      if (!target) return '/';
      if (target === 'home' || target === 'startseite') return '/';
      return target.startsWith('/') ? target : `/${target}`;
  }
}

export function ctaClass(cta: CTA | { style?: string; variant?: string }): string {
  const v = (cta as CTA).variant || (cta as any).style || 'primary';
  return `btn btn-${v}`;
}

export function ctaIsExternal(action: ActionLike | CTA | undefined | null): boolean {
  if (!action) return false;
  return action.type === 'url' || action.type === 'external' || action.newTab === true;
}

export function ctaTarget(action: ActionLike | CTA | undefined | null): string | undefined {
  return ctaIsExternal(action) ? '_blank' : undefined;
}
export function ctaRel(action: ActionLike | CTA | undefined | null): string | undefined {
  return ctaIsExternal(action) ? 'noopener noreferrer' : undefined;
}

/** Kontext für interne Seiten-Links in der Builder-SSR-Vorschau (`/preview?id=…&page=…`). */
export interface PreviewLinkContext {
  previewId: string;
  pages: Array<{ slug: string; isHome?: boolean }>;
}

/** Wie `ctaHref`, aber interne `page`-Actions bleiben in der Vorschau unter `/preview`. */
export function ctaHrefWithPreview(
  action: ActionLike | CTA | undefined | null,
  ctx: PreviewLinkContext | null | undefined,
): string {
  if (!action) return '#';
  const t = action.type || 'page';
  if (t === 'url' || t === 'external' || t === 'tel' || t === 'mail' || t === 'anchor' || t === 'none') {
    return ctaHref(action);
  }
  if (!ctx?.previewId) return ctaHref(action);
  let slug = (action.target || '').replace(/^\//, '').trim();
  if (!slug || slug === 'home' || slug === 'startseite') {
    const home = ctx.pages.find((p) => p.isHome) || ctx.pages[0];
    slug = home?.slug || 'startseite';
  }
  return `/preview?id=${encodeURIComponent(ctx.previewId)}&page=${encodeURIComponent(slug)}`;
}

export function ctaTargetWithPreview(
  action: ActionLike | CTA | undefined | null,
  ctx: PreviewLinkContext | null | undefined,
): string | undefined {
  if (ctx?.previewId && (!action?.type || action.type === 'page') && !action?.newTab) return undefined;
  return ctaTarget(action);
}

export function ctaRelWithPreview(
  action: ActionLike | CTA | undefined | null,
  ctx: PreviewLinkContext | null | undefined,
): string | undefined {
  if (ctx?.previewId && (!action?.type || action.type === 'page') && !action?.newTab) return undefined;
  return ctaRel(action);
}
