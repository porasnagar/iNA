// Real files bundled by Vite, so the art loads on Vercel and any other host
// (the old /__l5e CDN pointers only resolve on Lovable hosting).
import bannerUrl from "@/assets/ina-banner.webp";
import iconUrl from "@/assets/ina-icon-512.webp";
import lockupUrl from "@/assets/ina-lockup.webp";

/** Official iNA brand artwork (cream paper background — place on `bg-paper` plates). */
export const BRAND = {
  icon: iconUrl,
  lockup: lockupUrl,
  banner: bannerUrl,
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
