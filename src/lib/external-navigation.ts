export const openExternalUrl = (url: string) => {
  if (!url || typeof window === "undefined") return;

  const isFramed = window.self !== window.top;

  if (isFramed) {
    const link = document.createElement("a");
    link.href = url;
    link.target = "_top";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
    return;
  }

  const popup = window.open("about:blank", "_blank");

  if (popup) {
    popup.opener = null;
    popup.location.href = url;
    return;
  }

  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();
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