import multer from 'multer';
import { ApiError } from '../utils/ApiError';

function createUploadMiddleware(allowedMimeTypes: string[], maxFileSize: number) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxFileSize },
    fileFilter: (_req, file, callback) => {
      if (!allowedMimeTypes.includes(file.mimetype)) {
        callback(new ApiError(400, 'VALIDATION_ERROR', 'File type not allowed.'));
        return;
      }

      callback(null, true);
    },
  });
}

const DATASET_MIME_TYPES = [
  'text/csv',
  'application/json',
  'text/plain',
  'application/zip',
  'application/x-tar',
  'application/gzip',
];
const DATASET_MAX_FILE_SIZE = 500 * 1024 * 1024;

export const datasetUpload = createUploadMiddleware(DATASET_MIME_TYPES, DATASET_MAX_FILE_SIZE);

const AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const AVATAR_MAX_FILE_SIZE = 5 * 1024 * 1024;

export const avatarUpload = createUploadMiddleware(AVATAR_MIME_TYPES, AVATAR_MAX_FILE_SIZE);

// Contributor-application sample works / supporting documents — same dataset
// types plus PDF (CVs, sample papers), capped much smaller than a dataset
// upload since these are portfolio samples, not the resource payload itself.
const CONTRIBUTOR_SAMPLE_MIME_TYPES = [...DATASET_MIME_TYPES, 'application/pdf'];
const CONTRIBUTOR_SAMPLE_MAX_FILE_SIZE = 20 * 1024 * 1024;

export const contributorSampleUpload = createUploadMiddleware(
  CONTRIBUTOR_SAMPLE_MIME_TYPES,
  CONTRIBUTOR_SAMPLE_MAX_FILE_SIZE,
);
