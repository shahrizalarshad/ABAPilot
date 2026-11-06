import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { analyses, userSettings } from "@/db/schema";
import { DEFAULT_CONVENTIONS, type Conventions } from "@/lib/conventions";
import type { Analysis } from "@/lib/schema";

// Every query is scoped to the signed-in user's id.

export async function getConventions(userId: string): Promise<Conventions> {
  const row = await getDb().query.userSettings.findFirst({
    where: eq(userSettings.userId, userId),
  });
  return { ...DEFAULT_CONVENTIONS, ...(row?.conventions ?? {}) };
}

export async function saveConventions(
  userId: string,
  conventions: Conventions,
) {
  await getDb()
    .insert(userSettings)
    .values({ userId, conventions })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { conventions, updatedAt: new Date() },
    });
}

export async function saveAnalysis(input: {
  id?: string;
  userId: string;
  ticketId: string;
  title: string;
  module: string;
  description: string;
  code: string;
  spec: string;
  result: Analysis;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
}) {
  const [row] = await getDb()
    .insert(analyses)
    .values(input)
    .returning({ id: analyses.id });
  return row.id;
}

export async function listAnalyses(userId: string, limit = 100) {
  return getDb()
    .select({
      id: analyses.id,
      ticketId: analyses.ticketId,
      title: analyses.title,
      module: analyses.module,
      result: analyses.result,
      createdAt: analyses.createdAt,
    })
    .from(analyses)
    .where(eq(analyses.userId, userId))
    .orderBy(desc(analyses.createdAt))
    .limit(limit);
}

export async function getAnalysis(userId: string, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const row = await getDb().query.analyses.findFirst({
    where: and(eq(analyses.id, id), eq(analyses.userId, userId)),
  });
  return row ?? null;
}

export async function deleteAnalysis(userId: string, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  await getDb()
    .delete(analyses)
    .where(and(eq(analyses.id, id), eq(analyses.userId, userId)));
}
