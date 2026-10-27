import bannerAsset from "@/assets/ina-banner.webp.asset.json";
import iconAsset from "@/assets/ina-icon-512.webp.asset.json";
import lockupAsset from "@/assets/ina-lockup.webp.asset.json";

/** Official iNA brand artwork (cream paper background — place on `bg-paper` plates). */
export const BRAND = {
  icon: iconAsset.url,
  lockup: lockupAsset.url,
  banner: bannerAsset.url,
  tagline: "Universal Apple Hardware Interoperability Suite for Android",
} as const;

/**
 * Open-source repository. TODO(owner): replace with the real GitHub repo URL
 * (e.g. https://github.com/<you>/<repo>) — every GitHub link on the site reads from here.
 */
export const REPO = {
  url: "https://github.com/",
  license: "MIT",
} as const;
