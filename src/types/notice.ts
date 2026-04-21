export interface NoticeRow {
  id: string;
  title: string;
  summary: string | null;
  is_published: boolean;
  published_at: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NoticeItem {
  id: string;
  title: string;
  summary: string | null;
  isPublished: boolean;
  publishedAt: string;
  expiresAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface NoticeMutationInput {
  title: string;
  summary: string | null;
  isPublished: boolean;
  publishedAt: string;
  expiresAt: string | null;
}
