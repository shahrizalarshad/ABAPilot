import Link from "next/link";
import {
  ClipboardCheck,
  Code2,
  FileText,
  ListChecks,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import { Nav } from "@/components/nav";

const features = [
  {
    icon: FileText,
    title: "Ticket analysis",
    text: "Summary, root cause and the questions to ask your functional consultant before you start building.",
  },
  {
    icon: Code2,
    title: "ABAP code with your tags",
    text: "Proposed code wrapped in your team's change-tag format, naming rules and target release.",
  },
  {
    icon: ListChecks,
    title: "Test scripts",
    text: "Positive, negative and regression test cases with transactions and test data hints.",
  },
  {
    icon: ClipboardCheck,
    title: "Change log in one click",
    text: "Technical documentation ready to paste into Jira, ServiceNow or your spec template.",
  },
  {
    icon: Settings2,
    title: "Your conventions",
    text: "Set your team rules once and every analysis follows them.",
  },
  {
    icon: ShieldCheck,
    title: "Bring your own key",
    text: "Use your own Anthropic API key. We don't store tickets or code.",
  },
];

const plans = [
  { name: "Free", price: "RM0", note: "10 tickets / month", cta: "Start free" },
  {
    name: "Consultant",
    price: "RM79",
    note: "per month · unlimited tickets",
    cta: "Start trial",
    highlight: true,
  },
  {
    name: "Team",
    price: "RM59",
    note: "per user / month · shared conventions & history",
    cta: "Contact us",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <Nav />
      <main>
        <section className="mx-auto max-w-4xl px-4 py-20 text-center">
          <p className="mb-4 inline-block rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            For SAP ABAP support consultants
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            From ticket to tested ABAP fix{" "}
            <span className="text-blue-600">in minutes</span>, not hours.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
            Paste a support ticket and the related code. ABAPilot drafts the
            analysis, the code change in your team&apos;s format, test cases and
            the change log, ready for you to review.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link
              href="/app"
              className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Try it now
            </Link>
            <Link
              href="/settings"
              className="rounded-md border border-zinc-300 px-5 py-2.5 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              Set your conventions
            </Link>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-20 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800"
            >
              <f.icon className="mb-3 h-5 w-5 text-blue-600" />
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {f.text}
              </p>
            </div>
          ))}
        </section>

        <section className="border-t border-zinc-200 bg-zinc-50 py-20 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="mx-auto max-w-5xl px-4">
            <h2 className="text-center text-2xl font-bold">Simple pricing</h2>
            <p className="mt-2 text-center text-sm text-zinc-500">
              Saving one hour per ticket pays for a month.
            </p>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {plans.map((p) => (
                <div
                  key={p.name}
                  className={`rounded-lg border bg-white p-6 dark:bg-zinc-950 ${p.highlight ? "border-blue-600 ring-2 ring-blue-600/20" : "border-zinc-200 dark:border-zinc-800"}`}
                >
                  <h3 className="font-semibold">{p.name}</h3>
                  <p className="mt-3 text-3xl font-bold">{p.price}</p>
                  <p className="text-sm text-zinc-500">{p.note}</p>
                  <Link
                    href="/app"
                    className="mt-6 block rounded-md bg-zinc-900 py-2 text-center text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900"
                  >
                    {p.cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <footer className="py-8 text-center text-xs text-zinc-500">
        ABAPilot · Not affiliated with SAP SE. SAP and ABAP are trademarks of
        SAP SE.
      </footer>
    </div>
  );
}
