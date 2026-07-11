import path from 'node:path';
import multer from 'multer';
import { ApiError } from '../utils/ApiError';
import {
  AVATAR_ALLOWED_EXTENSIONS,
  AVATAR_MAX_FILE_SIZE,
  COVER_ALLOWED_EXTENSIONS,
  COVER_MAX_FILE_SIZE,
  CONTRIBUTOR_SAMPLE_ALLOWED_EXTENSIONS,
  CONTRIBUTOR_SAMPLE_MAX_FILE_SIZE,
  CONTRIBUTOR_SUPPORTING_ALLOWED_EXTENSIONS,
  DATASET_ALLOWED_EXTENSIONS,
  DATASET_MAX_FILE_SIZE,
  DOCUMENTATION_ALLOWED_EXTENSIONS,
  MODEL_ALLOWED_EXTENSIONS,
  MODEL_MAX_FILE_SIZE,
  PAPER_PDF_ALLOWED_EXTENSIONS,
  RESOURCE_ATTACHMENT_ALLOWED_EXTENSIONS,
  RESOURCE_ATTACHMENT_MAX_FILE_SIZE,
  THUMBNAIL_ALLOWED_EXTENSIONS,
  THUMBNAIL_MAX_FILE_SIZE,
  TOOL_ASSET_ALLOWED_EXTENSIONS,
  TOOL_ASSET_MAX_FILE_SIZE,
} from '../services/storage.service';

// Cheap first-pass filter only — rejects an obviously-wrong extension before
// multer buffers the file into memory. The authoritative check (extension +
// declared-MIME + magic-byte agreement against the buffered content) happens
// server-side in StorageService.uploadObject(), which is the only place that
// can actually inspect the bytes and is never bypassable from the client.
function createUploadMiddleware(allowedExtensions: string[], maxFileSize: number) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxFileSize },
    fileFilter: (_req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase();
      if (!allowedExtensions.includes(extension)) {
        callback(new ApiError(400, 'VALIDATION_ERROR', 'File type not allowed.'));
        return;
      }

      callback(null, true);
    },
  });
}

// Union of every kind POST /resources/:slug/upload?kind=... can accept —
// same reasoning as CONTRIBUTOR_UPLOAD_EXTENSIONS below: `kind` (which
// allow-list actually applies) is a query param read after this middleware
// runs, so the narrower per-kind list + size limit is enforced
// authoritatively inside ResourceService.uploadFile() instead. The size
// limit here is the loosest of the six (model's, at 2GB) — each kind's
// tighter limit is enforced server-side in StorageService.uploadObject().
const RESOURCE_UPLOAD_EXTENSIONS = Array.from(
  new Set([
    ...DATASET_ALLOWED_EXTENSIONS,
    ...THUMBNAIL_ALLOWED_EXTENSIONS,
    ...PAPER_PDF_ALLOWED_EXTENSIONS,
    ...TOOL_ASSET_ALLOWED_EXTENSIONS,
    ...DOCUMENTATION_ALLOWED_EXTENSIONS,
    ...MODEL_ALLOWED_EXTENSIONS,
  ]),
);

export const resourceUpload = createUploadMiddleware(
  RESOURCE_UPLOAD_EXTENSIONS,
  Math.max(DATASET_MAX_FILE_SIZE, TOOL_ASSET_MAX_FILE_SIZE, MODEL_MAX_FILE_SIZE),
);

export const avatarUpload = createUploadMiddleware(AVATAR_ALLOWED_EXTENSIONS, AVATAR_MAX_FILE_SIZE);
export const coverUpload = createUploadMiddleware(COVER_ALLOWED_EXTENSIONS, COVER_MAX_FILE_SIZE);

// Union of sample + supporting-document extensions — `kind` (which allow-list
// actually applies) arrives as a query param read after this middleware runs,
// so the narrower per-kind list is enforced authoritatively inside
// StorageService.uploadContributorSample() instead.
const CONTRIBUTOR_UPLOAD_EXTENSIONS = Array.from(
  new Set([...CONTRIBUTOR_SAMPLE_ALLOWED_EXTENSIONS, ...CONTRIBUTOR_SUPPORTING_ALLOWED_EXTENSIONS]),
);

export const contributorSampleUpload = createUploadMiddleware(
  CONTRIBUTOR_UPLOAD_EXTENSIONS,
  CONTRIBUTOR_SAMPLE_MAX_FILE_SIZE,
);

// POST /resources/:slug/attachments — the per-resource-type allow-list
// (which one actually applies) is enforced authoritatively in
// StorageService.uploadResourceAttachment(); this is only the cheap
// first-pass filter, same pattern as resourceUpload above.
export const resourceAttachmentUpload = createUploadMiddleware(
  RESOURCE_ATTACHMENT_ALLOWED_EXTENSIONS,
  RESOURCE_ATTACHMENT_MAX_FILE_SIZE,
);

// POST/DELETE /admin/feed/announcements/:id/image — same allow-list/size cap
// as resource thumbnails.
export const feedAnnouncementImageUpload = createUploadMiddleware(
  THUMBNAIL_ALLOWED_EXTENSIONS,
  THUMBNAIL_MAX_FILE_SIZE,
);

// POST /posts — optional image attached in the same multipart request as
// the post's text content.
export const postImageUpload = createUploadMiddleware(THUMBNAIL_ALLOWED_EXTENSIONS, THUMBNAIL_MAX_FILE_SIZE);
