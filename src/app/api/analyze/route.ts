import { after } from "next/server";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createTextStreamResponse, Output, streamText, toTextStream } from "ai";
import { analysisSchema, ticketInputSchema } from "@/lib/schema";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/prompt";
import { getCurrentUser } from "@/lib/supabase/server";
import { getConventions, saveAnalysis } from "@/lib/data";
import { describeAiError } from "@/lib/ai-errors";

// Large tickets with code can take a while to analyse.
export const maxDuration = 120;

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Please sign in again." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = ticketInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues.map((i) => i.message).join(" ") },
      { status: 400 },
    );
  }
  const input = parsed.data;

  // Bring-your-own-key takes priority, so a client can keep usage on their own Anthropic account.
  const apiKey = input.apiKey?.trim() || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      {
        error:
          "No Anthropic API key configured. Add one in Settings or set ANTHROPIC_API_KEY on the server.",
      },
      { status: 500 },
    );
  }

  const conventions = await getConventions(user.id);
  const anthropic = createAnthropic({ apiKey });
  const analysisId = crypto.randomUUID();

  const result = streamText({
    model: anthropic(MODEL),
    output: Output.object({ schema: analysisSchema }),
    system: buildSystemPrompt(conventions),
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: buildUserPrompt(input) },
          // Each FSD image follows a text label so the model can match it to [Image N] in the FSD.
          ...input.images.flatMap((img) => [
            {
              type: "text" as const,
              text: `${img.label}${img.section ? ` (FSD section: ${img.section})` : ""}:`,
            },
            {
              type: "image" as const,
              image: img.data,
              mediaType: img.mediaType,
            },
          ]),
        ],
      },
    ],
    onError: ({ error }) => console.error("[analyze] stream error:", error),
  });

  // Save to history once the stream has finished, without delaying the response.
  after(async () => {
    try {
      const [output, usage] = await Promise.all([
        result.output,
        result.totalUsage,
      ]);
      await saveAnalysis({
        id: analysisId,
        userId: user.id,
        ticketId: input.ticketId,
        title: input.title,
        module: input.module,
        changeId: input.changeId,
        fsdVersion: input.fsdVersion,
        description: input.description,
        code: input.code,
        spec: input.spec,
        result: output,
        model: MODEL,
        inputTokens: usage.inputTokens ?? undefined,
        outputTokens: usage.outputTokens ?? undefined,
      });
    } catch (err) {
      // Aborted or invalid output: nothing to save.
      console.error(
        "[analyze] not saved:",
        err instanceof Error ? err.message : err,
      );
    }
  });

  // Wait for the first output (or error) before answering, so a failing API call
  // (no credit, bad key, unknown model) becomes a clear error instead of an empty result.
  const reader = result.stream.getReader();
  const buffered: Awaited<ReturnType<typeof reader.read>>["value"][] = [];
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value.type === "error") {
      reader.cancel().catch(() => {});
      const { message, status } = describeAiError(value.error);
      return Response.json({ error: message }, { status });
    }
    buffered.push(value);
    if (value.type === "text-delta") break;
  }
  const stream = new ReadableStream<(typeof buffered)[number]>({
    start(controller) {
      for (const part of buffered) if (part) controller.enqueue(part);
    },
    async pull(controller) {
      const { value, done } = await reader.read();
      if (done) controller.close();
      else controller.enqueue(value);
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });

  return createTextStreamResponse({
    headers: { "x-analysis-id": analysisId },
    stream: toTextStream({ stream: stream as typeof result.stream }),
  });
}
