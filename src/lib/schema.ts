import { z } from "zod";

/** What the user submits from the workspace. */
export const ticketInputSchema = z.object({
  ticketId: z.string().max(100).default(""),
  title: z.string().max(300).default(""),
  module: z.string().max(50).default(""),
  /** Change number for code tags, e.g. "C075" (Amend # in the FSD version table). */
  changeId: z.string().max(30).default(""),
  /** FSD version being implemented, e.g. "68.0". */
  fsdVersion: z.string().max(20).default(""),
  /** Country of the program, e.g. "Thailand". */
  country: z.string().max(40).default(""),
  description: z
    .string()
    .min(10, "Describe the ticket in at least 10 characters.")
    .max(30_000),
  code: z
    .string()
    .max(200_000, "The code is too long (max 200,000 characters).")
    .default(""),
  /** Functional specification (FSD) text, extracted in the browser from a .docx. */
  spec: z
    .string()
    .max(
      300_000,
      "The FSD is too long (max 300,000 characters). Delete old version history you don't need.",
    )
    .default(""),
  /** Screenshots/diagrams from the FSD (resized in the browser). Sent to the AI, not stored. */
  images: z
    .array(
      z.object({
        label: z.string().regex(/^Image \d{1,3}$/),
        mediaType: z.enum(["image/jpeg", "image/png"]),
        data: z
          .string()
          .max(1_500_000)
          .regex(/^[A-Za-z0-9+/]+=*$/, "Invalid image data."),
        section: z.string().max(300).default(""),
      }),
    )
    .max(25, "Too many images (max 25).")
    .default([])
    .refine(
      (imgs) => imgs.reduce((n, i) => n + i.data.length, 0) <= 3_500_000,
      {
        message:
          "The images are too large in total. Remove some and try again.",
      },
    ),
  /** Optional "bring your own key". Never stored server-side. */
  apiKey: z.string().max(300).optional(),
});

/** Client-side limits, kept in sync with the schema above. */
export const MAX_SPEC_CHARS = 300_000;
export const MAX_CODE_CHARS = 200_000;

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
      fileName: z
        .string()
        .describe(
          'Name from the "*&---- File: <name> ----*" label of the uploaded file this change goes into. Empty for a new object or when no files are labelled.',
        ),
      location: z
        .string()
        .describe(
          'Where in that file, e.g. "FORM get_data", "METHOD check_item", "START-OF-SELECTION". Empty for a new object.',
        ),
      originalCode: z
        .string()
        .describe(
          "The exact lines of the uploaded code that this change replaces, copied verbatim and in order (no edits, no \"...\", no skipped lines). Usually 3-40 lines around the change. Empty string for a new object (new FORM, include, class).",
        ),
      abapCode: z
        .string()
        .describe(
          "The new code: the full replacement for originalCode (unchanged context lines included as-is), or the complete new object. Wrapped in the team's change tag format. No Markdown fences.",
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
