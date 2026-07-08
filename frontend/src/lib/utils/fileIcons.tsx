import { File, FileArchive, FileImage, FileText, type LucideIcon } from 'lucide-react';

const ARCHIVE_EXTENSIONS = new Set(['.zip', '.7z', '.tar', '.gz']);
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png']);

// Shared by AttachmentsSection, ResourceCard badges, and the admin
// moderation file drawer — one icon/label mapping so the three surfaces
// never drift out of sync with each other.
export function getFileIcon(extension: string): LucideIcon {
  const ext = extension.toLowerCase();
  if (ext === '.pdf') return FileText;
  if (ARCHIVE_EXTENSIONS.has(ext)) return FileArchive;
  if (IMAGE_EXTENSIONS.has(ext)) return FileImage;
  return File;
}

export function getFileBadgeLabel(extension: string): string {
  const ext = extension.toLowerCase();
  if (ext === '.pdf') return 'PDF';
  if (ARCHIVE_EXTENSIONS.has(ext)) return 'ZIP';
  if (IMAGE_EXTENSIONS.has(ext)) return 'Image';
  return ext.replace('.', '').toUpperCase();
}
