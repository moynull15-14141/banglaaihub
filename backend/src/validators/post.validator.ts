import { z } from 'zod';

// Short — a status update, not a resource description. Multipart body (the
// image rides in the same request as req.file), so this validates req.body
// after multer has already parsed the text field out of the multipart form.
export const createPostSchema = z.object({
  content: z.string().min(1).max(1000).trim(),
});
export type CreatePostInput = z.infer<typeof createPostSchema>;

// Content only — editing the image is out of scope (remove and re-post
// instead), same as this app never lets a resource thumbnail-only edit
// bypass the rest of the form.
export const updatePostSchema = z.object({
  content: z.string().min(1).max(1000).trim(),
});
export type UpdatePostInput = z.infer<typeof updatePostSchema>;

export const listPostsQuerySchema = z.object({
  author: z.string().uuid().optional(),
});
export type ListPostsQuery = z.infer<typeof listPostsQuerySchema>;
