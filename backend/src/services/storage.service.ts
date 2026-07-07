import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2BucketName, r2Client, r2PublicUrl } from '../config/r2';
import { ApiError } from '../utils/ApiError';

const DOWNLOAD_URL_EXPIRY_SECONDS = 60 * 60;
const AVATAR_URL_EXPIRY_SECONDS = 7 * 24 * 60 * 60;

export interface UploadedFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

export interface StoredObjectMetadata {
  key: string;
  // Public URL if the bucket has a configured public domain, else null —
  // callers needing a usable link fall back to getSignedDownloadUrl(key).
  url: string | null;
  size: number;
  mime: string;
  filename: string;
  extension: string;
  checksum: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Centralized folder taxonomy. Every upload flow — present and future — must
// pass one of these to StorageService.uploadObject() rather than inventing
// its own prefix.
// ---------------------------------------------------------------------------
export const STORAGE_FOLDERS = {
  avatars: 'avatars',
  resources: 'resources',
  datasets: 'datasets',
  models: 'models',
  documents: 'documents',
  sampleFiles: 'sample-files',
  thumbnails: 'thumbnails',
  temp: 'temp',
} as const;

export type StorageFolder = (typeof STORAGE_FOLDERS)[keyof typeof STORAGE_FOLDERS];

// ---------------------------------------------------------------------------
// Supported file catalog. Each entry lists the MIME type(s) that extension is
// allowed to declare/sniff as, and whether `file-type` can verify its magic
// bytes (plain-text-ish formats like csv/json/txt/py have no binary
// signature to sniff, so those rely on extension + declared-MIME agreement).
// ---------------------------------------------------------------------------
interface ExtensionSpec {
  mimeTypes: string[];
  sniffable: boolean;
}

const EXTENSION_CATALOG: Record<string, ExtensionSpec> = {
  // Images
  '.png': { mimeTypes: ['image/png'], sniffable: true },
  '.jpg': { mimeTypes: ['image/jpeg'], sniffable: true },
  '.jpeg': { mimeTypes: ['image/jpeg'], sniffable: true },
  '.webp': { mimeTypes: ['image/webp'], sniffable: true },
  // SVG is XML (no binary magic bytes) and can carry embedded scripts — not
  // enabled on any upload flow today; kept in the catalog for when a flow
  // that sanitizes SVG on read is ready to opt in.
  '.svg': { mimeTypes: ['image/svg+xml'], sniffable: false },

  // Documents
  '.pdf': { mimeTypes: ['application/pdf'], sniffable: true },
  '.docx': {
    mimeTypes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    sniffable: true,
  },
  '.txt': { mimeTypes: ['text/plain'], sniffable: false },
  '.md': { mimeTypes: ['text/markdown', 'text/x-markdown', 'text/plain'], sniffable: false },
  '.zip': { mimeTypes: ['application/zip', 'application/x-zip-compressed'], sniffable: true },
  '.tar': { mimeTypes: ['application/x-tar'], sniffable: true },
  '.gz': { mimeTypes: ['application/gzip', 'application/x-gzip'], sniffable: true },
  '.csv': { mimeTypes: ['text/csv', 'text/plain', 'application/vnd.ms-excel'], sniffable: false },
  '.json': { mimeTypes: ['application/json', 'text/plain'], sniffable: false },
  '.parquet': { mimeTypes: ['application/octet-stream', 'application/vnd.apache.parquet'], sniffable: false },
  '.py': {
    mimeTypes: ['text/x-python', 'text/x-script.python', 'text/plain', 'application/octet-stream'],
    sniffable: false,
  },
  '.ipynb': { mimeTypes: ['application/x-ipynb+json', 'application/json', 'text/plain'], sniffable: false },

  // Model files — no registered MIME type; clients send application/octet-stream.
  '.onnx': { mimeTypes: ['application/octet-stream'], sniffable: false },
  '.gguf': { mimeTypes: ['application/octet-stream'], sniffable: false },
  '.safetensors': { mimeTypes: ['application/octet-stream'], sniffable: false },
  '.pt': { mimeTypes: ['application/octet-stream'], sniffable: false },
  '.bin': { mimeTypes: ['application/octet-stream'], sniffable: false },
};

// Rejected everywhere, regardless of the caller's allow-list — executables,
// scripts, and installers have no legitimate reason to pass through any
// upload flow this platform exposes.
const DANGEROUS_EXTENSIONS = new Set([
  '.exe', '.dll', '.bat', '.cmd', '.msi', '.com', '.scr', '.jar', '.apk',
  '.app', '.deb', '.rpm', '.ps1', '.vbs', '.vbe', '.wsf', '.js', '.jse',
  '.cpl', '.gadget', '.msc', '.sh', '.bash',
]);

// ---------------------------------------------------------------------------
// Per-flow allow-lists and size limits — the single source of truth also
// consumed by middleware/upload.ts for its cheap first-pass filter.
// ---------------------------------------------------------------------------
export const AVATAR_ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];
export const AVATAR_MAX_FILE_SIZE = 5 * 1024 * 1024;

export const DATASET_ALLOWED_EXTENSIONS = [
  '.csv', '.json', '.txt', '.zip', '.tar', '.gz', '.parquet', '.py', '.ipynb',
];
export const DATASET_MAX_FILE_SIZE = 500 * 1024 * 1024;

export const CONTRIBUTOR_SAMPLE_ALLOWED_EXTENSIONS = DATASET_ALLOWED_EXTENSIONS;
export const CONTRIBUTOR_SUPPORTING_ALLOWED_EXTENSIONS = [
  ...DATASET_ALLOWED_EXTENSIONS,
  '.pdf',
  '.docx',
  '.md',
];
export const CONTRIBUTOR_SAMPLE_MAX_FILE_SIZE = 20 * 1024 * 1024;

// Exposed for future model upload flows — not wired to any route yet, kept
// here so a new flow reuses these instead of inventing its own list.
export const MODEL_ALLOWED_EXTENSIONS = ['.onnx', '.gguf', '.safetensors', '.pt', '.bin'];
export const MODEL_MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024;

export const THUMBNAIL_ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];
export const THUMBNAIL_MAX_FILE_SIZE = 5 * 1024 * 1024;

export const DOCUMENT_ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.txt', '.md'];
export const DOCUMENT_MAX_FILE_SIZE = 50 * 1024 * 1024;

// Paper.pdf_url upload — a PDF specifically, not the wider DOCUMENT set.
export const PAPER_PDF_ALLOWED_EXTENSIONS = ['.pdf'];
export const PAPER_PDF_MAX_FILE_SIZE = 50 * 1024 * 1024;

// Tool.file_url upload — packaged tool assets only (doc 2.2 Part 3).
export const TOOL_ASSET_ALLOWED_EXTENSIONS = ['.zip', '.tar', '.gz'];
export const TOOL_ASSET_MAX_FILE_SIZE = 200 * 1024 * 1024;

// Resource.documentation_url upload — narrower than DOCUMENT_ALLOWED_EXTENSIONS
// (no .docx) per doc 2.2 Part 4's explicit PDF/Markdown/TXT list.
export const DOCUMENTATION_ALLOWED_EXTENSIONS = ['.pdf', '.md', '.txt'];
export const DOCUMENTATION_MAX_FILE_SIZE = 50 * 1024 * 1024;

interface ValidatedFile {
  extension: string;
  safeBaseName: string;
}

// Never trusts the client-declared MIME type alone. Extension must be on the
// caller's allow-list, must not appear anywhere in DANGEROUS_EXTENSIONS
// (including disguised as a non-final segment, e.g. "invoice.exe.pdf"), the
// declared MIME must match the extension's known type(s), and — where the
// format has a binary signature — the actual buffered bytes are sniffed with
// `file-type` and must agree. Formats without a signature (csv/txt/json/
// md/py/ipynb/parquet/model weights) fall back to extension + declared-MIME
// agreement, the only check possible for content with no fixed byte pattern.
async function validateFile(
  file: UploadedFile,
  allowedExtensions: string[],
  maxFileSize: number,
): Promise<ValidatedFile> {
  if (!file.buffer || file.size === 0) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'File is empty.');
  }

  if (file.size > maxFileSize) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      `File too large (max ${Math.round(maxFileSize / (1024 * 1024))}MB).`,
    );
  }

  // Path-traversal guard: the object key is always a fresh UUID (never
  // derived from the client's filename), but we still reject a filename that
  // tries to smuggle path segments, per doc 13's explicit check.
  const safeBaseName = path.basename(file.originalname);
  if (!safeBaseName || safeBaseName !== file.originalname || safeBaseName.includes('..')) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid filename.');
  }

  const extension = path.extname(safeBaseName).toLowerCase();
  if (!extension) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'File must have an extension.');
  }

  if (DANGEROUS_EXTENSIONS.has(extension)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'This file type is not allowed.');
  }

  // Disguised double-extension check (e.g. "resume.exe.pdf") — inspect every
  // dot-segment before the final one, not just the extension that will
  // actually govern how the OS opens the file.
  const segments = safeBaseName.toLowerCase().split('.');
  for (const segment of segments.slice(1, -1)) {
    if (DANGEROUS_EXTENSIONS.has(`.${segment}`)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Filename contains a disguised file type.');
    }
  }

  if (!allowedExtensions.includes(extension)) {
    throw new ApiError(400, 'VALIDATION_ERROR', `File type ${extension} is not allowed for this upload.`);
  }

  const spec = EXTENSION_CATALOG[extension];
  if (spec && !spec.mimeTypes.includes(file.mimetype) && file.mimetype !== 'application/octet-stream') {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Declared file type does not match its extension.');
  }

  if (spec?.sniffable) {
    const { fileTypeFromBuffer } = await import('file-type');
    const detected = await fileTypeFromBuffer(file.buffer);
    if (!detected || !spec.mimeTypes.includes(detected.mime)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'File content does not match its extension.');
    }
  } else if (extension === '.gguf') {
    if (file.buffer.subarray(0, 4).toString('ascii') !== 'GGUF') {
      throw new ApiError(400, 'VALIDATION_ERROR', 'File content does not match the .gguf format.');
    }
  } else if (extension === '.parquet') {
    const head = file.buffer.subarray(0, 4).toString('ascii');
    const tail = file.buffer.subarray(-4).toString('ascii');
    if (head !== 'PAR1' || tail !== 'PAR1') {
      throw new ApiError(400, 'VALIDATION_ERROR', 'File content does not match the .parquet format.');
    }
  }

  return { extension, safeBaseName };
}

export class StorageService {
  private static async putObject(key: string, file: UploadedFile): Promise<string> {
    if (!r2BucketName) {
      throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'File storage is not configured.');
    }

    const checksum = createHash('sha256').update(file.buffer).digest('hex');

    await r2Client.send(
      new PutObjectCommand({
        Bucket: r2BucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return checksum;
  }

  // The one entry point every upload flow — present and future — goes
  // through. Never saves the original filename as the object key: always a
  // fresh UUID under `${folder}[/${subPath}]/`.
  static async uploadObject(
    folder: StorageFolder,
    subPath: string | undefined,
    file: UploadedFile,
    allowedExtensions: string[],
    maxFileSize: number,
  ): Promise<StoredObjectMetadata> {
    const { extension, safeBaseName } = await validateFile(file, allowedExtensions, maxFileSize);
    const key = [folder, subPath, `${randomUUID()}${extension}`].filter(Boolean).join('/');
    const checksum = await StorageService.putObject(key, file);

    return {
      key,
      url: StorageService.getPublicUrl(key),
      size: file.size,
      mime: file.mimetype,
      filename: safeBaseName,
      extension,
      checksum,
      createdAt: new Date().toISOString(),
    };
  }

  static async deleteObject(key: string | null | undefined): Promise<void> {
    if (!key || !r2BucketName) return;
    await r2Client.send(new DeleteObjectCommand({ Bucket: r2BucketName, Key: key }));
  }

  // Uploads the new object first, then best-effort deletes the previous one
  // — never leaves the record pointing at nothing if the upload itself
  // fails, and never overwrites an existing key in place.
  static async replaceObject(
    previousKey: string | null | undefined,
    folder: StorageFolder,
    subPath: string | undefined,
    file: UploadedFile,
    allowedExtensions: string[],
    maxFileSize: number,
  ): Promise<StoredObjectMetadata> {
    const metadata = await StorageService.uploadObject(folder, subPath, file, allowedExtensions, maxFileSize);

    if (previousKey) {
      await StorageService.deleteObject(previousKey).catch(() => {
        // Best-effort cleanup only — the new object is already live and the
        // DB will be pointed at it; an orphaned old object is a storage-cost
        // issue, not a correctness one.
      });
    }

    return metadata;
  }

  // Returns null unless the bucket has been given a public domain
  // (R2_PUBLIC_URL) — unset today, so every caller must be prepared to fall
  // back to a signed URL via getSignedDownloadUrl().
  static getPublicUrl(key: string): string | null {
    return r2PublicUrl ? `${r2PublicUrl}/${key}` : null;
  }

  static async getSignedDownloadUrl(
    key: string,
    expirySeconds = DOWNLOAD_URL_EXPIRY_SECONDS,
  ): Promise<string> {
    if (!r2BucketName) {
      throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'File storage is not configured.');
    }

    return getSignedUrl(r2Client, new GetObjectCommand({ Bucket: r2BucketName, Key: key }), {
      expiresIn: expirySeconds,
    });
  }

  static getSignedAvatarUrl(key: string): Promise<string> {
    return StorageService.getSignedDownloadUrl(key, AVATAR_URL_EXPIRY_SECONDS);
  }

  // Single resolver for every "this DB column might hold either a plain
  // external URL or an R2 object key" field (Resource.thumbnailUrl/
  // documentationUrl, Dataset.fileUrl, Paper.pdfUrl, Tool.fileUrl). A value
  // already starting with http(s):// is passed through unchanged (someone
  // pasted a link — the backward-compatible path every one of these fields
  // has always supported); anything else is treated as an R2 key and
  // resolved to a signed URL, exactly like avatars already do. Never returns
  // the raw key itself.
  static resolveUrl(value: string | null | undefined): Promise<string | null> {
    if (!value) return Promise.resolve(null);
    if (/^https?:\/\//i.test(value)) return Promise.resolve(value);
    return StorageService.getSignedDownloadUrl(value);
  }

  // --- Backward-compatible flow-specific wrappers ---------------------------
  // Existing call sites (resources/users/contributor-application services)
  // keep calling these exact methods; only their internals now route through
  // the centralized uploadObject/validateFile above.

  static async uploadDatasetFile(
    resourceId: string,
    file: UploadedFile,
  ): Promise<{ key: string; checksum: string }> {
    const metadata = await StorageService.uploadObject(
      STORAGE_FOLDERS.datasets,
      resourceId,
      file,
      DATASET_ALLOWED_EXTENSIONS,
      DATASET_MAX_FILE_SIZE,
    );
    return { key: metadata.key, checksum: metadata.checksum };
  }

  static async uploadAvatar(
    userId: string,
    file: UploadedFile,
  ): Promise<{ key: string; checksum: string }> {
    const metadata = await StorageService.uploadObject(
      STORAGE_FOLDERS.avatars,
      userId,
      file,
      AVATAR_ALLOWED_EXTENSIONS,
      AVATAR_MAX_FILE_SIZE,
    );
    return { key: metadata.key, checksum: metadata.checksum };
  }

  static async uploadContributorSample(
    userId: string,
    file: UploadedFile,
    kind: 'sample' | 'supporting' = 'sample',
  ): Promise<{ key: string; checksum: string }> {
    const allowedExtensions =
      kind === 'supporting' ? CONTRIBUTOR_SUPPORTING_ALLOWED_EXTENSIONS : CONTRIBUTOR_SAMPLE_ALLOWED_EXTENSIONS;
    const metadata = await StorageService.uploadObject(
      STORAGE_FOLDERS.sampleFiles,
      userId,
      file,
      allowedExtensions,
      CONTRIBUTOR_SAMPLE_MAX_FILE_SIZE,
    );
    return { key: metadata.key, checksum: metadata.checksum };
  }

  static async uploadThumbnail(
    resourceId: string,
    file: UploadedFile,
  ): Promise<{ key: string; checksum: string }> {
    const metadata = await StorageService.uploadObject(
      STORAGE_FOLDERS.thumbnails,
      resourceId,
      file,
      THUMBNAIL_ALLOWED_EXTENSIONS,
      THUMBNAIL_MAX_FILE_SIZE,
    );
    return { key: metadata.key, checksum: metadata.checksum };
  }

  static async uploadPaperPdf(
    resourceId: string,
    file: UploadedFile,
  ): Promise<{ key: string; checksum: string }> {
    const metadata = await StorageService.uploadObject(
      STORAGE_FOLDERS.documents,
      resourceId,
      file,
      PAPER_PDF_ALLOWED_EXTENSIONS,
      PAPER_PDF_MAX_FILE_SIZE,
    );
    return { key: metadata.key, checksum: metadata.checksum };
  }

  static async uploadToolAsset(
    resourceId: string,
    file: UploadedFile,
  ): Promise<{ key: string; checksum: string; size: number }> {
    const metadata = await StorageService.uploadObject(
      STORAGE_FOLDERS.resources,
      resourceId,
      file,
      TOOL_ASSET_ALLOWED_EXTENSIONS,
      TOOL_ASSET_MAX_FILE_SIZE,
    );
    return { key: metadata.key, checksum: metadata.checksum, size: metadata.size };
  }

  static async uploadDocumentation(
    resourceId: string,
    file: UploadedFile,
  ): Promise<{ key: string; checksum: string }> {
    const metadata = await StorageService.uploadObject(
      STORAGE_FOLDERS.documents,
      resourceId,
      file,
      DOCUMENTATION_ALLOWED_EXTENSIONS,
      DOCUMENTATION_MAX_FILE_SIZE,
    );
    return { key: metadata.key, checksum: metadata.checksum };
  }
}
