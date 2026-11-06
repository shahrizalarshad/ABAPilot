"use client";

import { useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { deleteAnalysisAction } from "../actions";

export function DeleteButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm("Delete this analysis? This cannot be undone.")) {
          startTransition(() => deleteAnalysisAction(id));
        }
      }}
      className="inline-flex items-center gap-1 rounded-md border border-markup px-2 py-1 text-xs text-markup hover:bg-markup-soft disabled:opacity-60"
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Trash2 className="h-3.5 w-3.5" />
      )}
      Delete
    </button>
  );
}
