import type { Prisma } from '../generated/prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../utils/ApiError';
import { writeAuditLog } from '../utils/auditLog';
import type { AccessTokenPayload } from '../utils/jwt';

export interface RevisionSnapshotFields {
  title: string;
  body: string | null;
  excerpt: string | null;
  categoryId: number | null;
  focusKeyword: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
}

// Word-level diff — no diff library exists in this codebase (confirmed
// before writing this), so this is a hand-rolled LCS over whitespace-split
// tokens, the same class of decision as 5A-2's Flesch readability calc
// (write the real algorithm rather than fake it or add a dependency for one
// function). O(n*m) — fine at article-body scale (thousands of words, not
// millions).
export type DiffOp = { type: 'equal' | 'added' | 'removed'; value: string };

function wordDiff(oldText: string, newText: string): DiffOp[] {
  const oldTokens = oldText.split(/(\s+)/).filter(Boolean);
  const newTokens = newText.split(/(\s+)/).filter(Boolean);

  const m = oldTokens.length;
  const n = newTokens.length;
  const lcs: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));

  for (let i = m - 1; i >= 0; i -= 1) {
    for (let j = n - 1; j >= 0; j -= 1) {
      lcs[i][j] =
        oldTokens[i] === newTokens[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const ops: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (oldTokens[i] === newTokens[j]) {
      ops.push({ type: 'equal', value: oldTokens[i] });
      i += 1;
      j += 1;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      ops.push({ type: 'removed', value: oldTokens[i] });
      i += 1;
    } else {
      ops.push({ type: 'added', value: newTokens[j] });
      j += 1;
    }
  }
  while (i < m) {
    ops.push({ type: 'removed', value: oldTokens[i] });
    i += 1;
  }
  while (j < n) {
    ops.push({ type: 'added', value: newTokens[j] });
    j += 1;
  }

  // Merge adjacent same-type ops so the UI doesn't render one <span> per word.
  return ops.reduce<DiffOp[]>((merged, op) => {
    const last = merged[merged.length - 1];
    if (last && last.type === op.type) {
      last.value += op.value;
      return merged;
    }
    merged.push({ ...op });
    return merged;
  }, []);
}

function toRevisionDto(revision: {
  id: string;
  versionNumber: number;
  title: string;
  body: string | null;
  excerpt: string | null;
  categoryId: number | null;
  focusKeyword: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  summary: string | null;
  createdAt: Date;
  editor: { id: string; username: string; displayName: string | null } | null;
}): Record<string, unknown> {
  return {
    id: revision.id,
    version_number: revision.versionNumber,
    title: revision.title,
    body: revision.body,
    excerpt: revision.excerpt,
    category_id: revision.categoryId,
    focus_keyword: revision.focusKeyword,
    seo_title: revision.seoTitle,
    seo_description: revision.seoDescription,
    summary: revision.summary,
    created_at: revision.createdAt,
    editor: revision.editor
      ? { id: revision.editor.id, username: revision.editor.username, display_name: revision.editor.displayName }
      : null,
  };
}

export class ArticleRevisionService {
  // Called from inside ResourceService.update()'s existing transaction —
  // appends a snapshot, never overwrites or deletes one. Accepts the
  // transaction client so it participates in that same transaction boundary
  // rather than opening a new one.
  static async snapshot(
    tx: Prisma.TransactionClient,
    resourceId: string,
    editorId: string | null,
    fields: RevisionSnapshotFields,
    summary?: string,
  ): Promise<void> {
    const last = await tx.articleRevision.aggregate({
      where: { resourceId },
      _max: { versionNumber: true },
    });
    const versionNumber = (last._max.versionNumber ?? 0) + 1;

    await tx.articleRevision.create({
      data: {
        resourceId,
        editorId,
        versionNumber,
        title: fields.title,
        body: fields.body,
        excerpt: fields.excerpt,
        categoryId: fields.categoryId,
        focusKeyword: fields.focusKeyword,
        seoTitle: fields.seoTitle,
        seoDescription: fields.seoDescription,
        summary: summary ?? null,
      },
    });
  }

  static async list(slug: string): Promise<unknown[]> {
    const resource = await prisma.resource.findUnique({ where: { slug }, select: { id: true, type: true } });
    if (!resource || resource.type !== 'article') {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Resource not found.');
    }

    const revisions = await prisma.articleRevision.findMany({
      where: { resourceId: resource.id },
      include: { editor: { select: { id: true, username: true, displayName: true } } },
      orderBy: { versionNumber: 'desc' },
    });
    return revisions.map(toRevisionDto);
  }

  static async compare(revisionIdA: string, revisionIdB: string): Promise<{ title: DiffOp[]; body: DiffOp[] }> {
    const [a, b] = await Promise.all([
      prisma.articleRevision.findUnique({ where: { id: revisionIdA } }),
      prisma.articleRevision.findUnique({ where: { id: revisionIdB } }),
    ]);
    if (!a || !b || a.resourceId !== b.resourceId) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Both revisions must belong to the same article.');
    }

    return {
      title: wordDiff(a.title, b.title),
      body: wordDiff(a.body ?? '', b.body ?? ''),
    };
  }

  // Writes the old revision's fields back onto the live Article/Resource row
  // via a fresh update — which itself creates a NEW revision recording the
  // restore (see resources.service.ts's update() -> snapshot() call), so
  // restoring never deletes or rewrites history.
  static async restore(revisionId: string, requester: AccessTokenPayload): Promise<{ slug: string }> {
    const revision = await prisma.articleRevision.findUnique({
      where: { id: revisionId },
      include: { resource: { select: { slug: true, id: true, deletedAt: true, type: true } } },
    });
    if (!revision || revision.resource.deletedAt || revision.resource.type !== 'article') {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Revision not found.');
    }

    await prisma.$transaction(async (tx) => {
      await tx.resource.update({
        where: { id: revision.resourceId },
        data: { title: revision.title, categoryId: revision.categoryId },
      });
      await tx.article.update({
        where: { resourceId: revision.resourceId },
        data: {
          body: revision.body,
          excerpt: revision.excerpt,
          focusKeyword: revision.focusKeyword,
          seoTitle: revision.seoTitle,
          seoDescription: revision.seoDescription,
        },
      });
      await this.snapshot(
        tx,
        revision.resourceId,
        requester.userId,
        {
          title: revision.title,
          body: revision.body,
          excerpt: revision.excerpt,
          categoryId: revision.categoryId,
          focusKeyword: revision.focusKeyword,
          seoTitle: revision.seoTitle,
          seoDescription: revision.seoDescription,
        },
        `Restored from version ${revision.versionNumber}`,
      );
    });

    await writeAuditLog({
      actorId: requester.userId,
      action: 'article.revision_restore',
      targetType: 'resource',
      targetId: revision.resourceId,
      newValue: { restored_from_version: revision.versionNumber },
    });

    return { slug: revision.resource.slug };
  }
}
