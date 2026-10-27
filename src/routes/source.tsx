import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Download, FileCode2, FileCog, FileText, Loader2, Package } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { BuildGuide } from "@/components/ina/site/DeveloperCenter";
import { Button } from "@/components/ui/button";
import { buildProjectZip, downloadBlob, SOURCE_FILES, type SourceFile } from "@/lib/android-source";
import { highlight } from "@/lib/highlight";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/source")({
  head: () => ({
    meta: [
      { title: "iNA Developer Center — Android Kotlin source & APK build" },
      {
        name: "description",
        content: "Copy or download the iNA Android Studio project: MainActivity, foreground service, overlay pop-up, Quick Settings tile, manifest and strings.",
      },
      { property: "og:title", content: "iNA Developer Center — Android Kotlin source & APK build" },
      { property: "og:description", content: "Production Kotlin for iNA's case-open pop-up, noise control tile, AAP controller and OTA rule engine." },
    ],
  }),
  component: SourcePage,
});

function FileIcon({ file, className }: { file: SourceFile; className?: string }) {
  const I = file.language === "kotlin" ? FileCode2 : file.language === "text" ? FileText : FileCog;
  return <I className={cn("size-4 shrink-0", className)} />;
}

function SourcePage() {
  const [selectedPath, setSelectedPath] = useState(SOURCE_FILES[0]?.path ?? "");
  const [copied, setCopied] = useState(false);
  const [zipping, setZipping] = useState(false);
  const file = SOURCE_FILES.find((f) => f.path === selectedPath) ?? SOURCE_FILES[0];
  const primary = SOURCE_FILES.filter((f) => f.primary);
  const others = SOURCE_FILES.filter((f) => !f.primary);
  const totalLines = useMemo(() => SOURCE_FILES.reduce((n, f) => n + f.content.split("\n").length, 0), []);
  const html = useMemo(() => (file ? highlight(file.content, file.language) : ""), [file]);
  const lineCount = file ? file.content.split("\n").length : 0;

  if (!file) return null;

  const copy = async () => {
    await navigator.clipboard.writeText(file.content);
    setCopied(true);
    toast.success(`${file.name} copied`);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const downloadFile = () => {
    downloadBlob(new Blob([file.content], { type: "text/plain;charset=utf-8" }), file.name);
  };

  const downloadZip = async () => {
    setZipping(true);
    try {
      downloadBlob(await buildProjectZip(), "iNA-android.zip");
      toast.success("Project downloaded — open the iNA folder in Android Studio");
    } catch {
      toast.error("Couldn't build the zip. Please try again.");
    } finally {
      setZipping(false);
    }
  };

  const FileButton = ({ f }: { f: SourceFile }) => (
    <button
      type="button"
      onClick={() => setSelectedPath(f.path)}
      className={cn(
        "flex w-full items-start gap-2.5 rounded-xl px-3 py-2 text-left transition-colors",
        f.path === file.path ? "bg-elevated text-foreground" : "text-muted-foreground hover:bg-card hover:text-foreground",
      )}
    >
      <FileIcon file={f} className={cn("mt-0.5", f.language === "kotlin" ? "text-tint-purple" : "text-tint-blue")} />
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-medium">{f.name}</span>
        {f.description && <span className="block truncate text-[11px] text-muted-foreground">{f.description}</span>}
      </span>
    </button>
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-primary">Developer center</p>
          <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight sm:text-6xl">iNA Android source code in Kotlin</h1>
          <p className="mt-4 text-muted-foreground sm:text-lg">
            Kotlin + Jetpack Compose for package dev.ibridge.android, ready for Android Studio. Copy single files or download the whole project with
            Gradle setup and product art.
          </p>
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            {SOURCE_FILES.length} files · {totalLines.toLocaleString()} lines · AGP 8.10 · Kotlin 2.1 · compileSdk 36
          </p>
        </div>
        <Button size="lg" className="h-12 shrink-0 rounded-full px-6 font-semibold" onClick={() => void downloadZip()} disabled={zipping}>
          {zipping ? <Loader2 className="size-4 animate-spin" /> : <Package className="size-4" />}
          {zipping ? "Packaging…" : "Download project (.zip)"}
        </Button>
      </div>

      <BuildGuide />

      <section aria-labelledby="browse" className="mt-16">
      <h2 id="browse" className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Browse the Kotlin source
      </h2>
      <div className="mt-6 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="flex gap-2 overflow-x-auto pb-2 lg:hidden">
            {SOURCE_FILES.map((f) => (
              <button
                key={f.path}
                type="button"
                onClick={() => setSelectedPath(f.path)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium",
                  f.path === file.path ? "bg-foreground text-background" : "bg-card text-muted-foreground",
                )}
              >
                {f.name}
              </button>
            ))}
          </div>
          <div className="hidden space-y-5 lg:block">
            <div>
              <h3 className="mb-1.5 px-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Core files</h3>
              <div className="space-y-0.5">
                {primary.map((f) => (
                  <FileButton key={f.path} f={f} />
                ))}
              </div>
            </div>
            <div>
              <h3 className="mb-1.5 px-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Project & resources</h3>
              <div className="space-y-0.5">
                {others.map((f) => (
                  <FileButton key={f.path} f={f} />
                ))}
              </div>
            </div>
          </div>
        </aside>

        <section className="min-w-0 overflow-hidden rounded-3xl border border-border bg-card/50">
          <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
            <FileIcon file={file} className="text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{file.name}</div>
              <div className="truncate font-mono text-[11px] text-muted-foreground">{file.path}</div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button variant="secondary" size="sm" className="rounded-xl" onClick={() => void copy()}>
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button variant="secondary" size="sm" className="rounded-xl" onClick={downloadFile}>
                <Download className="size-4" />
                Download
              </Button>
            </div>
          </div>
          <div className="flex max-h-[75vh] overflow-auto">
            <pre aria-hidden className="sticky left-0 select-none border-r border-border bg-card px-3 py-4 text-right font-mono text-[12px] leading-[1.6] text-muted-foreground/50">
              {Array.from({ length: lineCount }, (_, i) => i + 1).join("\n")}
            </pre>
            <pre className="min-w-0 flex-1 px-4 py-4 font-mono text-[12px] leading-[1.6] text-foreground/90">
              <code dangerouslySetInnerHTML={{ __html: html }} />
            </pre>
          </div>
        </section>
      </div>
      </section>
    </main>
  );
}
