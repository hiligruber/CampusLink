/**
 * Open an external URL reliably even inside sandboxed preview iframes.
 */
export const openExternalUrl = (url: string) => {
  if (!url || typeof window === "undefined") return;

  try {
    const popup = window.open(url, "_blank", "noopener,noreferrer");
    if (popup) {
      try { popup.opener = null; } catch {}
      return;
    }
  } catch {}

  try {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
    return;
  } catch {}

  try {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_top";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch {
    window.location.href = url;
  }
};

export const getExternalMapHrefFromTarget = (target: EventTarget | null) => {
  if (!(target instanceof Element)) return null;
  const anchor = target.closest<HTMLAnchorElement>("a[href]");
  if (!anchor?.href) return null;
  try {
    const url = new URL(anchor.href);
    const host = url.hostname.replace(/^www\./, "");
    const isGoogleMaps = host.endsWith("google.com") && url.pathname.includes("/maps");
    const isWaze = host.endsWith("waze.com");
    return isGoogleMaps || isWaze ? url.href : null;
  } catch {
    return null;
  }
};
