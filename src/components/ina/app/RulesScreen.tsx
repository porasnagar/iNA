import { Check, FileJson, Loader2, Plus, RefreshCw, RotateCcw, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_MANIFEST, parseManifest } from "@/lib/ina/ota";
import { hexId, isValidPsm, parseHexId } from "@/lib/ina/protocol";
import { useSim } from "@/lib/ina/store";
import { cn } from "@/lib/utils";
import { Group, Row, ScreenHeader } from "./ui";

function JsonView({ json }: { json: string }) {
  const html = json
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/("(?:\\.|[^"\\])*")(\s*:)?/g, (_m, str: string, colon?: string) =>
      colon ? `<span class="text-primary">${str}</span>${colon}` : `<span class="text-success">${str}</span>`,
    );
  return (
    <pre
      className="max-h-72 overflow-auto scrollbar-none whitespace-pre p-4 font-mono text-[10.5px] leading-relaxed text-muted-foreground"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function RulesScreen() {
  const { state, actions, models } = useSim();
  const m = state.manifest;
  const [psm, setPsm] = useState(m.l2cap_psm);
  const [psmError, setPsmError] = useState<string | null>(null);
  const [newId, setNewId] = useState("0x2B20");
  const [newName, setNewName] = useState("AirPods Pro 4");
  const [regError, setRegError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [draftError, setDraftError] = useState<string | null>(null);
  const json = JSON.stringify(m, null, 2);

  const applyPsm = () => {
    const id = parseHexId(psm);
    if (id === null || !isValidPsm(id)) {
      setPsmError("PSM must be odd with an even upper byte (e.g. 0x1001).");
      return;
    }
    setPsmError(null);
    actions.applyManifest({ ...m, l2cap_psm: hexId(id) }, "PSM override");
  };

  const register = () => {
    const id = parseHexId(newId);
    if (id === null) return setRegError("Model ID must be 16-bit hex, like 0x2B20.");
    if (!newName.trim()) return setRegError("Give the model a name.");
    setRegError(null);
    actions.applyManifest({ ...m, models: { ...m.models, [hexId(id)]: newName.trim() } }, `hot-registered ${hexId(id)}`);
  };

  const removeModel = (hex: string) => {
    const next = { ...m.models };
    delete next[hex];
    actions.applyManifest({ ...m, models: next }, `removed ${hex}`);
  };

  return (
    <div className="space-y-5 pb-6">
      <ScreenHeader title="Protocol Rules" subtitle={<span className="font-mono text-[11px]">OtaProtocolRuleManager</span>} />

      <div className="mx-4 rounded-[24px] bg-card p-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-success/15 text-success">
            <ShieldCheck className="size-5" />
          </span>
          <div className="min-w-0 flex-1 pr-2">
            <div className="truncate text-[15px] font-semibold">Rules v{m.version}</div>
            <div className="truncate text-xs text-muted-foreground">
              Signature verified · {state.lastSync ? `synced ${new Date(state.lastSync).toLocaleTimeString()}` : "bundled manifest"}
            </div>
          </div>
        </div>
        <Button className="mt-3 h-11 w-full rounded-xl" onClick={() => void actions.syncOta()} disabled={state.otaSyncing}>
          {state.otaSyncing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          {state.otaSyncing ? "Syncing…" : "Sync OTA Rules"}
        </Button>
      </div>

      <Group title="L2CAP PSM Override" footer={psmError ?? "Default 0x1001. Applied on the next AAP connection."}>
        <div className="flex gap-2 p-3">
          <Input value={psm} onChange={(e) => setPsm(e.target.value)} className="h-10 rounded-xl font-mono" aria-label="L2CAP PSM" />
          <Button variant="secondary" className="h-10 shrink-0 rounded-xl" onClick={applyPsm}>
            Apply
          </Button>
        </div>
      </Group>

      <Group title="Model Hot-Registration" footer={regError ?? "Merged into AppleProtocolSpec.MODEL_DATABASE instantly — no app update."}>
        <div className="grid grid-cols-[96px_1fr] gap-2 p-3">
          <Input value={newId} onChange={(e) => setNewId(e.target.value)} className="h-10 rounded-xl font-mono" aria-label="Model ID" />
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} className="h-10 rounded-xl" aria-label="Model name" />
          <Button className="col-span-2 h-10 rounded-xl" onClick={register}>
            <Plus className="size-4" /> Register model
          </Button>
        </div>
        {Object.entries(m.models).map(([hex, name]) => (
          <Row key={hex} title={name} detail={`${models.get(parseHexId(hex) ?? -1)?.family ?? "airpods"} · OTA`} value={<span className="font-mono text-xs">{hex}</span>}>
            <button type="button" aria-label={`Remove ${name}`} onClick={() => removeModel(hex)} className="shrink-0 text-muted-foreground hover:text-destructive">
              <Trash2 className="size-4" />
            </button>
          </Row>
        ))}
      </Group>

      <Group title="Opcodes">
        {Object.entries(m.opcodes).map(([k, v]) => (
          <div key={k} className="px-4 py-2.5">
            <div className="text-[13px]">{k}</div>
            <div className="truncate font-mono text-[10.5px] text-muted-foreground">{v}</div>
          </div>
        ))}
      </Group>

      <section className="px-4">
        <div className="mb-1.5 flex items-center justify-between px-3">
          <h4 className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">Rule JSON</h4>
          <div className="flex gap-3 text-xs font-medium text-primary">
            {editing ? (
              <>
                <button type="button" onClick={() => setEditing(false)} className="text-muted-foreground">Cancel</button>
                <button
                  type="button"
                  onClick={() => {
                    const r = parseManifest(draft);
                    if (!r.ok) return setDraftError(r.error);
                    setDraftError(null);
                    setEditing(false);
                    setPsm(r.manifest.l2cap_psm);
                    actions.applyManifest(r.manifest, "edited JSON");
                  }}
                  className="flex items-center gap-1"
                >
                  <Check className="size-3.5" /> Apply
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => { actions.applyManifest(DEFAULT_MANIFEST, "reset"); setPsm(DEFAULT_MANIFEST.l2cap_psm); }} className="flex items-center gap-1 text-muted-foreground">
                  <RotateCcw className="size-3.5" /> Reset
                </button>
                <button type="button" onClick={() => { setDraft(json); setEditing(true); setDraftError(null); }} className="flex items-center gap-1">
                  <FileJson className="size-3.5" /> Edit
                </button>
              </>
            )}
          </div>
        </div>
        <div className={cn("overflow-hidden rounded-[20px] bg-card", draftError && "ring-1 ring-destructive")}>
          {editing ? (
            <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} className="min-h-72 rounded-none border-0 bg-transparent font-mono text-[10.5px]" spellCheck={false} aria-label="Rule JSON" />
          ) : (
            <JsonView json={json} />
          )}
        </div>
        {draftError && <p className="mt-1.5 px-3 text-[11.5px] text-destructive">{draftError}</p>}
      </section>
    </div>
  );
}
