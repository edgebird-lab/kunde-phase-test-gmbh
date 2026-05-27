import type { NavHeaderConfig } from "../NavBrandMark.astro";

export type { NavHeaderConfig };

export type NavVariant = "top" | "sidebar" | "hamburger";

export interface NavPageEntry {
  slug: string;
  title: string;
  isHome?: boolean;
}

export interface NavProps {
  brandName: string;
  pages: NavPageEntry[];
  /** Primary nur im Overlay, nicht in der Strip-Leiste (overlay-exklusiv). */
  flyoutPages?: NavPageEntry[];
  /** Primary union (Strip ∪ Overlay) — Mobil / volle Erreichbarkeit. */
  primaryOrderedPages?: NavPageEntry[];
  /** Primary nur mit „Aufklapp-Menü“-Sichtbarkeit — großes Panel auf Desktop (top/sidebar). Fehlt → wie primaryOrdered (Legacy). */
  primaryOverlayOrderedPages?: NavPageEntry[];
  /** Zweites Menüband (z. B. unter der Hauptzeile bei variant top). */
  secondaryPages?: NavPageEntry[];
  previewId?: string | null;
  header?: NavHeaderConfig | null;
  /** Konfigurator: top | sidebar | hamburger */
  variant?: NavVariant;
  /** Nur sinnvoll bei variant sidebar: Hamburger auch auf großen Viewports (wie schmale Sidebar-Ansicht). */
  sidebarShowHamburger?: boolean;
  /** Bei variant top: Hamburger-Toggle zusätzlich auf Desktop (horizontale Links bleiben sichtbar). */
  topShowHamburger?: boolean;
}

export interface NavComputed {
  variant: NavVariant;
  sidebarShowHamburger: boolean;
  topShowHamburger: boolean;
  topAllCompact: boolean;
  desktopFlyout: boolean;
  compactAllInPanel: boolean;
  primaryMenu: NavPageEntry[];
  primaryOverlayMenu: NavPageEntry[];
  secondaryPages: NavPageEntry[];
  flyoutPages: NavPageEntry[];
  hasSecondary: boolean;
  brandSlotStyle: Record<string, string>;
  brandHref: string;
  fallbackTitle: string;
  homeSlug: string;
}
