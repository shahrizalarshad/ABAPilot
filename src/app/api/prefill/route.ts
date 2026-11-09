import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText, Output } from "ai";
import { z } from "zod";
import { getCurrentUser } from "@/lib/supabase/server";
import { getConventions } from "@/lib/data";
import { describeAiError } from "@/lib/ai-errors";

/** Drafts the ticket title and description from the FSD's latest-version sections. */
export const maxDuration = 60;

const MODEL = process.env.ANTHROPIC_PREFILL_MODEL || "claude-haiku-5-5";

const inputSchema = z.object({
  programId: z.string().max(60).default(""),
  programTitle: z.string().max(300).default(""),
  version: z.string().max(20).default(""),
  changeId: z.string().max(30).default(""),
  ticketId: z.string().max(60).default(""),
  module: z.string().max(10).default(""),
  countryName: z.string().max(40).default(""),
  latestVersionText: z
    .string()
    .min(20, "No text found for the latest version.")
    .max(30_000),
  apiKey: z.string().max(300).optional(),
});

const outputSchema = z.object({
  title: z
    .string()
    .describe(
      "Ticket title, max 90 characters, says what changes, e.g. 'Add SFTP path options to download block'.",
    ),
  description: z
    .string()
    .describe(
      "What is requested and why, as the requester would describe it: 3-8 short bullet points, each on its own line starting with '- ' (separate them with a newline), expected behaviour, and anything explicitly out of scope. Plain text.",
    ),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user)
    return Response.json({ error: "Please sign in again." }, { status: 401 });

  const parsed = inputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return Response.json(
      { error: parsed.error.issues.map((i) => i.message).join(" ") },
      { status: 400 },
    );
  const t = parsed.data;

  const apiKey = t.apiKey?.trim() || process.env.ANTHROPIC_API_KEY;
  if (!apiKey)
    return Response.json(
      { error: "No Anthropic API key configured." },
      { status: 500 },
    );

  const { language } = await getConventions(user.id);
  try {
    const { output } = await generateText({
      model: createAnthropic({ apiKey })(MODEL),
      output: Output.object({ schema: outputSchema }),
      system: `You summarise SAP functional specifications (FSD) into a support/change ticket.
Use only what the FSD text says; don't invent requirements. Keep SAP object, field and transaction names as written.
Write in ${language || "English"}.`,
      prompt: `Program: ${t.programId} ${t.programTitle}
Country: ${t.countryName || "-"} · Module: ${t.module || "-"}
FSD version: ${t.version} · Change ID: ${t.changeId} · Ticket: ${t.ticketId}

FSD text for version ${t.version} (may come from several sections of the document):
"""
${t.latestVersionText}
"""`,
    });
    return Response.json(output);
  } catch (err) {
    console.error("[prefill] failed:", err);
    const { message, status } = describeAiError(err);
    return Response.json(
      { error: `Couldn't draft the title and description: ${message}` },
      { status },
    );
  }
}
