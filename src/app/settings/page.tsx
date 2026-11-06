"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Nav } from "@/components/nav";
import { Field, inputCls } from "@/components/ui";
import {
  DEFAULT_CONVENTIONS,
  loadApiKey,
  loadConventions,
  saveApiKey,
  saveConventions,
  useHydrated,
  type Conventions,
} from "@/lib/conventions";

export default function Settings() {
  const hydrated = useHydrated();
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Nav />
      {hydrated && <SettingsForm />}
    </div>
  );
}

function SettingsForm() {
  const [c, setC] = useState<Conventions>(loadConventions);
  const [key, setKey] = useState(loadApiKey);
  const [saved, setSaved] = useState(false);

  const set = (k: keyof Conventions) => (e: { target: { value: string } }) =>
    setC({ ...c, [k]: e.target.value });

  return (
    <main className="mx-auto max-w-2xl space-y-8 px-4 py-8">
      <div>
        <h1 className="text-xl font-semibold">Team conventions</h1>
        <p className="mt-1 text-sm text-zinc-500">
          These are sent with every analysis so the output matches how your team
          writes code and documentation.
        </p>
      </div>

      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          saveConventions(c);
          saveApiKey(key.trim());
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
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

        <div className="border-t border-zinc-200 pt-5 dark:border-zinc-800">
          <h2 className="font-semibold">Your own API key (optional)</h2>
          <p className="mt-1 mb-3 text-sm text-zinc-500">
            Use your own Anthropic key. It is stored only in this browser and
            sent with each request; the server never saves it.
          </p>
          <input
            className={inputCls}
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="sk-ant-..."
            autoComplete="off"
          />
        </div>

        <div className="flex items-center gap-3">
          <button className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Save
          </button>
          <button
            type="button"
            className="text-sm text-zinc-500 hover:underline"
            onClick={() => setC(DEFAULT_CONVENTIONS)}
          >
            Reset to defaults
          </button>
          {saved && (
            <span className="inline-flex items-center gap-1 text-sm text-green-600">
              <Check className="h-4 w-4" /> Saved
            </span>
          )}
        </div>
      </form>
    </main>
  );
}
