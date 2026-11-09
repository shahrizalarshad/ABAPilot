import type { Analysis } from "./schema";
import type { DeepPartial } from "ai";
import { diffLines, locationText, type SourceIndex } from "./code-diff";

type A = DeepPartial<Analysis>;

/** Turn an (even partial) analysis into a Markdown document for Jira / ServiceNow / Word. */
export function analysisToMarkdown(
  a: A,
  ticketId?: string,
  title?: string,
  check: { source: SourceIndex | null; exactLines: boolean } = {
    source: null,
    exactLines: false,
  },
): string {
  const out: string[] = [];
  out.push(
    `# ${[ticketId, title].filter(Boolean).join(" — ") || "Ticket analysis"}`,
  );
  out.push(
    `**Type:** ${a.ticketType ?? "-"} · **Module:** ${a.sapModule ?? "-"} · **Complexity:** ${a.complexity ?? "-"} · **Estimate:** ${a.estimatedHours ?? "-"} h`,
  );
  if (a.summary) out.push(`## Summary\n${a.summary}`);
  if (a.analysis) out.push(`## Technical analysis\n${a.analysis}`);
  if (a.clarifyingQuestions?.length)
    out.push(
      `## Clarifying questions\n${a.clarifyingQuestions.map((q) => `- ${q}`).join("\n")}`,
    );
  if (a.affectedObjects?.length)
    out.push(
      `## Affected objects\n| Object | Type | Action | Reason |\n|---|---|---|---|\n` +
        a.affectedObjects
          .map(
            (o) =>
              `| ${o?.name ?? ""} | ${o?.objectType ?? ""} | ${o?.action ?? ""} | ${o?.reason ?? ""} |`,
          )
          .join("\n"),
    );
  if (a.solution) out.push(`## Proposed solution\n${a.solution}`);
  if (a.codeChanges?.length)
    out.push(
      `## Code changes\n` +
        a.codeChanges
          .map((c) => {
            const where = [c?.fileName, c?.location]
              .filter(Boolean)
              .join(" · ");
            const found = locationText(check.source, check.exactLines, c);
            const head = [where, found].filter(Boolean).join(" — ");
            const body = c?.originalCode?.trim()
              ? "```diff\n" +
                diffLines(c.originalCode, c?.abapCode ?? "")
                  .map(
                    (o) =>
                      (o.type === "del" ? "-" : o.type === "ins" ? "+" : " ") +
                      o.text,
                  )
                  .join("\n") +
                "\n```"
              : `New code:\n\n\`\`\`abap\n${c?.abapCode ?? ""}\n\`\`\``;
            return `### ${c?.objectName ?? ""}\n${head ? `_${head}_\n\n` : ""}${c?.description ?? ""}\n\n${body}`;
          })
          .join("\n\n"),
    );
  if (a.testCases?.length)
    out.push(
      `## Test cases\n| ID | Type | Scenario | Steps | Expected |\n|---|---|---|---|---|\n` +
        a.testCases
          .map(
            (t) =>
              `| ${t?.id ?? ""} | ${t?.type ?? ""} | ${t?.scenario ?? ""} | ${(t?.steps ?? "").replace(/\n/g, "<br>")} | ${t?.expectedResult ?? ""} |`,
          )
          .join("\n"),
    );
  if (a.risks?.length)
    out.push(`## Risks\n${a.risks.map((r) => `- ${r}`).join("\n")}`);
  if (a.changeLog) out.push(`## Change log / documentation\n${a.changeLog}`);
  return out.join("\n\n");
}
