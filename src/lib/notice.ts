import { supabase } from "@/lib/supabase";
import type { NoticeItem, NoticeMutationInput, NoticeRow } from "@/types/notice";

const NOTICE_SELECT = "id, title, summary, is_published, published_at, expires_at, created_at, updated_at";
const NOTICE_FETCH_LIMIT = 20;
const ADMIN_NOTICE_FETCH_LIMIT = 100;

function mapNoticeRow(row: NoticeRow): NoticeItem {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    isPublished: row.is_published,
    publishedAt: row.published_at,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isActiveNotice(row: NoticeRow, now: Date): boolean {
  if (!row.expires_at) return true;
  return new Date(row.expires_at).getTime() > now.getTime();
}

async function fetchActiveNoticeRows(): Promise<{ rows: NoticeRow[]; now: Date }> {
  const now = new Date();

  const { data, error } = await supabase
    .from("notices")
    .select(NOTICE_SELECT)
    .eq("is_published", true)
    .lte("published_at", now.toISOString())
    .order("published_at", { ascending: false })
    .limit(NOTICE_FETCH_LIMIT)
    .returns<NoticeRow[]>();

  if (error) throw error;

  return { rows: (data ?? []).filter((row) => isActiveNotice(row, now)), now };
}

export async function getLatestNotice(): Promise<NoticeItem | null> {
  const { rows } = await fetchActiveNoticeRows();
  return rows.length > 0 ? mapNoticeRow(rows[0]) : null;
}

export async function getPublishedNotices(): Promise<NoticeItem[]> {
  const { rows } = await fetchActiveNoticeRows();
  return rows.map(mapNoticeRow);
}

function mapNoticeMutationInput(input: NoticeMutationInput) {
  return {
    title: input.title,
    summary: input.summary,
    is_published: input.isPublished,
    published_at: input.publishedAt,
    expires_at: input.expiresAt,
  };
}

export async function getAdminNotices(): Promise<NoticeItem[]> {
  const { data, error } = await supabase
    .from("notices")
    .select(NOTICE_SELECT)
    .order("published_at", { ascending: false })
    .limit(ADMIN_NOTICE_FETCH_LIMIT)
    .returns<NoticeRow[]>();

  if (error) throw error;
  if (!data) return [];

  return data.map(mapNoticeRow);
}

export async function createNotice(input: NoticeMutationInput): Promise<NoticeItem> {
  const { data, error } = await supabase
    .from("notices")
    .insert(mapNoticeMutationInput(input))
    .select(NOTICE_SELECT)
    .single<NoticeRow>();

  if (error) throw error;

  return mapNoticeRow(data);
}

export async function updateNotice(id: string, input: NoticeMutationInput): Promise<NoticeItem> {
  const { data, error } = await supabase
    .from("notices")
    .update({
      ...mapNoticeMutationInput(input),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(NOTICE_SELECT)
    .single<NoticeRow>();

  if (error) throw error;

  return mapNoticeRow(data);
}

export async function deleteNotice(id: string): Promise<void> {
  const { error } = await supabase
    .from("notices")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
