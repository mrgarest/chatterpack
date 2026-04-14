import type { Manifest } from "webextension-polyfill-ts";
import { version } from "./package.json";

const icon = (size: number) => `/icons/${size}.png`;

export default function getManifest() {
  return {
    name: "__MSG_appName__",
    description: "__MSG_appDesc__",
    author: "Garest",
    version: version,
    manifest_version: 3,
    default_locale: "en",
    homepage_url: "https://github.com/mrgarest/chatterpack",
    action: {
      default_icon: icon(128),
      default_title: "__MSG_appName__",
    },
    icons: {
      16: icon(16),
      48: icon(48),
      128: icon(128),
    },
    host_permissions: ["*://*.twitch.tv/*"],
    content_scripts: [
      {
        matches: ["*://*.twitch.tv/*"],
        js: ["assets/content.js"],
        css: ["assets/style.css"]
      },
    ],
    web_accessible_resources: [
      {
        resources: ["images/*", "icons/*", "sounds/*"],
        matches: ["<all_urls>"],
      },
      {
        resources: ["assets/site.js"],
        matches: ["*://*.twitch.tv/*"],
      },
    ],
    background: {
      service_worker: "assets/background.js",
      type: "module",
    },
    permissions: ["storage"],
  } as Manifest.WebExtensionManifest;
}
