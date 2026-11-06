"use client";

import { useActionState } from "react";
import { Loader2, Mail, MailCheck } from "lucide-react";
import { sendMagicLink, type LoginState } from "@/app/auth/actions";
import { inputCls } from "@/components/ui";

export function LoginForm({ next, error }: { next: string; error?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    sendMagicLink,
    {
      status: error ? "error" : "idle",
      message: error,
    },
  );

  if (state.status === "sent") {
    return (
      <div className="space-y-3 text-center">
        <MailCheck className="mx-auto h-10 w-10 text-green-600" />
        <h2 className="text-lg font-semibold">Check your email</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          We sent a login link to <strong>{state.email}</strong>. Open it on
          this device to sign in. It may take a minute; check your spam folder
          too.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Work email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@company.com"
          className={inputCls}
        />
      </label>
      {state.status === "error" && state.message && (
        <p className="rounded-md bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.message}
        </p>
      )}
      <button
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Mail className="h-4 w-4" />
        )}
        Email me a login link
      </button>
      <p className="text-center text-xs text-zinc-500">
        No password needed. New accounts are created automatically.
      </p>
    </form>
  );
}
