"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { Field, inputCls } from "@/components/ui";
import { DEFAULT_CONVENTIONS, type Conventions } from "@/lib/conventions";
import { loadApiKey, saveApiKey, useHydrated } from "@/lib/browser-storage";
import { saveConventionsAction } from "./actions";

export function SettingsForm({ initial }: { initial: Conventions }) {
  const hydrated = useHydrated();
  const [c, setC] = useState<Conventions>(initial);
  // The BYOK key lives only in this browser; read it after hydration.
  const [keyDraft, setKeyDraft] = useState<string | null>(null);
  const key = keyDraft ?? (hydrated ? loadApiKey() : "");
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  const set = (k: keyof Conventions) => (e: { target: { value: string } }) =>
    setC({ ...c, [k]: e.target.value });

  return (
    <main className="mx-auto max-w-2xl space-y-8 px-4 py-8">
      <div>
        <h1 className="font-display text-[26px] leading-tight font-bold">
          Team conventions
        </h1>
        <p className="mt-1 text-sm text-muted">
          Saved to your account and applied to every analysis, so the output
          matches how your team writes code and documentation.
        </p>
      </div>

      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          saveApiKey(key.trim());
          startTransition(async () => {
            const res = await saveConventionsAction(c);
            setStatus(res.ok ? "saved" : "error");
            setMessage(res.ok ? "" : res.error);
            if (res.ok) setTimeout(() => setStatus("idle"), 2000);
          });
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Developer ID / author">
            <input
              className={inputCls}
              value={c.authorId}
              onChange={set("authorId")}
              placeholder="e.g. SARSHAD"
            />
          </Field>
          <Field label="Output language">
            <select
              className={inputCls}
              value={c.language}
              onChange={set("language")}
            >
              <option>English</option>
              <option>Bahasa Melayu</option>
              <option>German</option>
              <option>Chinese</option>
            </select>
          </Field>
        </div>
        <Field label="System release">
          <input
            className={inputCls}
            value={c.systemRelease}
            onChange={set("systemRelease")}
            placeholder="ECC 6.0 EHP8 (ABAP 7.50)"
          />
        </Field>
        <Field
          label="Change tag format"
          hint="Placeholders: {TAG} {TICKET} {AUTHOR} {DATE}"
        >
          <textarea
            className={`${inputCls} min-h-24 font-mono text-xs`}
            value={c.changeTagFormat}
            onChange={set("changeTagFormat")}
          />
        </Field>
        <Field label="Naming rules">
          <textarea
            className={`${inputCls} min-h-20`}
            value={c.namingRules}
            onChange={set("namingRules")}
          />
        </Field>
        <Field label="Additional coding / documentation rules">
          <textarea
            className={`${inputCls} min-h-28`}
            value={c.extraRules}
            onChange={set("extraRules")}
          />
        </Field>

        <div className="border-t border-line pt-5">
          <h2 className="font-semibold">Your own API key (optional)</h2>
          <p className="mt-1 mb-3 text-sm text-muted">
            Use your own Anthropic key. It is stored only in this browser and
            sent with each request; the server never saves it.
          </p>
          <input
            className={inputCls}
            type="password"
            value={key}
            onChange={(e) => setKeyDraft(e.target.value)}
            placeholder="sk-ant-..."
            autoComplete="off"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-md bg-spruce px-4 py-2 text-sm font-medium text-on-spruce hover:bg-spruce-hover disabled:opacity-60"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save
          </button>
          <button
            type="button"
            className="text-sm text-muted hover:underline"
            onClick={() => setC(DEFAULT_CONVENTIONS)}
          >
            Reset to defaults
          </button>
          {status === "saved" && (
            <span className="inline-flex items-center gap-1 text-sm text-spruce">
              <Check className="h-4 w-4" /> Saved
            </span>
          )}
          {status === "error" && (
            <span className="text-sm text-markup">{message}</span>
          )}
        </div>
      </form>
    </main>
  );
}
