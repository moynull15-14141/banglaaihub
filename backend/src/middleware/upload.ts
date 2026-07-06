import multer from 'multer';
import { ApiError } from '../utils/ApiError';

const ALLOWED_MIME_TYPES = [
  'text/csv',
  'application/json',
  'text/plain',
  'application/zip',
  'application/x-tar',
  'application/gzip',
];

const MAX_FILE_SIZE = 500 * 1024 * 1024;

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      callback(new ApiError(400, 'VALIDATION_ERROR', 'File type not allowed.'));
      return;
    }

    callback(null, true);
  },
});
