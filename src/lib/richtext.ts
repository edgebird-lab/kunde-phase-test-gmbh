/**
 * Rich-Text-Renderer für das v3.0-JSON-Format.
 * Ein RichText besteht aus Blöcken, die Spans mit bold/italic Flags enthalten.
 * Wir rendern als sicheres HTML-String — Escaping ist Pflicht, da Inhalte vom Builder kommen.
 */

export interface Span {
  text: string;
  bold?: boolean;
  italic?: boolean;
}

export interface Block {
  align?: 'left' | 'center' | 'right';
  spans: Span[];
}

export interface RichText {
  blocks?: Block[];
}

const escapeMap: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => escapeMap[c]);
}

/**
 * Rendert einen Span zu HTML.
 */
export function renderSpan(span: Span): string {
  let html = escapeHtml(span.text);
  if (span.italic) html = `<em>${html}</em>`;
  if (span.bold) html = `<strong>${html}</strong>`;
  return html;
}

/**
 * Rendert einen Block als <p> mit korrektem text-align.
 * Für Headings nutze {@link renderHeading}.
 */
export function renderBlock(block: Block): string {
  const align = block.align && block.align !== 'left' ? ` style="text-align:${block.align}"` : '';
  const inner = (block.spans || []).map(renderSpan).join('');
  return `<p${align}>${inner}</p>`;
}

/**
 * Rendert einen kompletten RichText als HTML-Block.
 */
export function renderRichText(rt: RichText | undefined): string {
  if (!rt?.blocks?.length) return '';
  return rt.blocks.map(renderBlock).join('\n');
}

/**
 * Rendert einen Heading. Der erste Block bestimmt das align.
 * Mehrere Blöcke werden mit <br> verbunden — Headings brechen normalerweise
 * nicht in mehrere Absätze auf.
 */
export function renderHeading(rt: RichText | undefined, tag: 'h1' | 'h2' | 'h3' = 'h1', extraClass = ''): string {
  if (!rt?.blocks?.length) return '';
  const firstBlock = rt.blocks[0];
  const align = firstBlock.align && firstBlock.align !== 'left' ? ` style="text-align:${firstBlock.align}"` : '';
  const inner = rt.blocks
    .map((b) => (b.spans || []).map(renderSpan).join(''))
    .join('<br>');
  const cls = extraClass ? ` class="${escapeHtml(extraClass)}"` : '';
  return `<${tag}${cls}${align}>${inner}</${tag}>`;
}

/**
 * Hilfsfunktion: Plain-Text-Extraktion (für SEO meta description, alt, etc.)
 */
export function richTextToPlain(rt: RichText | undefined): string {
  if (!rt?.blocks?.length) return '';
  return rt.blocks
    .map((b) => (b.spans || []).map((s) => s.text).join(''))
    .join(' ')
    .trim();
}
