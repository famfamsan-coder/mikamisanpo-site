import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

console.log("[Supabase] URL:", url ?? "❌ undefined");
console.log("[Supabase] KEY prefix:", key ? key.slice(0, 20) + "..." : "❌ undefined");

export const supabase = createClient(url, key);

/* ─── DBスキーマに合わせた型定義 ─── */
export interface DbRow {
  id: string;
  name: string;
  name_en: string | null;
  category: string | null;
  location: string | null;
  rating: number;
  comment: string;
  image_url: string | null;
  extra_images: string[] | null;
  visit_date: string | null;
  tagline: string | null;
  maps_url: string | null;
  website_url: string | null;
  created_at: string;
}

/* ─── DB → アプリ内 Restaurant 型へ変換 ─── */
export function fromDb(row: DbRow) {
  return {
    id: row.id,
    name: row.name,
    nameEn: row.name_en ?? "",
    category: row.category ?? "",
    location: row.location ?? "",
    rating: row.rating ?? 5,
    review: row.comment ?? "",
    date: row.visit_date ?? "",
    images: [
      ...(row.image_url ? [row.image_url] : []),
      ...(row.extra_images ?? []),
    ],
    imageAlt: `${row.name}の料理`,
    tagline: row.tagline ?? undefined,
    mapsUrl: row.maps_url ?? undefined,
    websiteUrl: row.website_url ?? undefined,
  };
}

/* ─── フォーム → DBに送る形式へ変換 ─── */
export function toDb(form: {
  name: string;
  nameEn: string;
  category: string;
  location: string;
  rating: number;
  review: string;
  date: string;
  tagline: string;
  mapsUrl: string;
  websiteUrl: string;
}) {
  const visitDate = /^\d{4}-\d{2}-\d{2}$/.test(form.date) ? form.date : null;
  return {
    name:        form.name.trim(),
    name_en:     form.nameEn.trim()     || null,
    category:    form.category.trim()   || null,
    location:    form.location.trim()   || null,
    rating:      Math.round(Number(form.rating)),
    comment:     form.review.trim(),
    visit_date:  visitDate,
    tagline:     form.tagline.trim()    || null,
    maps_url:    form.mapsUrl.trim()    || null,
    website_url: form.websiteUrl.trim() || null,
  };
}

/* ─── INSERT / UPDATE で送る完全な DB ペイロード型 ─── */
export interface DbPayload {
  name:          string;
  name_en:       string | null;
  category:      string | null;
  location:      string | null;
  rating:        number;
  comment:       string;
  image_url:     string | null;
  extra_images:  string[];
  visit_date:    string | null;
  tagline:       string | null;
  maps_url:      string | null;
  website_url:   string | null;
}

/* ─── 複数の画像URLリストをアップロード → [image_url, extra_images] を返す ─── */
export async function uploadImages(
  srcs: string[]
): Promise<{ imageUrl: string | null; extraImages: string[] }> {
  const uploaded: string[] = [];
  for (const src of srcs) {
    if (src.startsWith("blob:")) {
      const url = await uploadImage(src);
      if (url) uploaded.push(url);
    } else {
      uploaded.push(src);
    }
  }
  return {
    imageUrl: uploaded[0] ?? null,
    extraImages: uploaded.slice(1),
  };
}

/* ─── Blob URL → Supabase Storage にアップロード → public URL を返す ─── */
export async function uploadImage(blobUrl: string): Promise<string | null> {
  const res = await fetch(blobUrl);
  const blob = await res.blob();
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;

  const { data, error } = await supabase.storage
    .from("restaurant-images")
    .upload(fileName, blob, { contentType: "image/jpeg" });

  if (error || !data) {
    console.error("[upload] 失敗:", error);
    return null;
  }

  const publicUrl = supabase.storage
    .from("restaurant-images")
    .getPublicUrl(data.path).data.publicUrl;

  console.log("[upload] 成功 — path:", data.path, "/ publicUrl:", publicUrl);
  URL.revokeObjectURL(blobUrl);
  return publicUrl;
}
