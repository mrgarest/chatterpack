/**
 * Injecting an external JS file (asset) into the page's DOM.
 * @param asset - The filename of the asset located in the extension's "assets" directory.
 */
export function scriptInject(asset: string) {
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL(`assets/${asset}`);
  (document.head || document.documentElement).appendChild(script);
}
