import { Github, Loader2, Package } from "lucide-react";

import { REPO } from "@/components/ina/brand";
import { Button } from "@/components/ui/button";

import { useProjectZip } from "./useProjectZip";

const TOOLCHAIN = ["Gradle 8.11.1", "AGP 8.10.1", "Kotlin 2.1.21", "JDK 17", "compileSdk 36"];

const STEPS = [
  { title: "Download the project", body: "One .zip with every Kotlin file, Gradle setup, launcher icons and product art." },
  { title: "Open it in Android Studio", body: "Unzip, then File › Open the iNA folder. Gradle syncs on its own." },
  { title: "Run on your phone", body: "Plug in any Android 10–16+ phone with USB debugging on and press Run." },
];

/** Build instructions and export options for the Developer Center (/source). */
export function BuildGuide() {
  const zip = useProjectZip();
  return (
    <section aria-labelledby="build" className="mt-14">
      <h2 id="build" className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Build the iNA APK
      </h2>
      <ol className="mt-6 grid gap-3 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.title} className="rounded-[24px] border border-border bg-card/50 p-5">
            <span className="font-mono text-xs text-primary">0{i + 1}</span>
            <h3 className="mt-2 text-[17px] font-semibold tracking-tight">{s.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
          </li>
        ))}
      </ol>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="flex flex-col rounded-[24px] border border-border bg-card/50 p-6">
          <span className="grid size-11 place-items-center rounded-2xl bg-primary/12 text-primary">
            <Package className="size-5" />
          </span>
          <h3 className="mt-5 text-xl font-semibold tracking-tight">One-click Android Studio export</h3>
          <p className="mt-2 text-sm text-muted-foreground">The full project as a .zip, ready to open and run.</p>
          <Button className="mt-5 h-11 self-start rounded-full px-5 font-semibold" onClick={() => void zip.download()} disabled={zip.busy}>
            {zip.busy ? <Loader2 className="animate-spin" /> : <Package />}
            {zip.busy ? "Packaging…" : "Download project (.zip)"}
          </Button>
        </div>
        <div className="flex flex-col rounded-[24px] border border-border bg-card/50 p-6">
          <span className="grid size-11 place-items-center rounded-2xl bg-foreground/5">
            <Github className="size-5" />
          </span>
          <h3 className="mt-5 text-xl font-semibold tracking-tight">Automatic APK builds on GitHub</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            The <span className="font-mono text-foreground">{REPO.androidBranch}</span> branch holds the Android Studio project on its own and builds a
            test and a release APK on every change. Each new version is tagged{" "}
            <span className="font-mono text-foreground">v1.2.0</span>-style and published as a GitHub Release.
          </p>
          <ul aria-label="Pinned toolchain" className="mt-4 flex flex-wrap gap-1.5">
            {TOOLCHAIN.map((t) => (
              <li key={t} className="rounded-full bg-foreground/5 px-2.5 py-1 font-mono text-[11px] text-muted-foreground">
                {t}
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild variant="secondary" className="h-10 rounded-full px-4">
              <a href={`${REPO.url}/tree/${REPO.androidBranch}`} target="_blank" rel="noreferrer">
                <Github /> Android branch
              </a>
            </Button>
            <Button asChild variant="secondary" className="h-10 rounded-full px-4">
              <a href={REPO.releasesUrl} target="_blank" rel="noreferrer">
                <Package /> APK releases
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
