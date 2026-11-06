import { z } from "zod";

/** What the user submits from the workspace. */
export const ticketInputSchema = z.object({
  ticketId: z.string().max(100).default(""),
  title: z.string().max(300).default(""),
  module: z.string().max(50).default(""),
  description: z
    .string()
    .min(10, "Describe the ticket in at least 10 characters.")
    .max(30_000),
  code: z.string().max(60_000).default(""),
  /** Optional "bring your own key". Never stored server-side. */
  apiKey: z.string().max(300).optional(),
});

export type TicketInput = z.infer<typeof ticketInputSchema>;

/** What the AI returns. Shared by the API route (validation) and the client (streaming). */
export const analysisSchema = z.object({
  summary: z
    .string()
    .describe(
      "2-3 sentence plain-language summary of what the ticket asks for.",
    ),
  ticketType: z
    .enum(["bug", "change_request", "enhancement", "question", "unclear"])
    .describe("Best classification of the ticket."),
  sapModule: z
    .string()
    .describe("Most likely SAP module/area, e.g. SD, MM, FI, WM, Basis."),
  complexity: z.enum(["low", "medium", "high"]),
  estimatedHours: z
    .number()
    .describe("Realistic effort estimate in hours, including unit testing."),
  analysis: z
    .string()
    .describe(
      "Technical analysis / root cause in Markdown. Reference the provided code where relevant.",
    ),
  clarifyingQuestions: z
    .array(z.string())
    .describe(
      "Questions to ask the functional consultant or user before building. Empty if none.",
    ),
  affectedObjects: z.array(
    z.object({
      name: z
        .string()
        .describe(
          "Object name, e.g. ZSD_ORDER_REPORT, ZCL_PRICING, USEREXIT_SAVE_DOCUMENT.",
        ),
      objectType: z
        .string()
        .describe(
          "Program, Class, Function Module, Table, CDS View, Enhancement, Include, etc.",
        ),
      action: z.enum(["modify", "create", "review"]),
      reason: z.string(),
    }),
  ),
  solution: z
    .string()
    .describe("Proposed solution approach in Markdown, step by step."),
  codeChanges: z.array(
    z.object({
      objectName: z.string(),
      description: z.string(),
      abapCode: z
        .string()
        .describe(
          "Complete ABAP snippet wrapped in the team's change tag format. No Markdown fences.",
        ),
    }),
  ),
  testCases: z.array(
    z.object({
      id: z.string().describe("e.g. TC-01"),
      scenario: z.string(),
      steps: z
        .string()
        .describe("Numbered steps incl. transaction codes and test data."),
      expectedResult: z.string(),
      type: z.enum(["positive", "negative", "regression"]),
    }),
  ),
  risks: z
    .array(z.string())
    .describe("Risks, side effects, performance or authorization concerns."),
  changeLog: z
    .string()
    .describe(
      "Ready-to-paste technical documentation / change log entry for the ticket (Markdown).",
    ),
});

export type Analysis = z.infer<typeof analysisSchema>;
