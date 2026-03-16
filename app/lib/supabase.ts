import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, key);

/* ─── DB row ↔ Restaurant 変換 ─── */
export interface DbRow {
  id: number;
  name: string;
  name_en: string;
  category: string;
  location: string;
  rating: number;
  review: string;
  date: string;
  images: string[];
  image_alt: string;
  tagline: string | null;
  maps_url: string | null;
  website_url: string | null;
  created_at: string;
}

export function fromDb(row: DbRow) {
  return {
    id: row.id,
    name: row.name,
    nameEn: row.name_en ?? "",
    category: row.category ?? "",
    location: row.location ?? "",
    rating: row.rating ?? 5,
    review: row.review ?? "",
    date: row.date ?? "",
    images: row.images ?? [],
    imageAlt: row.image_alt ?? "",
    tagline: row.tagline ?? undefined,
    mapsUrl: row.maps_url ?? undefined,
    websiteUrl: row.website_url ?? undefined,
  };
}

export function toDb(form: {
  name: string; nameEn: string; category: string; location: string;
  rating: number; review: string; date: string; images: string[];
  tagline: string; mapsUrl: string; websiteUrl: string;
}) {
  return {
    name: form.name.trim(),
    name_en: form.nameEn.trim(),
    category: form.category.trim() || "グルメ",
    location: form.location.trim(),
    rating: form.rating,
    review: form.review.trim(),
    date: form.date.trim() || new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" }),
    image_alt: `${form.name.trim()}の料理`,
    tagline: form.tagline.trim() || null,
    maps_url: form.mapsUrl.trim() || null,
    website_url: form.websiteUrl.trim() || null,
  };
}

/* ─── Blob URL → Supabase Storage にアップロード → public URL を返す ─── */
export async function uploadImage(blobUrl: string): Promise<string> {
  const res = await fetch(blobUrl);
  const blob = await res.blob();
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;

  const { data, error } = await supabase.storage
    .from("restaurant-images")
    .upload(fileName, blob, { contentType: "image/jpeg" });

  if (error || !data) return blobUrl; // 失敗時はフォールバック

  URL.revokeObjectURL(blobUrl);
  return supabase.storage.from("restaurant-images").getPublicUrl(data.path).data.publicUrl;
}
