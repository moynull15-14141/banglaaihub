import type { Resource } from './resource';

export interface User {
  id: string;
  email: string;
  username: string;
  display_name: string | null;
  reputation_score: number;
  roles: string[];
}

export interface PublicProfileStats {
  total_resources: number;
  total_downloads: number;
  total_views: number;
}

// Mirrors UserService.getPublicProfile() exactly — deliberately does NOT
// include website_url/github_url/scholar_url/location, which the backend
// only exposes on the owner's own profile (GET /users/me).
export interface PublicProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  institution: string | null;
  reputation_score: number;
  is_verified: boolean;
  resources: Resource[];
  stats: PublicProfileStats;
}
