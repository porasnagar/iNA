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

/** Open-source repository — every GitHub link on the site reads from here. */
export const REPO = {
  url: "https://github.com/porasnagar/iNA",
  /** Full project (website + Android sources); the branch Lovable and Vercel use. */
  websiteBranch: "website",
  /** Standalone Android Studio project, generated from src/android by GitHub Actions. */
  androidBranch: "android",
  releasesUrl: "https://github.com/porasnagar/iNA/releases",
  license: "MIT",
} as const;
