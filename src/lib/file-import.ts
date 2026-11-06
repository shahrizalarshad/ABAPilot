"use client";

/**
 * Browser-side file reading. Files never leave the browser: only the extracted
 * text is sent with the analysis request.
 */

export const CODE_ACCEPT =
  ".abap,.txt,.prog,.incl,.clas,.intf,.fugr,.ddls,.asddls,.bdef,.xml,.sql,.log";
export const SPEC_ACCEPT = ".docx,.txt,.md";

export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB per file

export class ImportError extends Error {}

/** Read ABAP source / dump / log files and label each one with its file name. */
export async function readCodeFiles(files: File[]): Promise<string> {
  const parts: string[] = [];
  for (const f of files) {
    if (f.size > MAX_FILE_BYTES)
      throw new ImportError(`${f.name} is larger than 10 MB.`);
    const text = (await f.text()).replace(/\r\n/g, "\n").trimEnd();
    if (/[\u0000-\u0008]/.test(text.slice(0, 2000))) {
      throw new ImportError(`${f.name} doesn't look like a text file.`);
    }
    parts.push(`*&---- File: ${f.name} ----*\n${text}`);
  }
  return parts.join("\n\n");
}

/** Extract an FSD / spec to structured plain text (headings, lists, tables kept). */
export async function readSpecFile(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES)
    throw new ImportError(`${file.name} is larger than 10 MB.`);
  const name = file.name.toLowerCase();

  if (name.endsWith(".doc")) {
    throw new ImportError(
      "Old Word format (.doc) isn't supported. Open it in Word and use File → Save As → .docx.",
    );
  }
  if (name.endsWith(".txt") || name.endsWith(".md"))
    return (await file.text()).trim();
  if (!name.endsWith(".docx"))
    throw new ImportError("Please upload a .docx (Word) file.");

  const mammoth = await import("mammoth");
  let html: string;
  try {
    ({ value: html } = await mammoth.convertToHtml({
      arrayBuffer: await file.arrayBuffer(),
    }));
  } catch {
    throw new ImportError(
      `Couldn't read ${file.name}. Is it a valid, unprotected .docx file?`,
    );
  }
  const text = htmlToStructuredText(html);
  if (!text.trim())
    throw new ImportError(`${file.name} contains no readable text.`);
  return text;
}

function htmlToStructuredText(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const out: string[] = [];
  const clean = (s: string | null) => (s ?? "").replace(/\s+/g, " ").trim();

  const walk = (el: Element) => {
    for (const node of Array.from(el.children)) {
      const tag = node.tagName.toLowerCase();
      if (/^h[1-6]$/.test(tag)) {
        out.push(`${"#".repeat(Number(tag[1]))} ${clean(node.textContent)}`);
      } else if (tag === "p") {
        const t = clean(node.textContent);
        if (t) out.push(t);
      } else if (tag === "ul" || tag === "ol") {
        Array.from(node.children).forEach((li, i) =>
          out.push(
            `${tag === "ol" ? `${i + 1}.` : "-"} ${clean(li.textContent)}`,
          ),
        );
      } else if (tag === "table") {
        const rows = Array.from(node.querySelectorAll("tr")).map(
          (tr) =>
            `| ${Array.from(tr.children)
              .map((c) => clean(c.textContent).replace(/\|/g, "/"))
              .join(" | ")} |`,
        );
        if (rows.length) out.push(rows.join("\n"));
      } else {
        walk(node);
      }
    }
  };
  walk(doc.body);
  return out.join("\n\n");
}
