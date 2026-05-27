import type { NavHeaderConfig } from "../NavBrandMark.astro";
import type { NavComputed, NavPageEntry, NavProps, NavVariant } from "./types";

export function navLinkHref(
  slug: string,
  isHome: boolean | undefined,
  previewId: string | null,
): string {
  if (previewId) {
    return `/preview?id=${encodeURIComponent(previewId)}&page=${encodeURIComponent(slug)}`;
  }
  return isHome ? "/" : `/${slug}`;
}

export function computeBrandSlotStyle(headerProp: NavHeaderConfig | null | undefined): Record<string, string> {
  const header = headerProp || {};
  const rawNavPct = Number(header.brandAlignPct);
  let brandNavPct = Number.isFinite(rawNavPct) ? Math.min(100, Math.max(0, rawNavPct)) : NaN;
  if (!Number.isFinite(brandNavPct)) {
    if (header.brandAlign === "center") brandNavPct = 50;
    else if (header.brandAlign === "end") brandNavPct = 100;
    else brandNavPct = 0;
  }
  const brandJustify: "start" | "center" | "end" =
    brandNavPct <= 33 ? "start" : brandNavPct >= 67 ? "end" : "center";
  const brandFlexJustify =
    brandJustify === "start" ? "flex-start" : brandJustify === "end" ? "flex-end" : "center";
  return {
    display: "flex",
    justifyContent: brandFlexJustify,
    minWidth: "0",
    width: "100%",
  };
}

export function computeNavState(props: NavProps): NavComputed {
  const {
    pages,
    flyoutPages: flyoutPagesRaw = [],
    primaryOrderedPages: primaryOrderedRaw = [],
    primaryOverlayOrderedPages: primaryOverlayOrderedRaw,
    secondaryPages: secondaryPagesRaw = [],
    previewId = null,
    header: headerProp = null,
    variant: variantProp = "top",
    sidebarShowHamburger: sidebarHamRaw = false,
    topShowHamburger: topHamRaw = false,
  } = props;

  const secondaryPages = Array.isArray(secondaryPagesRaw) ? secondaryPagesRaw : [];
  const flyoutPages = Array.isArray(flyoutPagesRaw) ? flyoutPagesRaw : [];
  const sidebarShowHamburger = !!sidebarHamRaw && variantProp === "sidebar";
  const topShowHamburger = !!topHamRaw && variantProp === "top";

  const variant: NavVariant =
    variantProp === "sidebar" || variantProp === "hamburger" ? variantProp : "top";

  const primaryMenu = (() => {
    if (Array.isArray(primaryOrderedRaw) && primaryOrderedRaw.length) return primaryOrderedRaw;
    return [...pages, ...flyoutPages];
  })();

  const primaryOverlayMenu =
    primaryOverlayOrderedRaw !== undefined && Array.isArray(primaryOverlayOrderedRaw)
      ? primaryOverlayOrderedRaw
      : primaryMenu;

  const desktopFlyout = flyoutPages.length > 0 && (variant === "top" || variant === "sidebar");
  const topAllCompact = variant === "top" && topShowHamburger;
  const compactAllInPanel =
    flyoutPages.length === 0 && sidebarShowHamburger && variant === "sidebar";

  const homeSlug =
    primaryMenu.find((p) => p.isHome)?.slug ??
    secondaryPages.find((p) => p.isHome)?.slug ??
    primaryMenu[0]?.slug ??
    secondaryPages[0]?.slug ??
    "";

  const brandHref = previewId ? navLinkHref(homeSlug, true, previewId) : "/";
  const fallbackTitle = primaryMenu[0]?.title || secondaryPages[0]?.title || "Startseite";

  return {
    variant,
    sidebarShowHamburger,
    topShowHamburger,
    topAllCompact,
    desktopFlyout,
    compactAllInPanel,
    primaryMenu,
    primaryOverlayMenu,
    secondaryPages,
    flyoutPages,
    hasSecondary: secondaryPages.length > 0,
    brandSlotStyle: computeBrandSlotStyle(headerProp),
    brandHref,
    fallbackTitle,
    homeSlug,
  };
}

export type NavLinkContext = { previewId: string | null };

export function hrefForPage(
  p: NavPageEntry,
  ctx: NavLinkContext,
): string {
  return navLinkHref(p.slug, p.isHome, ctx.previewId);
}
