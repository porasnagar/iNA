import { strToU8, zipSync } from "fflate";


// The .github entry is spelled out because globs skip dot-folders; it becomes the android branch's own APK workflow.
const RAW = import.meta.glob(["/src/android/**/*", "/src/android/.github/workflows/*.yml", "!/src/android/**/*.png"], {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

/** Binary resources (launcher icons, product renders) — shipped in the zip as-is, never shown in the viewer. */
const BINARY = import.meta.glob("/src/android/**/*.png", { query: "?url", import: "default", eager: true }) as Record<string, string>;

export type SourceLanguage = "kotlin" | "xml" | "gradle" | "text";

export interface SourceFile {
  path: string;
  name: string;
  language: SourceLanguage;
  content: string;
  primary: boolean;
  description: string;
}

const PRIMARY_ORDER = [
  "MainActivity.kt",
  "iBridgeAndroid.kt",
  "IBridgeForegroundService.kt",
  "CasePopupOverlayActivity.kt",
  "InaQuickSettingsTileService.kt",
  "AndroidManifest.xml",
  "strings.xml",
];

const DESCRIPTIONS: Record<string, string> = {
  "MainActivity.kt": "Onboarding wizard, permissions, Connect a Device and UI actions",
  "iBridgeAndroid.kt": "Protocol spec, packet parser, state, OTA rule engine, AAP controller, Compose UI",
  "IBridgeForegroundService.kt": "BLE 0x004C scanner, case-open trigger, live status notification, ANCS",
  "CasePopupOverlayActivity.kt": "System overlay bottom sheet, fallback Activity, one-tap pairing",
  "InaQuickSettingsTileService.kt": "iNA Noise Control tile — ANC → Transparency → Adaptive → Off",
  "AndroidManifest.xml": "Permissions, services, tile, notification listener and boot receiver",
  "strings.xml": "User-facing strings",
  "AppleDevices.kt": "Apple Watch (GATT heart rate), AirTag (Find My scanner) and HomePod (Bonjour) screens",
  "LiquidGlass.kt": "Liquid Glass surfaces, window blur and Reduce Transparency",
  "NextActionAdvisor.kt": "Suggested next action card on the AirPods screen",
  "HighRefreshRate.kt": "Requests 90/120/144 Hz for the app and the case-open overlay",
};

function languageOf(name: string): SourceLanguage {
  if (name.endsWith(".kt")) return "kotlin";
  if (name.endsWith(".kts")) return "gradle";
  if (name.endsWith(".xml")) return "xml";
  return "text";
}

export const SOURCE_FILES: SourceFile[] = Object.entries(RAW)
  .map(([fullPath, content]) => {
    const path = fullPath.replace(/^\/src\/android\//, "");
    const name = path.split("/").pop() ?? path;
    return {
      path,
      name,
      language: languageOf(name),
      content,
      primary: PRIMARY_ORDER.includes(name),
      description: DESCRIPTIONS[name] ?? (path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "Project root"),
    };
  })
  .sort((a, b) => {
    const ai = PRIMARY_ORDER.indexOf(a.name);
    const bi = PRIMARY_ORDER.indexOf(b.name);
    if (ai !== -1 || bi !== -1) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    return a.path.localeCompare(b.path);
  });

async function fetchBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not download ${url}`);
  return new Uint8Array(await res.arrayBuffer());
}

export async function buildProjectZip(): Promise<Blob> {
  const files: Record<string, Uint8Array> = {};
  for (const f of SOURCE_FILES) {
    files[`iNA/${f.path}`] = strToU8(f.content);
  }
  for (const [fullPath, url] of Object.entries(BINARY)) {
    files[`iNA/${fullPath.replace(/^\/src\/android\//, "")}`] = await fetchBytes(url);
  }
  const zipped = zipSync(files, { level: 6 });
  return new Blob([zipped as BlobPart], { type: "application/zip" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
