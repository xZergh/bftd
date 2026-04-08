import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { AppError } from "../errors";
import { requirementDesignLinks, requirements } from "../../db/schema";

type Db = ReturnType<typeof import("../../db/client").createDb>;

function now() {
  return new Date();
}

type DesignLinkUpsertInput = {
  projectId: string;
  provider: string;
  requirementId?: string;
  requirementKey?: string;
  designProjectId?: string;
  designFileId?: string;
  designPageId?: string;
  designNodeId?: string;
  shareUrl: string;
  title?: string;
  lastSyncedAt?: string;
};

/**
 * Synchronous upsert for use inside better-sqlite3 `db.transaction` (single atomic batch with imports).
 */
export function upsertRequirementDesignLinkSync(
  tx: Db,
  input: DesignLinkUpsertInput
): { inserted: boolean; row: Record<string, unknown> } {
  if (input.provider !== "penpot") {
    throw new AppError("VALIDATION_ERROR", "Unsupported design provider.", "Use provider 'penpot' for MVP.", { provider: input.provider });
  }
  if (!input.shareUrl.startsWith("https://")) {
    throw new AppError("VALIDATION_ERROR", "Invalid design share URL.", "Provide a valid HTTPS shareUrl.", { shareUrl: input.shareUrl });
  }

  let requirementId = input.requirementId ?? null;
  if (!requirementId && input.requirementKey) {
    const byKey = tx
      .select({ id: requirements.id })
      .from(requirements)
      .where(and(eq(requirements.projectId, input.projectId), eq(requirements.externalKey, input.requirementKey)))
      .all();
    if (byKey.length > 0) requirementId = byKey[0].id;
  }
  if (!requirementId) {
    throw new AppError(
      "ENTITY_NOT_FOUND",
      "Requirement link target not found.",
      "Provide requirementId or requirementKey that exists in the project.",
      { requirementId: input.requirementId ?? null, requirementKey: input.requirementKey ?? null }
    );
  }

  const req = tx
    .select({ id: requirements.id, projectId: requirements.projectId })
    .from(requirements)
    .where(eq(requirements.id, requirementId))
    .all();
  if (req.length === 0 || req[0].projectId !== input.projectId) {
    throw new AppError(
      "ENTITY_NOT_FOUND",
      "Requirement is not in the target project.",
      "Use a requirementId that belongs to projectId.",
      { requirementId, projectId: input.projectId }
    );
  }

  const candidates = tx
    .select({ id: requirementDesignLinks.id, designNodeId: requirementDesignLinks.designNodeId })
    .from(requirementDesignLinks)
    .where(
      and(
        eq(requirementDesignLinks.requirementId, requirementId),
        eq(requirementDesignLinks.provider, input.provider),
        eq(requirementDesignLinks.shareUrl, input.shareUrl)
      )
    )
    .all();
  const existing = candidates.filter((c) => (c.designNodeId ?? null) === (input.designNodeId ?? null));
  const parsedSyncedAt = input.lastSyncedAt ? new Date(input.lastSyncedAt) : null;
  if (existing.length === 0) {
    const row = {
      id: randomUUID(),
      projectId: input.projectId,
      requirementId,
      provider: input.provider,
      designProjectId: input.designProjectId ?? null,
      designFileId: input.designFileId ?? null,
      designPageId: input.designPageId ?? null,
      designNodeId: input.designNodeId ?? null,
      shareUrl: input.shareUrl,
      title: input.title ?? null,
      lastSyncedAt: parsedSyncedAt,
      createdAt: now(),
      updatedAt: now()
    };
    tx.insert(requirementDesignLinks).values(row).run();
    return { inserted: true, row };
  }

  const updated = {
    designProjectId: input.designProjectId ?? null,
    designFileId: input.designFileId ?? null,
    designPageId: input.designPageId ?? null,
    designNodeId: input.designNodeId ?? null,
    title: input.title ?? null,
    lastSyncedAt: parsedSyncedAt,
    updatedAt: now()
  };
  tx.update(requirementDesignLinks).set(updated).where(eq(requirementDesignLinks.id, existing[0].id)).run();
  return {
    inserted: false,
    row: { id: existing[0].id, projectId: input.projectId, requirementId, provider: input.provider, shareUrl: input.shareUrl, ...updated }
  };
}

export async function upsertRequirementDesignLink(db: Db, input: DesignLinkUpsertInput) {
  return db.transaction((tx) => {
    const { row } = upsertRequirementDesignLinkSync(tx as unknown as Db, input);
    return row;
  });
}

export async function unlinkRequirementDesignLink(
  db: Db,
  input: { projectId: string; requirementId: string; provider: string; shareUrl: string }
) {
  await db
    .delete(requirementDesignLinks)
    .where(
      and(
        eq(requirementDesignLinks.projectId, input.projectId),
        eq(requirementDesignLinks.requirementId, input.requirementId),
        eq(requirementDesignLinks.provider, input.provider),
        eq(requirementDesignLinks.shareUrl, input.shareUrl)
      )
    );
  return { success: true };
}

export async function getRequirementDesignLinks(db: Db, input: { projectId: string; requirementId?: string }) {
  const rows = await db
    .select({
      id: requirementDesignLinks.id,
      projectId: requirementDesignLinks.projectId,
      requirementId: requirementDesignLinks.requirementId,
      provider: requirementDesignLinks.provider,
      designProjectId: requirementDesignLinks.designProjectId,
      designFileId: requirementDesignLinks.designFileId,
      designPageId: requirementDesignLinks.designPageId,
      designNodeId: requirementDesignLinks.designNodeId,
      shareUrl: requirementDesignLinks.shareUrl,
      title: requirementDesignLinks.title,
      lastSyncedAt: requirementDesignLinks.lastSyncedAt
    })
    .from(requirementDesignLinks)
    .where(
      input.requirementId
        ? and(eq(requirementDesignLinks.projectId, input.projectId), eq(requirementDesignLinks.requirementId, input.requirementId))
        : eq(requirementDesignLinks.projectId, input.projectId)
    );
  return rows.map((r) => ({ ...r, lastSyncedAt: r.lastSyncedAt ? r.lastSyncedAt.toISOString() : null }));
}

export async function importRequirementDesignLinks(
  db: Db,
  input: {
    projectId: string;
    provider: string;
    links: Array<{
      requirementId?: string;
      requirementKey?: string;
      designProjectId?: string;
      designFileId?: string;
      designPageId?: string;
      designNodeId?: string;
      shareUrl?: string;
      title?: string;
      lastSyncedAt?: string;
    }>;
  }
) {
  return db.transaction((tx) => {
    const t = tx as unknown as Db;
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors: Array<{ index: number; code: string; message: string; fixHint: string }> = [];

    for (let i = 0; i < input.links.length; i += 1) {
      const link = input.links[i];
      if (!link.shareUrl) {
        skippedCount += 1;
        errors.push({
          index: i,
          code: "DESIGN_LINK_INVALID",
          message: "Missing shareUrl for design link.",
          fixHint: "Provide shareUrl for each imported design link."
        });
        continue;
      }
      try {
        const { inserted } = upsertRequirementDesignLinkSync(t, {
          projectId: input.projectId,
          provider: input.provider,
          requirementId: link.requirementId,
          requirementKey: link.requirementKey,
          designProjectId: link.designProjectId,
          designFileId: link.designFileId,
          designPageId: link.designPageId,
          designNodeId: link.designNodeId,
          shareUrl: link.shareUrl,
          title: link.title,
          lastSyncedAt: link.lastSyncedAt
        });
        if (inserted) {
          createdCount += 1;
        } else {
          updatedCount += 1;
        }
      } catch (err) {
        skippedCount += 1;
        if (err instanceof AppError) {
          errors.push({ index: i, code: err.code, message: err.message, fixHint: err.fixHint });
        } else {
          errors.push({
            index: i,
            code: "DESIGN_LINK_INVALID",
            message: "Failed to import design link.",
            fixHint: "Check link payload and provider fields."
          });
        }
      }
    }
    return { createdCount, updatedCount, skippedCount, errors };
  });
}
