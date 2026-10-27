import { useState } from "react";
import { toast } from "sonner";

/** One-click Android Studio project download; the source bundle is loaded only when asked for. */
export function useProjectZip() {
  const [busy, setBusy] = useState(false);
  const download = async () => {
    setBusy(true);
    try {
      const { buildProjectZip, downloadBlob } = await import("@/lib/android-source");
      downloadBlob(await buildProjectZip(), "iNA-android.zip");
      toast.success("Project downloaded — open the iNA folder in Android Studio");
    } catch {
      toast.error("Couldn't build the zip. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  return { busy, download };
}
