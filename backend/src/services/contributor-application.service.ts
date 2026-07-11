import type { Prisma } from '../generated/prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../utils/ApiError';
import type { PaginationMeta, PaginationParams } from '../utils/pagination';
import { buildPaginationMeta } from '../utils/pagination';
import { writeAuditLog } from '../utils/auditLog';
import { EmailService } from './email.service';
import { NotificationService } from './notification.service';
import { StorageService, type UploadedFile } from './storage.service';
import type {
  ContributorApplicationDecisionInput,
  ListContributorApplicationsQuery,
  SubmitContributorApplicationInput,
  UpdateContributorApplicationInput,
} from '../validators/contributor-application.validator';

const ACTIVE_STATUSES = ['pending', 'needs_revision'] as const;
const REAPPLY_COOLDOWN_DAYS = 30;
// Doc 10's `users` table has no dedicated profile-link table — these are the
// same 8 fields collected on the application form and stored durably on User.
const PROFILE_LINK_KEYS = [
  'github_url',
  'kaggle_url',
  'huggingface_url',
  'scholar_url',
  'linkedin_url',
  'website_url',
  'orcid_id',
  'x_url',
] as const;

type ApplicationRow = Prisma.ContributorApplicationGetPayload<Record<string, never>>;

function extractProfileFields(
  input: Partial<SubmitContributorApplicationInput>,
): Prisma.UserUpdateInput {
  const fields: Prisma.UserUpdateInput = {};
  if (input.github_url !== undefined) fields.githubUrl = input.github_url;
  if (input.kaggle_url !== undefined) fields.kaggleUrl = input.kaggle_url;
  if (input.huggingface_url !== undefined) fields.huggingfaceUrl = input.huggingface_url;
  if (input.scholar_url !== undefined) fields.scholarUrl = input.scholar_url;
  if (input.linkedin_url !== undefined) fields.linkedinUrl = input.linkedin_url;
  if (input.website_url !== undefined) fields.websiteUrl = input.website_url;
  if (input.orcid_id !== undefined) fields.orcidId = input.orcid_id;
  if (input.x_url !== undefined) fields.xUrl = input.x_url;
  return fields;
}

function snapshotFromUser(user: {
  githubUrl: string | null;
  kaggleUrl: string | null;
  huggingfaceUrl: string | null;
  scholarUrl: string | null;
  linkedinUrl: string | null;
  websiteUrl: string | null;
  orcidId: string | null;
  xUrl: string | null;
}): Record<string, string | null> {
  return {
    github_url: user.githubUrl,
    kaggle_url: user.kaggleUrl,
    huggingface_url: user.huggingfaceUrl,
    scholar_url: user.scholarUrl,
    linkedin_url: user.linkedinUrl,
    website_url: user.websiteUrl,
    orcid_id: user.orcidId,
    x_url: user.xUrl,
  };
}

function buildProfileLinkBadges(
  snapshot: unknown,
): Record<string, { url: string | null; connected: boolean }> {
  const source = (snapshot ?? {}) as Record<string, unknown>;
  const badges: Record<string, { url: string | null; connected: boolean }> = {};

  for (const key of PROFILE_LINK_KEYS) {
    const value = typeof source[key] === 'string' ? (source[key] as string) : null;
    badges[key] = { url: value, connected: value !== null && value !== '' };
  }

  return badges;
}

async function resolveFileUrls(keys: string[]): Promise<string[]> {
  return Promise.all(keys.map((key) => StorageService.getSignedDownloadUrl(key)));
}

type ReviewerSummary = { id: string; username: string; displayName: string | null };

// Shared by the applicant's own history and the admin detail view. `reviewer`
// is only passed (and only then included in the output) from the admin path —
// omitting it keeps review_notes/reviewer identity out of the applicant-facing
// shape, same discipline as toApplicantDto below.
function toHistoryEntry(
  application: ApplicationRow,
  reviewer?: ReviewerSummary | null,
): Record<string, unknown> {
  const entry: Record<string, unknown> = {
    id: application.id,
    status: application.status,
    submitted_at: application.submittedAt,
    reviewed_at: application.reviewedAt,
    feedback_to_applicant: application.feedbackToApplicant,
  };

  if (reviewer !== undefined) {
    entry.review_notes = application.reviewNotes;
    entry.reviewer = reviewer
      ? { id: reviewer.id, username: reviewer.username, display_name: reviewer.displayName }
      : null;
  }

  return entry;
}

// Applicant-facing DTO — an explicit allowlist that never includes
// `review_notes` (internal-only) or `reviewer_id`, same discipline as the
// rest of this codebase's DTO mappers (toResourceDto, getOwnProfile, ...).
async function toApplicantDto(
  application: ApplicationRow,
  previousApplications: ApplicationRow[] = [],
): Promise<Record<string, unknown>> {
  return {
    id: application.id,
    status: application.status,
    full_name: application.fullName,
    profession: application.profession,
    organization: application.organization,
    country: application.country,
    bio: application.bio,
    expertise: application.expertise,
    experience: application.experience,
    motivation: application.motivation,
    sample_works: application.sampleWorks,
    sample_file_urls: await resolveFileUrls(application.sampleFileUrls),
    supporting_document_urls: await resolveFileUrls(application.supportingDocumentUrls),
    profile_links: buildProfileLinkBadges(application.profileSnapshot),
    feedback_to_applicant: application.feedbackToApplicant,
    submitted_at: application.submittedAt,
    reviewed_at: application.reviewedAt,
    created_at: application.createdAt,
    updated_at: application.updatedAt,
    previous_applications: previousApplications.map((entry) => toHistoryEntry(entry)),
  };
}

export class ContributorApplicationService {
  private static async getActiveOwn(userId: string): Promise<ApplicationRow> {
    const application = await prisma.contributorApplication.findFirst({
      where: { userId, status: { in: [...ACTIVE_STATUSES] } },
      orderBy: { submittedAt: 'desc' },
    });
    if (!application) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'No active contributor application found.');
    }
    return application;
  }

  private static async requireDecidable(id: string): Promise<ApplicationRow> {
    const application = await prisma.contributorApplication.findUnique({ where: { id } });
    if (!application) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Contributor application not found.');
    }
    if (!ACTIVE_STATUSES.includes(application.status as (typeof ACTIVE_STATUSES)[number])) {
      throw new ApiError(
        409,
        'CONFLICT',
        'This application has already been decided or was withdrawn.',
      );
    }
    return application;
  }

  private static async getPreviousApplications(
    userId: string,
    excludeId: string,
  ): Promise<ApplicationRow[]> {
    return prisma.contributorApplication.findMany({
      where: { userId, id: { not: excludeId } },
      orderBy: { submittedAt: 'desc' },
    });
  }

  // --- Applicant-facing ---------------------------------------------------

  static async submit(
    userId: string,
    input: SubmitContributorApplicationInput,
  ): Promise<Record<string, unknown>> {
    const existingActive = await prisma.contributorApplication.findFirst({
      where: { userId, status: { in: [...ACTIVE_STATUSES] } },
    });
    if (existingActive) {
      throw new ApiError(409, 'CONFLICT', 'You already have an active contributor application.');
    }

    const lastRejected = await prisma.contributorApplication.findFirst({
      where: { userId, status: 'rejected' },
      orderBy: { reviewedAt: 'desc' },
    });
    if (lastRejected?.reviewedAt) {
      const cooldownEndsAt = new Date(lastRejected.reviewedAt);
      cooldownEndsAt.setDate(cooldownEndsAt.getDate() + REAPPLY_COOLDOWN_DAYS);
      if (cooldownEndsAt > new Date()) {
        throw new ApiError(
          429,
          'RATE_LIMIT_EXCEEDED',
          `You can reapply after ${cooldownEndsAt.toISOString().slice(0, 10)}.`,
        );
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: extractProfileFields(input),
    });

    const application = await prisma.contributorApplication.create({
      data: {
        userId,
        fullName: input.full_name,
        profession: input.profession,
        organization: input.organization,
        country: input.country,
        bio: input.bio,
        expertise: input.expertise,
        experience: input.experience,
        motivation: input.motivation,
        sampleWorks: input.sample_works ?? null,
        profileSnapshot: snapshotFromUser(user),
      },
    });

    await writeAuditLog({
      actorId: userId,
      action: 'contributor_application.submit',
      targetType: 'contributor_application',
      targetId: application.id,
      newValue: { status: application.status },
    });

    await NotificationService.create({
      userId,
      type: 'contributor_application_submitted',
      title: 'Contributor application submitted',
      message: 'We received your application and will review it soon.',
      link: '/contributor-application',
    });
    void EmailService.sendContributorApplicationSubmitted(
      user.email,
      user.displayName ?? user.username,
    );

    const previousApplications = await this.getPreviousApplications(userId, application.id);
    return toApplicantDto(application, previousApplications);
  }

  static async getOwn(userId: string): Promise<Record<string, unknown> | null> {
    const application = await prisma.contributorApplication.findFirst({
      where: { userId },
      orderBy: { submittedAt: 'desc' },
    });
    if (!application) return null;

    const previousApplications = await this.getPreviousApplications(userId, application.id);
    return toApplicantDto(application, previousApplications);
  }

  static async updateOwn(
    userId: string,
    input: UpdateContributorApplicationInput,
  ): Promise<Record<string, unknown>> {
    const application = await this.getActiveOwn(userId);

    const profileFields = extractProfileFields(input);
    const user =
      Object.keys(profileFields).length > 0
        ? await prisma.user.update({ where: { id: userId }, data: profileFields })
        : await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const updated = await prisma.contributorApplication.update({
      where: { id: application.id },
      data: {
        fullName: input.full_name,
        profession: input.profession,
        organization: input.organization,
        country: input.country,
        bio: input.bio,
        expertise: input.expertise,
        experience: input.experience,
        motivation: input.motivation,
        sampleWorks: input.sample_works,
        profileSnapshot: snapshotFromUser(user),
        // Editing a needs_revision application re-queues it for review.
        status: application.status === 'needs_revision' ? 'pending' : application.status,
      },
    });

    await writeAuditLog({
      actorId: userId,
      action: 'contributor_application.update',
      targetType: 'contributor_application',
      targetId: application.id,
      oldValue: { status: application.status },
      newValue: { status: updated.status },
    });

    const previousApplications = await this.getPreviousApplications(userId, updated.id);
    return toApplicantDto(updated, previousApplications);
  }

  static async withdrawOwn(userId: string): Promise<void> {
    const application = await this.getActiveOwn(userId);

    await prisma.contributorApplication.update({
      where: { id: application.id },
      data: { status: 'withdrawn' },
    });

    await writeAuditLog({
      actorId: userId,
      action: 'contributor_application.withdraw',
      targetType: 'contributor_application',
      targetId: application.id,
      oldValue: { status: application.status },
      newValue: { status: 'withdrawn' },
    });

    await NotificationService.create({
      userId,
      type: 'contributor_application_withdrawn',
      title: 'Contributor application withdrawn',
      message: 'You withdrew your contributor application. You can reapply any time.',
      link: '/contributor-application',
    });

    const applicant = await prisma.user.findUnique({ where: { id: userId } });
    if (applicant) {
      void EmailService.sendContributorApplicationWithdrawn(
        applicant.email,
        applicant.displayName ?? applicant.username,
      );
    }
  }

  static async addSampleFile(
    userId: string,
    file: UploadedFile,
    kind: 'sample' | 'supporting',
  ): Promise<{ file_url: string }> {
    const application = await this.getActiveOwn(userId);
    const { key } = await StorageService.uploadContributorSample(userId, file, kind);

    await prisma.contributorApplication.update({
      where: { id: application.id },
      data:
        kind === 'supporting'
          ? { supportingDocumentUrls: { push: key } }
          : { sampleFileUrls: { push: key } },
    });

    await writeAuditLog({
      actorId: userId,
      action: 'contributor_application.upload_sample',
      targetType: 'contributor_application',
      targetId: application.id,
      newValue: { key, kind },
    });

    return { file_url: await StorageService.getSignedDownloadUrl(key) };
  }

  // --- Admin ----------------------------------------------------------------

  static async listForAdmin(
    query: ListContributorApplicationsQuery,
    pagination: PaginationParams,
  ): Promise<{ data: unknown[]; meta: PaginationMeta }> {
    const where: Prisma.ContributorApplicationWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.country) where.country = { contains: query.country, mode: 'insensitive' };
    if (query.profession) where.profession = { contains: query.profession, mode: 'insensitive' };
    if (query.organization) {
      where.organization = { contains: query.organization, mode: 'insensitive' };
    }
    if (query.expertise) where.expertise = { contains: query.expertise, mode: 'insensitive' };
    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { expertise: { contains: query.search, mode: 'insensitive' } },
        { profession: { contains: query.search, mode: 'insensitive' } },
        { organization: { contains: query.search, mode: 'insensitive' } },
        { applicant: { username: { contains: query.search, mode: 'insensitive' } } },
        { applicant: { email: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const orderBy: Prisma.ContributorApplicationOrderByWithRelationInput =
      query.sort === 'oldest' ? { submittedAt: 'asc' } : { submittedAt: 'desc' };

    const [total, applications] = await Promise.all([
      prisma.contributorApplication.count({ where }),
      prisma.contributorApplication.findMany({
        where,
        orderBy,
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
        include: {
          applicant: {
            select: { id: true, username: true, displayName: true, avatarUrl: true },
          },
        },
      }),
    ]);

    const data = await Promise.all(
      applications.map(async (application) => ({
        id: application.id,
        status: application.status,
        full_name: application.fullName,
        expertise: application.expertise,
        submitted_at: application.submittedAt,
        reviewed_at: application.reviewedAt,
        applicant: application.applicant
          ? {
              id: application.applicant.id,
              username: application.applicant.username,
              display_name: application.applicant.displayName,
              avatar_url: await StorageService.resolveAvatarUrl(application.applicant.avatarUrl),
            }
          : null,
      })),
    );

    return { data, meta: buildPaginationMeta(total, pagination) };
  }

  static async getByIdForAdmin(id: string): Promise<Record<string, unknown>> {
    const application = await prisma.contributorApplication.findUnique({
      where: { id },
      include: {
        applicant: { include: { userRoles: { include: { role: true } } } },
        reviewer: { select: { id: true, username: true, displayName: true } },
      },
    });
    if (!application) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Contributor application not found.');
    }

    const [
      resourceStatusCounts,
      approvedTypes,
      sampleFileUrls,
      supportingDocumentUrls,
      previousApplications,
    ] = await Promise.all([
      prisma.resource.groupBy({
        by: ['status'],
        where: { authorId: application.userId, deletedAt: null },
        _count: { _all: true },
      }),
      prisma.resource.findMany({
        where: { authorId: application.userId, status: 'approved', deletedAt: null },
        select: { type: true },
        distinct: ['type'],
      }),
      resolveFileUrls(application.sampleFileUrls),
      resolveFileUrls(application.supportingDocumentUrls),
      prisma.contributorApplication.findMany({
        where: { userId: application.userId, id: { not: application.id } },
        orderBy: { submittedAt: 'desc' },
        include: { reviewer: { select: { id: true, username: true, displayName: true } } },
      }),
    ]);

    const countByStatus = Object.fromEntries(
      resourceStatusCounts.map((row) => [row.status, row._count._all]),
    );
    const approved = countByStatus.approved ?? 0;
    const rejected = countByStatus.rejected ?? 0;
    const pending = countByStatus.pending ?? 0;
    const decided = approved + rejected;
    const approvalRate = decided > 0 ? Math.round((approved / decided) * 1000) / 10 : null;

    const snapshotValues = Object.values(
      (application.profileSnapshot ?? {}) as Record<string, unknown>,
    );
    const filledLinkCount = snapshotValues.filter((value) => typeof value === 'string' && value)
      .length;
    const profileCompleteness = Math.round((filledLinkCount / PROFILE_LINK_KEYS.length) * 100);

    return {
      id: application.id,
      status: application.status,
      full_name: application.fullName,
      profession: application.profession,
      organization: application.organization,
      country: application.country,
      bio: application.bio,
      expertise: application.expertise,
      experience: application.experience,
      motivation: application.motivation,
      sample_works: application.sampleWorks,
      sample_file_urls: sampleFileUrls,
      supporting_document_urls: supportingDocumentUrls,
      profile_links: buildProfileLinkBadges(application.profileSnapshot),
      previous_applications: previousApplications.map((entry) =>
        toHistoryEntry(entry, entry.reviewer),
      ),
      review_notes: application.reviewNotes,
      feedback_to_applicant: application.feedbackToApplicant,
      reviewer: application.reviewer
        ? {
            id: application.reviewer.id,
            username: application.reviewer.username,
            display_name: application.reviewer.displayName,
          }
        : null,
      reviewed_at: application.reviewedAt,
      submitted_at: application.submittedAt,
      applicant: {
        id: application.applicant.id,
        username: application.applicant.username,
        display_name: application.applicant.displayName,
        avatar_url: await StorageService.resolveAvatarUrl(application.applicant.avatarUrl),
        email: application.applicant.email,
        roles: application.applicant.userRoles.map((userRole) => userRole.role.name),
        reputation_score: application.applicant.reputationScore,
        member_since: application.applicant.createdAt,
        last_active: application.applicant.lastLoginAt,
      },
      contribution_stats: {
        total_submitted: approved + rejected + pending,
        total_approved: approved,
        total_rejected: rejected,
        pending_reviews: pending,
        approval_rate: approvalRate,
      },
      // Some of these have no real backing logic yet — those are returned as
      // explicit placeholders (available: false) rather than faked numbers,
      // so the future automation described in doc 02/13 can fill them in
      // without a frontend contract change.
      quality_indicators: {
        approval_rate: { value: approvalRate, available: approvalRate !== null },
        profile_completeness: { value: profileCompleteness, available: true },
        resource_diversity: { value: approvedTypes.length, available: true },
        contribution_quality_score: { value: null, available: false },
        documentation_quality: { value: null, available: false },
        metadata_quality: { value: null, available: false },
        license_compliance: { value: null, available: false },
      },
    };
  }

  static async approve(
    id: string,
    actorId: string,
    input: ContributorApplicationDecisionInput,
  ): Promise<Record<string, unknown>> {
    const application = await this.requireDecidable(id);

    const contributorRole = await prisma.role.findUnique({ where: { name: 'contributor' } });
    if (!contributorRole) {
      throw new ApiError(
        500,
        'INTERNAL_ERROR',
        'contributor role is not seeded. Run the database seed script.',
      );
    }

    await prisma.$transaction([
      prisma.contributorApplication.update({
        where: { id },
        data: {
          status: 'approved',
          reviewerId: actorId,
          reviewedAt: new Date(),
          reviewNotes: input.notes ?? null,
          feedbackToApplicant: input.feedback ?? null,
        },
      }),
      // Additive — keeps the existing `user` role, unlike
      // UserService.updateUserRoles which replaces the whole role set.
      prisma.userRole.upsert({
        where: { userId_roleId: { userId: application.userId, roleId: contributorRole.id } },
        update: {},
        create: { userId: application.userId, roleId: contributorRole.id, assignedBy: actorId },
      }),
    ]);

    await writeAuditLog({
      actorId,
      action: 'contributor_application.approve',
      targetType: 'contributor_application',
      targetId: id,
      oldValue: { status: application.status },
      newValue: { status: 'approved' },
    });

    await NotificationService.create({
      userId: application.userId,
      type: 'contributor_application_approved',
      title: 'Your contributor application was approved',
      message: input.feedback ?? 'You can now submit resources to Bangla AI Hub.',
      link: '/dashboard',
    });

    const applicant = await prisma.user.findUnique({ where: { id: application.userId } });
    if (applicant) {
      void EmailService.sendContributorApplicationApproved(
        applicant.email,
        applicant.displayName ?? applicant.username,
      );
    }

    return this.getByIdForAdmin(id);
  }

  static async reject(
    id: string,
    actorId: string,
    input: ContributorApplicationDecisionInput,
  ): Promise<Record<string, unknown>> {
    const application = await this.requireDecidable(id);

    await prisma.contributorApplication.update({
      where: { id },
      data: {
        status: 'rejected',
        reviewerId: actorId,
        reviewedAt: new Date(),
        reviewNotes: input.notes ?? null,
        feedbackToApplicant: input.feedback ?? null,
      },
    });

    await writeAuditLog({
      actorId,
      action: 'contributor_application.reject',
      targetType: 'contributor_application',
      targetId: id,
      oldValue: { status: application.status },
      newValue: { status: 'rejected' },
    });

    await NotificationService.create({
      userId: application.userId,
      type: 'contributor_application_rejected',
      title: 'Your contributor application was not approved',
      message: input.feedback ?? 'Your contributor application was not approved this time.',
      link: '/contributor-application',
    });

    const applicant = await prisma.user.findUnique({ where: { id: application.userId } });
    if (applicant) {
      void EmailService.sendContributorApplicationRejected(
        applicant.email,
        applicant.displayName ?? applicant.username,
        input.feedback,
      );
    }

    return this.getByIdForAdmin(id);
  }

  static async requestRevision(
    id: string,
    actorId: string,
    input: ContributorApplicationDecisionInput,
  ): Promise<Record<string, unknown>> {
    const application = await this.requireDecidable(id);

    await prisma.contributorApplication.update({
      where: { id },
      data: {
        status: 'needs_revision',
        reviewerId: actorId,
        reviewedAt: new Date(),
        reviewNotes: input.notes ?? null,
        feedbackToApplicant: input.feedback ?? null,
      },
    });

    await writeAuditLog({
      actorId,
      action: 'contributor_application.request_revision',
      targetType: 'contributor_application',
      targetId: id,
      oldValue: { status: application.status },
      newValue: { status: 'needs_revision' },
    });

    await NotificationService.create({
      userId: application.userId,
      type: 'contributor_application_needs_revision',
      title: 'Your contributor application needs revision',
      message: input.feedback ?? 'Please review and update your contributor application.',
      link: '/contributor-application',
    });

    const applicant = await prisma.user.findUnique({ where: { id: application.userId } });
    if (applicant) {
      void EmailService.sendContributorApplicationNeedsRevision(
        applicant.email,
        applicant.displayName ?? applicant.username,
        input.feedback,
      );
    }

    return this.getByIdForAdmin(id);
  }
}
