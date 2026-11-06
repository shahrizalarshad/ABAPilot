import Link from "next/link";
import {
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  ListChecks,
  Lock,
  Tags,
} from "lucide-react";
import { Nav } from "@/components/nav";

const steps = [
  {
    label: "Upload the FSD",
    text: "Drop the .docx. Ticket ID, change ID, module and version come straight from the Version Control table; screenshots and embedded Excel sheets are read too.",
  },
  {
    label: "Add the program",
    text: "Upload the program and its includes. Thirteen years of change history? Compact code removes comment noise and keeps your change tags.",
  },
  {
    label: "Review the work package",
    text: "Analysis, questions for the functional consultant, code wrapped in your change tags, unit tests and a Word technical spec.",
  },
];

const features = [
  {
    icon: Tags,
    title: "Your change tags",
    text: 'Every new line tagged the way your program already does it: "C075+, "C075-, BEGIN/END blocks.',
  },
  {
    icon: ImageIcon,
    title: "Reads the screenshots",
    text: "The red boxes and arrows in the FSD, grouped by version, with the latest version preselected.",
  },
  {
    icon: FileSpreadsheet,
    title: "Reads embedded Excel",
    text: "Output layouts and field mappings inside the FSD become tables the analysis can use.",
  },
  {
    icon: ListChecks,
    title: "Ask before building",
    text: "Gaps and contradictions in the FSD come back as questions, before you write a line.",
  },
  {
    icon: FileText,
    title: "Word tech spec",
    text: "Header, Version Control row, objects, code, unit tests with a Result column. Ready to attach.",
  },
  {
    icon: Lock,
    title: "Files stay on your machine",
    text: "The .docx and code files are read in your browser; only their text is sent for analysis.",
  },
];

const sample = [
  { t: "* Read borrow orders for the selection", k: "comment" },
  { t: "SELECT vbeln, posnr, netwr", k: "" },
  { t: "  FROM vbap", k: "" },
  { t: '  WHERE vbeln IN @s_vbeln            "C075-', k: "remove" },
  { t: '  WHERE vbeln IN @s_vbeln            "C075+', k: "add" },
  { t: "    AND pstyv <> 'TANN'             \"C075+", k: "add" },
  { t: "  INTO TABLE @DATA(lt_items).", k: "" },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-paper">
      <Nav />
      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 lg:grid-cols-[1.05fr_1fr] lg:py-24">
          <div>
            <p className="mb-4 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-spruce">
              For SAP ABAP technical consultants
            </p>
            <h1 className="font-display text-[40px] leading-[1.02] font-extrabold tracking-tight text-balance text-ink sm:text-[56px]">
              From FSD to transport.
            </h1>
            <p className="mt-5 max-w-xl text-[17px] leading-7 text-muted">
              Upload the functional spec and the ABAP program. ABAPilot drafts
              the analysis, the code change in your change tags, unit tests and
              a Word technical spec, ready for you to review.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/app"
                className="rounded-md bg-spruce px-5 py-2.5 text-sm font-semibold text-on-spruce hover:bg-spruce-hover"
              >
                Analyse a ticket
              </Link>
              <a
                href="#how"
                className="rounded-md border border-line-strong bg-surface px-5 py-2.5 text-sm font-medium text-ink hover:bg-sunken"
              >
                How it works
              </a>
            </div>
          </div>

          {/* Product visual: the change the analysis proposes, in the program's own tags. */}
          <figure
            className="min-w-0 overflow-hidden rounded-lg bg-code shadow-sm"
            aria-label="Example proposed code change"
          >
            <figcaption className="flex items-center justify-between border-b border-white/10 px-4 py-2 font-mono text-xs text-code-comment">
              <span>ZTHSDR0027_F01 · FORM get_data</span>
              <span>CHN-24644 · C075</span>
            </figcaption>
            <pre className="overflow-x-auto py-3 font-mono text-[13px] leading-[21px]">
              {sample.map((l, i) => (
                <span
                  key={i}
                  className={`block pr-4 whitespace-pre ${l.k === "add" ? "bg-code-added/10 text-code-added shadow-[inset_3px_0_0_var(--code-added)]" : l.k === "remove" ? "bg-code-removed/10 text-code-removed shadow-[inset_3px_0_0_var(--code-removed)]" : l.k === "comment" ? "text-code-comment" : "text-code-ink"}`}
                >
                  <span className="inline-block w-10 pr-3 text-right text-code-comment select-none">
                    {i + 1}
                  </span>
                  {l.t}
                </span>
              ))}
            </pre>
          </figure>
        </section>

        <section id="how" className="border-y border-line bg-surface">
          <ol className="mx-auto grid max-w-6xl gap-8 px-4 py-14 md:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.label} className="flex gap-3">
                <span className="flex h-6 w-6 flex-none items-center justify-center rounded-sm bg-spruce font-mono text-xs font-semibold text-on-spruce">
                  {i + 1}
                </span>
                <div>
                  <h2 className="font-semibold text-ink">{s.label}</h2>
                  <p className="mt-1 text-sm leading-6 text-muted">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto grid max-w-6xl gap-x-10 gap-y-8 px-4 py-16 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title}>
              <f.icon className="mb-3 h-5 w-5 text-spruce" />
              <h3 className="font-semibold text-ink">{f.title}</h3>
              <p className="mt-1 text-sm leading-6 text-muted">{f.text}</p>
            </div>
          ))}
        </section>

        <section className="border-t border-line bg-surface">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 md:grid-cols-[1fr_1.2fr]">
            <div>
              <h2 className="font-display text-[28px] leading-tight font-bold text-ink">
                Free during beta
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                Use ABAPilot free while we test it with consultants. Paid plans
                for individuals and teams come later; you&apos;ll hear about
                them before anything changes.
              </p>
              <Link
                href="/app"
                className="mt-5 inline-block rounded-md bg-spruce px-5 py-2.5 text-sm font-semibold text-on-spruce hover:bg-spruce-hover"
              >
                Start
              </Link>
            </div>
            <div className="rounded-lg border border-line bg-paper p-5 text-sm leading-6">
              <h3 className="font-semibold text-ink">
                What happens to your data
              </h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
                <li>
                  FSD and code files are read in your browser. Only their text,
                  and the screenshots you select, are sent for analysis.
                </li>
                <li>
                  Each analysis is saved to your history, which only you can
                  see. Delete any analysis at any time.
                </li>
                <li>
                  Analysis runs on Anthropic&apos;s API, which doesn&apos;t
                  train on API data. You can use your own API key.
                </li>
                <li>
                  Remove client names and personal data before uploading if your
                  client requires it.
                </li>
              </ul>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-line py-8 text-center text-xs text-muted">
        ABAPilot · Not affiliated with SAP SE. SAP and ABAP are trademarks of
        SAP SE.
      </footer>
    </div>
  );
}
