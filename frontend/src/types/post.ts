export interface PostAuthor {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
}

export interface Post {
  id: string;
  content: string | null;
  image_url: string | null;
  like_count: number;
  status: 'visible' | 'hidden' | 'deleted';
  is_deleted: boolean;
  is_liked: boolean;
  author: PostAuthor | null;
  created_at: string;
  updated_at: string;
}
