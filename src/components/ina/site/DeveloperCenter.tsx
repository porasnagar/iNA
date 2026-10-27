import { Link } from "@tanstack/react-router";
import { ArrowRight, FileCode2, Github, Loader2, Package } from "lucide-react";

import { Button } from "@/components/ui/button";

import { SectionHeading } from "./SectionHeading";
import { useProjectZip } from "./useProjectZip";

const CORE_FILES = [
  "MainActivity.kt",
  "iBridgeAndroid.kt",
  "IBridgeForegroundService.kt",
  "CasePopupOverlayActivity.kt",
  "InaQuickSettingsTileService.kt",
  "AndroidManifest.xml",
  "strings.xml",
];

const TOOLCHAIN = ["Gradle 8.11.1", "AGP 8.10.1", "Kotlin 2.1.21", "JDK 17", "compileSdk 36"];

export function DeveloperCenter() {
  const zip = useProjectZip();
  return (
    <section id="developers" className="scroll-mt-16 border-t border-border">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
        <SectionHeading eyebrow="Developer center" title="The whole app, in plain Kotlin.">
          Kotlin and Jetpack Compose, ready for Android Studio. Read every file in the browser, grab one, or download the full project with Gradle
          setup, launcher icons and product art.
        </SectionHeading>

        <div className="mt-12 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Link
            to="/source"
            className="group flex flex-col rounded-[28px] border border-border bg-card/50 p-6 transition-colors hover:bg-card sm:p-8"
          >
            <div className="flex items-center justify-between">
              <span className="grid size-11 place-items-center rounded-2xl bg-primary/12 text-primary">
                <FileCode2 className="size-5" />
              </span>
              <ArrowRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
            </div>
            <h3 className="mt-6 text-2xl font-semibold tracking-tight">Android source viewer</h3>
            <p className="mt-2 text-[15px] text-muted-foreground">Syntax-highlighted, with copy and download on every file.</p>
            <div className="mt-6 grid gap-1.5 sm:grid-cols-2">
              {CORE_FILES.map((f) => (
                <span key={f} className="truncate rounded-xl bg-foreground/5 px-3 py-2 font-mono text-xs">
                  {f}
                </span>
              ))}
            </div>
          </Link>

          <div className="grid gap-4">
            <div className="flex flex-col rounded-[28px] border border-border bg-card/50 p-6 sm:p-8">
              <span className="grid size-11 place-items-center rounded-2xl bg-primary/12 text-primary">
                <Package className="size-5" />
              </span>
              <h3 className="mt-6 text-xl font-semibold tracking-tight">One-click project download</h3>
              <p className="mt-2 text-sm text-muted-foreground">Unzip, open the iNA folder in Android Studio, press Run.</p>
              <Button className="mt-5 h-11 self-start rounded-full px-5 font-semibold" onClick={() => void zip.download()} disabled={zip.busy}>
                {zip.busy ? <Loader2 className="animate-spin" /> : <Package />}
                {zip.busy ? "Packaging…" : "Download project (.zip)"}
              </Button>
            </div>
            <div className="flex flex-col rounded-[28px] border border-border bg-card/50 p-6 sm:p-8">
              <span className="grid size-11 place-items-center rounded-2xl bg-foreground/5">
                <Github className="size-5" />
              </span>
              <h3 className="mt-6 text-xl font-semibold tracking-tight">APK builds on GitHub</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Every push builds a test and a release APK. Push a tag starting with <span className="font-mono text-foreground">v</span> to attach
                them to a GitHub Release.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {TOOLCHAIN.map((t) => (
                  <span key={t} className="rounded-full bg-foreground/5 px-2.5 py-1 font-mono text-[11px] text-muted-foreground">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
