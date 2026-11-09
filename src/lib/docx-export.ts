"use client";

import type { DeepPartial } from "ai";
import type { Analysis } from "./schema";
import { diffLines, locationText, type SourceIndex } from "./code-diff";

/** Ticket context printed in the document header. */
export type ExportMeta = {
  ticketId?: string;
  title?: string;
  module?: string;
  changeId?: string;
  fsdVersion?: string;
  country?: string;
  programId?: string;
  technicalAuthor?: string;
};

const MONO = "Consolas";
const ACCENT = "0D6655";

/** Build a technical-spec .docx for an analysis and trigger a download. */
export async function downloadTechSpec(
  a: DeepPartial<Analysis>,
  meta: ExportMeta,
  check: { source: SourceIndex | null; exactLines: boolean } = {
    source: null,
    exactLines: false,
  },
) {
  const d = await import("docx");
  const {
    AlignmentType,
    BorderStyle,
    Document,
    HeadingLevel,
    Packer,
    Paragraph,
    ShadingType,
    Table,
    TableCell,
    TableRow,
    TextRun,
    WidthType,
  } = d;

  const today = new Date();
  const ddmmyy = [
    today.getDate(),
    today.getMonth() + 1,
    today.getFullYear() % 100,
  ]
    .map((n) => String(n).padStart(2, "0"))
    .join(".");

  const border = { style: BorderStyle.SINGLE, size: 4, color: "A6A6A6" };
  const borders = { top: border, bottom: border, left: border, right: border };

  /** Inline **bold** and `code` runs. */
  const runs = (text: string, opts: { bold?: boolean; size?: number } = {}) =>
    text
      .split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
      .filter(Boolean)
      .map((part) =>
        part.startsWith("**") && part.endsWith("**")
          ? new TextRun({
              text: part.slice(2, -2),
              bold: true,
              size: opts.size,
            })
          : part.startsWith("`") && part.endsWith("`")
            ? new TextRun({
                text: part.slice(1, -1),
                font: MONO,
                size: opts.size ?? 20,
              })
            : new TextRun({ text: part, bold: opts.bold, size: opts.size }),
      );

  /** Light Markdown (headings, bullets, numbered items, code fences) → paragraphs. */
  const md = (text?: string) => {
    if (!text)
      return [
        new Paragraph({
          children: [new TextRun({ text: "-", color: "808080" })],
        }),
      ];
    const out: InstanceType<typeof Paragraph>[] = [];
    let inCode = false;
    for (const raw of text.split("\n")) {
      if (raw.trim().startsWith("```")) {
        inCode = !inCode;
        continue;
      }
      if (inCode) {
        out.push(codeLine(raw));
        continue;
      }
      const line = raw.trimEnd();
      if (!line.trim()) continue;
      const h = line.match(/^#{1,4}\s+(.*)/);
      const bullet = line.match(/^\s*[-*]\s+(.*)/);
      const numbered = line.match(/^\s*(\d+)[.)]\s+(.*)/);
      if (h)
        out.push(
          new Paragraph({
            children: runs(h[1], { bold: true }),
            spacing: { before: 120 },
          }),
        );
      else if (bullet)
        out.push(
          new Paragraph({ children: runs(bullet[1]), bullet: { level: 0 } }),
        );
      else if (numbered)
        out.push(
          new Paragraph({
            children: [new TextRun(`${numbered[1]}. `), ...runs(numbered[2])],
            indent: { left: 360 },
          }),
        );
      else
        out.push(
          new Paragraph({ children: runs(line), spacing: { after: 80 } }),
        );
    }
    return out;
  };

  const codeLine = (line: string, fill = "F2F2F2") =>
    new Paragraph({
      children: [new TextRun({ text: line || " ", font: MONO, size: 17 })],
      shading: { type: ShadingType.CLEAR, color: "auto", fill },
      spacing: { after: 0, line: 240 },
    });

  /** Current / New table: removed lines tinted red, added lines tinted green. */
  const beforeAfter = (original: string, next: string) => {
    const ops = diffLines(original, next);
    const block = (label: string, lines: { text: string; fill?: string }[]) => [
      new TableRow({
        children: [
          new TableCell({
            borders,
            shading: { type: ShadingType.CLEAR, color: "auto", fill: "DCEFE9" },
            children: [
              new Paragraph({
                children: [new TextRun({ text: label, bold: true, size: 18 })],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            borders,
            children: lines.map((l) => codeLine(l.text, l.fill ?? "FFFFFF")),
          }),
        ],
      }),
    ];
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        ...block(
          "Current code",
          ops
            .filter((o) => o.type !== "ins")
            .map((o) => ({
              text: o.text,
              fill: o.type === "del" ? "FBE3E4" : undefined,
            })),
        ),
        ...block(
          "New code",
          ops
            .filter((o) => o.type !== "del")
            .map((o) => ({
              text: o.text,
              fill: o.type === "ins" ? "DDF3E9" : undefined,
            })),
        ),
      ],
    });
  };

  const heading = (text: string) =>
    new Paragraph({
      text,
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 300, after: 120 },
    });

  const cell = (
    text: string,
    opts: { header?: boolean; width?: number; mono?: boolean } = {},
  ) =>
    new TableCell({
      borders,
      width: opts.width
        ? { size: opts.width, type: WidthType.PERCENTAGE }
        : undefined,
      shading: opts.header
        ? { type: ShadingType.CLEAR, color: "auto", fill: "DCEFE9" }
        : undefined,
      children: (text || "").split("\n").map(
        (l) =>
          new Paragraph({
            children: [
              new TextRun({
                text: l,
                bold: opts.header,
                font: opts.mono ? MONO : undefined,
                size: 18,
              }),
            ],
          }),
      ),
    });

  const table = (
    header: string[],
    rows: string[][],
    widths?: number[],
    monoCol?: number,
  ) =>
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: header.map((h, i) =>
            cell(h, { header: true, width: widths?.[i] }),
          ),
        }),
        ...rows.map(
          (r) =>
            new TableRow({
              children: r.map((v, i) =>
                cell(v, { width: widths?.[i], mono: i === monoCol }),
              ),
            }),
        ),
      ],
    });

  const keyValue = (pairs: [string, string | undefined][]) =>
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: pairs
        .filter(([, v]) => v)
        .map(
          ([k, v]) =>
            new TableRow({
              children: [
                cell(k, { header: true, width: 28 }),
                cell(v ?? "", { width: 72 }),
              ],
            }),
        ),
    });

  const title =
    [meta.ticketId, meta.title].filter(Boolean).join(" — ") ||
    "Technical analysis";
  const children: (
    | InstanceType<typeof Paragraph>
    | InstanceType<typeof Table>
  )[] = [
    new Paragraph({
      children: [
        new TextRun({
          text: "Technical Specification",
          bold: true,
          size: 36,
          color: ACCENT,
        }),
      ],
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [new TextRun({ text: title, size: 26 })],
      spacing: { after: 240 },
    }),
    keyValue([
      ["Program", meta.programId],
      ["Ticket ID", meta.ticketId],
      ["Change ID", meta.changeId],
      ["FSD version", meta.fsdVersion],
      ["Module", meta.module || a.sapModule],
      ["Country", meta.country],
      ["Type", a.ticketType?.replace("_", " ")],
      ["Complexity", a.complexity],
      [
        "Estimated effort",
        a.estimatedHours != null ? `${a.estimatedHours} hours` : undefined,
      ],
      ["Prepared", ddmmyy],
    ]),
  ];

  if (meta.fsdVersion || meta.changeId) {
    children.push(
      heading("Version Control entry (suggested)"),
      new Paragraph({
        children: [
          new TextRun({
            text: "Add this row to the FSD's Version Control table:",
            italics: true,
            size: 18,
          }),
        ],
      }),
      table(
        [
          "Ver #",
          "Amend #",
          "Date",
          "Status",
          "Project/PCR/DCR",
          "Functional Author",
          "Technical Author",
        ],
        [
          [
            meta.fsdVersion ?? "",
            meta.changeId ?? "",
            ddmmyy,
            "Draft",
            meta.ticketId ?? "",
            "",
            meta.technicalAuthor ?? "",
          ],
        ],
      ),
    );
  }

  children.push(heading("1. Summary"), ...md(a.summary));
  children.push(heading("2. Technical analysis"), ...md(a.analysis));
  if (a.clarifyingQuestions?.length)
    children.push(
      heading("3. Ask before building"),
      ...md(a.clarifyingQuestions.map((q) => `- ${q}`).join("\n")),
    );
  if (a.affectedObjects?.length)
    children.push(
      heading("4. Affected objects"),
      table(
        ["Object", "Type", "Action", "Reason"],
        a.affectedObjects.map((o) => [
          o?.name ?? "",
          o?.objectType ?? "",
          o?.action ?? "",
          o?.reason ?? "",
        ]),
        [24, 16, 10, 50],
        0,
      ),
    );
  children.push(heading("5. Solution"), ...md(a.solution));
  if (a.codeChanges?.length) {
    children.push(heading("6. Code changes"));
    for (const c of a.codeChanges) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: c?.objectName ?? "", bold: true, font: MONO }),
          ],
          spacing: { before: 200 },
        }),
      );
      const where = [
        [c?.fileName, c?.location].filter(Boolean).join(" · "),
        locationText(check.source, check.exactLines, c),
      ]
        .filter(Boolean)
        .join(" — ");
      if (where)
        children.push(
          new Paragraph({
            children: [new TextRun({ text: where, italics: true, size: 18 })],
            spacing: { after: 80 },
          }),
        );
      children.push(...md(c?.description));
      if (c?.originalCode?.trim())
        children.push(beforeAfter(c.originalCode, c?.abapCode ?? ""));
      else
        children.push(
          new Paragraph({
            children: [new TextRun({ text: "New code", bold: true, size: 18 })],
            spacing: { before: 80, after: 40 },
          }),
          ...(c?.abapCode ?? "").split("\n").map((l) => codeLine(l)),
        );
    }
  }
  if (a.testCases?.length)
    children.push(
      heading("7. Unit test cases"),
      table(
        ["ID", "Type", "Scenario", "Steps", "Expected result", "Result"],
        a.testCases.map((t) => [
          t?.id ?? "",
          t?.type ?? "",
          t?.scenario ?? "",
          t?.steps ?? "",
          t?.expectedResult ?? "",
          "",
        ]),
        [8, 10, 20, 32, 22, 8],
      ),
    );
  if (a.risks?.length)
    children.push(
      heading("8. Risks & side effects"),
      ...md(a.risks.map((r) => `- ${r}`).join("\n")),
    );
  if (a.changeLog) children.push(heading("9. Change log"), ...md(a.changeLog));
  children.push(
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { before: 400 },
      children: [
        new TextRun({
          text: "Draft prepared with ABAPilot (AI-assisted). Review and test in a development system before transport.",
          italics: true,
          size: 16,
          color: "808080",
        }),
      ],
    }),
  );

  const doc = new Document({
    creator: "ABAPilot",
    title,
    styles: {
      default: { document: { run: { font: "Calibri", size: 21 } } },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          run: { size: 26, bold: true, color: ACCENT },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const safe = (s?: string) => (s ?? "").replace(/[^\w.-]+/g, "_");
  const name =
    [safe(meta.programId), safe(meta.ticketId), safe(meta.changeId)]
      .filter(Boolean)
      .join("_") || "analysis";
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `TechSpec_${name}.docx`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
