import { createAnthropic } from "@ai-sdk/anthropic";
import { createTextStreamResponse, Output, streamText, toTextStream } from "ai";
import { analysisSchema, ticketInputSchema } from "@/lib/schema";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/prompt";

// Large tickets with code can take a while to analyse.
export const maxDuration = 120;

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";

export async function POST(req: Request) {
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

  // Bring-your-own-key takes priority, so client code never touches our account if they prefer.
  const apiKey = input.apiKey?.trim() || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      {
        error:
          "No Anthropic API key configured. Add one in Settings or set ANTHROPIC_API_KEY on the server.",
      },
      { status: 401 },
    );
  }

  const anthropic = createAnthropic({ apiKey });

  const result = streamText({
    model: anthropic(DEFAULT_MODEL),
    output: Output.object({ schema: analysisSchema }),
    system: buildSystemPrompt(input.conventions),
    prompt: buildUserPrompt(input),
    onError: ({ error }) => {
      console.error("[analyze] stream error:", error);
    },
  });

  return createTextStreamResponse({
    stream: toTextStream({ stream: result.stream }),
  });
}
