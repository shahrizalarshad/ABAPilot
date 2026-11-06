"use client";

import { readEmbeddedObjects, type EmbeddedObject } from "./docx-objects";

/**
 * Browser-side file reading. Files never leave the browser: only the extracted
 * text is sent with the analysis request.
 */

export const CODE_ACCEPT =
  ".abap,.txt,.prog,.incl,.clas,.intf,.fugr,.ddls,.asddls,.bdef,.xml,.sql,.log";
export const SPEC_ACCEPT = ".docx,.txt,.md";

export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB per file

export class ImportError extends Error {}

/**
 * SAP GUI downloads use the PC's code page, not UTF-8: Windows-1252 (e.g. Word
 * "smart quotes" pasted into comments) or Windows-874 for Thai texts.
 */
export function decodeText(buf: ArrayBuffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true })
      .decode(buf)
      .replace(/^\uFEFF/, "");
  } catch {
    const thai = new TextDecoder("windows-874").decode(buf);
    if (/[\u0E01-\u0E5B]/.test(thai)) return thai;
    return new TextDecoder("windows-1252").decode(buf);
  }
}

/** Read ABAP source / dump / log files and label each one with its file name. */
export async function readCodeFiles(files: File[]): Promise<string> {
  const parts: string[] = [];
  for (const f of files) {
    if (f.size > MAX_FILE_BYTES)
      throw new ImportError(`${f.name} is larger than 10 MB.`);
    const text = decodeText(await f.arrayBuffer())
      .replace(/\r\n/g, "\n")
      .trimEnd();
    if (/[\u0000-\u0008]/.test(text.slice(0, 2000))) {
      throw new ImportError(`${f.name} doesn't look like a text file.`);
    }
    parts.push(`*&---- File: ${f.name} ----*\n${text}`);
  }
  return parts.join("\n\n");
}

/** An image found in the FSD. Encoded for sending only if the user selects it. */
export type SpecImage = {
  /** "Image 3", matching the [Image 3] marker in the FSD text. */
  label: string;
  /** Original embedded image (data URL). */
  src: string;
  /** Small JPEG thumbnail (data URL) for the picker. */
  thumb: string;
  /** Nearest heading or "Version X" paragraph above the image. */
  section: string;
  /** Version number of the block the image is in, if the FSD uses "Version 12.0" / "Ver 12" labels. */
  version: number | null;
};

/** What is sent to the API for a selected image. */
export type EncodedImage = {
  label: string;
  mediaType: "image/jpeg";
  data: string;
  section: string;
};

export type SpecResult = {
  text: string;
  images: SpecImage[];
  /** Labels selected by default: the latest version's images, or all for small FSDs. */
  defaultSelection: string[];
  skipped: string[];
  /** Embedded objects found (Excel sheets read into the text; others noted). */
  objects: EmbeddedObject[];
};

export const MAX_IMAGES = 25;
/** Total base64 budget for images, to stay well under the 4.5 MB request limit. */
export const MAX_IMAGE_CHARS = 3_200_000;
const MAX_EDGE = 1568; // Claude's recommended max image edge
const VERSION_RE = /^(?:version|ver\.?|v)\s*(\d+(?:\.\d+)?)\b/i;

/** Extract an FSD / spec: structured text (headings, lists, tables) plus its images. */
export async function readSpecFile(file: File): Promise<SpecResult> {
  if (file.size > 25 * 1024 * 1024)
    throw new ImportError(`${file.name} is larger than 25 MB.`);
  const name = file.name.toLowerCase();

  if (name.endsWith(".doc")) {
    throw new ImportError(
      "Old Word format (.doc) isn't supported. Open it in Word and use File → Save As → .docx.",
    );
  }
  if (name.endsWith(".txt") || name.endsWith(".md"))
    return {
      text: decodeText(await file.arrayBuffer()).trim(),
      images: [],
      defaultSelection: [],
      skipped: [],
      objects: [],
    };
  if (!name.endsWith(".docx"))
    throw new ImportError("Please upload a .docx (Word) file.");

  const mammoth = await import("mammoth");
  const buffer = await file.arrayBuffer();
  // Embedded Excel/PDF/Visio objects appear to mammoth only as their preview picture.
  const objectsByPreview = await readEmbeddedObjects(buffer);
  const objectIds = [...objectsByPreview.keys()];
  const usedObjects = new Set<number>();
  let html: string;
  try {
    ({ value: html } = await mammoth.convertToHtml(
      { arrayBuffer: buffer },
      {
        convertImage: mammoth.images.imgElement(async (image) => {
          const data = await image.readAsBase64String();
          const id = objectIds.indexOf(data);
          if (id >= 0) {
            usedObjects.add(id);
            return { src: `object:${id}` };
          }
          return { src: `data:${image.contentType};base64,${data}` };
        }),
      },
    ));
  } catch {
    throw new ImportError(
      `Couldn't read ${file.name}. Is it a valid, unprotected .docx file?`,
    );
  }

  const objectList = [...objectsByPreview.values()];
  const { text: rawText, found } = htmlToStructuredText(
    html,
    (id) => objectList[id]?.text ?? "",
  );
  let text = rawText;
  const images: SpecImage[] = [];
  const skipped: string[] = [];
  const thumbs = new Map<string, string | "tiny" | null>(); // same picture is often reused

  for (const img of found) {
    const marker = `[${img.label}]`;
    if (!thumbs.has(img.src)) thumbs.set(img.src, await makeThumb(img.src));
    const thumb = thumbs.get(img.src)!;
    if (thumb === "tiny") {
      text = text.replace(marker, ""); // icons, bullets, spacer images
    } else if (!thumb) {
      const kind = /x-emf|x-wmf/.test(img.src.slice(0, 40))
        ? "EMF/WMF drawing"
        : "unsupported format";
      skipped.push(`${img.label} (${kind})`);
      text = text.replace(
        marker,
        `[${img.label}: could not be read (${kind})]`,
      );
    } else {
      images.push({ ...img, thumb });
    }
  }

  text = text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!text && images.length === 0)
    throw new ImportError(`${file.name} contains no readable text.`);
  return {
    text,
    images,
    defaultSelection: pickDefault(images),
    skipped,
    objects: [...usedObjects].map((i) => objectList[i]),
  };
}

/** Small FSDs: everything. Large ones: the highest version's images (what you're working on). */
function pickDefault(images: SpecImage[]): string[] {
  if (images.length <= MAX_IMAGES) return images.map((i) => i.label);
  const versions = images
    .map((i) => i.version)
    .filter((v): v is number => v != null);
  if (!versions.length) return [];
  const latest = Math.max(...versions);
  return images
    .filter((i) => i.version === latest)
    .slice(0, MAX_IMAGES)
    .map((i) => i.label);
}

async function loadImage(src: string): Promise<HTMLImageElement | null> {
  if (!/^data:image\/(png|jpe?g|gif|bmp|webp)/i.test(src)) return null;
  const el = new Image();
  try {
    el.src = src;
    await el.decode();
    return el;
  } catch {
    return null;
  }
}

function toJpeg(
  el: HTMLImageElement,
  maxEdge: number,
  quality: number,
): string {
  const { naturalWidth: w, naturalHeight: h } = el;
  const scale = Math.min(1, maxEdge / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff"; // transparent PNGs → white, not black, in JPEG
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(el, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

async function makeThumb(src: string): Promise<string | "tiny" | null> {
  const el = await loadImage(src);
  if (!el) return null;
  if (el.naturalWidth < 48 || el.naturalHeight < 48) return "tiny";
  return toJpeg(el, 240, 0.7);
}

/**
 * Re-encode the selected images for Claude: max 1568px, JPEG. Steps the size
 * down if the total would exceed the request budget.
 */
export async function encodeImages(
  images: SpecImage[],
): Promise<EncodedImage[]> {
  for (const [edge, quality] of [
    [MAX_EDGE, 0.85],
    [1280, 0.75],
    [1024, 0.7],
  ] as const) {
    const out: EncodedImage[] = [];
    let total = 0;
    for (const img of images) {
      const el = await loadImage(img.src);
      if (!el) continue;
      const data = toJpeg(el, edge, quality).split(",")[1];
      total += data.length;
      out.push({
        label: img.label,
        mediaType: "image/jpeg",
        data,
        section: img.section,
      });
    }
    if (total <= MAX_IMAGE_CHARS) return out;
  }
  throw new ImportError(
    "The selected images are too large to send together. Select fewer images.",
  );
}

type FoundImage = Omit<SpecImage, "thumb">;

function htmlToStructuredText(
  html: string,
  objectText: (id: number) => string,
): {
  text: string;
  found: FoundImage[];
} {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const out: string[] = [];
  const found: FoundImage[] = [];
  const blocks: string[] = [];
  let section = "";
  let version: number | null = null;
  const clean = (s: string | null) => (s ?? "").replace(/\s+/g, " ").trim();

  const addImage = (src: string) => {
    // Preview picture of an embedded object: insert the object's content instead.
    // (A token survives whitespace cleanup; the table is swapped in at the end.)
    if (src.startsWith("object:")) {
      blocks.push(objectText(Number(src.slice(7))));
      return ` @@OBJECT${blocks.length - 1}@@ `;
    }
    const label = `Image ${found.length + 1}`;
    found.push({ label, src, section, version });
    return `[${label}]`;
  };

  /** Text of an element with each <img> replaced by an [Image N] marker. */
  const textWithImages = (el: Element): string => {
    let result = "";
    el.childNodes.forEach((n) => {
      if (n.nodeType === Node.TEXT_NODE) result += n.textContent ?? "";
      else if (n instanceof HTMLImageElement)
        result += ` ${addImage(n.getAttribute("src") ?? "")} `;
      else if (n instanceof Element) result += textWithImages(n);
    });
    return result;
  };

  /** Track "Version 68.0" / "Ver 63.0" paragraphs (often not real headings in FSDs). */
  const noteSection = (t: string, isHeading: boolean) => {
    const m = t.match(VERSION_RE);
    if (m && t.length <= 80) {
      version = Number(m[1]);
      section = t;
    } else if (isHeading && t) {
      section = t;
    }
  };

  const walk = (el: Element) => {
    for (const node of Array.from(el.children)) {
      const tag = node.tagName.toLowerCase();
      if (/^h[1-6]$/.test(tag)) {
        noteSection(clean(node.textContent), true);
        out.push(
          `${"#".repeat(Number(tag[1]))} ${clean(textWithImages(node))}`,
        );
      } else if (tag === "img") {
        out.push(addImage(node.getAttribute("src") ?? ""));
      } else if (tag === "p") {
        noteSection(clean(node.textContent), false);
        const t = clean(textWithImages(node));
        if (t) out.push(t);
      } else if (tag === "ul" || tag === "ol") {
        Array.from(node.children).forEach((li, i) =>
          out.push(
            `${tag === "ol" ? `${i + 1}.` : "-"} ${clean(textWithImages(li))}`,
          ),
        );
      } else if (tag === "table") {
        const rows = Array.from(node.querySelectorAll("tr")).map((tr) => {
          // A version label in the first cell of a row also starts a new block.
          noteSection(clean(tr.children[0]?.textContent ?? ""), false);
          return `| ${Array.from(tr.children)
            .map((c) => clean(textWithImages(c)).replace(/\|/g, "/"))
            .join(" | ")} |`;
        });
        if (rows.length) out.push(rows.join("\n"));
      } else {
        walk(node);
      }
    }
  };
  walk(doc.body);
  const text = out
    .join("\n\n")
    .replace(/ ?@@OBJECT(\d+)@@ ?/g, (_, i) => `\n\n${blocks[Number(i)]}\n\n`);
  return { text, found };
}
