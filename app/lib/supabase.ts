import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 起動時に環境変数が読めているか確認（先頭20文字のみ表示）
console.log("[Supabase] URL:", url ?? "❌ undefined");
console.log("[Supabase] KEY prefix:", key ? key.slice(0, 20) + "..." : "❌ undefined");

export const supabase = createClient(url, key);

/* ─── 実際のDBスキーマに合わせた型定義 ─── */
export interface DbRow {
  id: number;
  name: string;
  rating: number;
  comment: string;        // レビュー文（旧: review）
  image_url: string | null; // 単一画像URL（旧: images[]）
  visit_date: string | null; // YYYY-MM-DD（旧: date）
  created_at: string;
}

/* ─── DB → アプリ内 Restaurant 型へ変換 ─── */
export function fromDb(row: DbRow) {
  return {
    id: row.id,
    name: row.name,
    nameEn: "",
    category: "",
    location: "",
    rating: row.rating ?? 5,
    review: row.comment ?? "",
    date: row.visit_date ?? "",          // YYYY-MM-DD のまま保持、表示時に formatDate() で変換
    images: row.image_url ? [row.image_url] : [],
    imageAlt: `${row.name}の料理`,
    tagline: undefined as string | undefined,
    mapsUrl: undefined as string | undefined,
    websiteUrl: undefined as string | undefined,
  };
}

/* ─── フォーム → DBに送る形式へ変換 ───────────────────────────────────
   送信するカラムは restaurants テーブルの実定義のみ:
     name (text), rating (integer), comment (text), visit_date (date)
   ※ image_url は uploadImage の結果を受けて submitForm 側で付与する
────────────────────────────────────────────────────────────────────── */
export function toDb(form: {
  name: string;
  rating: number;
  review: string;
  date: string;
}) {
  // visit_date: YYYY-MM-DD 形式のみ受け付ける。それ以外・空は null
  const visitDate = /^\d{4}-\d{2}-\d{2}$/.test(form.date) ? form.date : null;

  return {
    name:       form.name.trim(),
    rating:     Math.round(Number(form.rating)), // 確実に integer
    comment:    form.review.trim(),
    visit_date: visitDate,
  };
}

/* ─── INSERT / UPDATE で送る完全な DB ペイロード型 ─── */
export interface DbPayload {
  name:       string;
  rating:     number;
  comment:    string;
  image_url:  string | null;
  visit_date: string | null;
}

/* ─── Blob URL → Supabase Storage にアップロード → public URL を返す ───
   成功: public URL (string)
   失敗: null（blob: URL は絶対に返さない）
─────────────────────────────────────────────────────────────────────── */
export async function uploadImage(blobUrl: string): Promise<string | null> {
  const res = await fetch(blobUrl);
  const blob = await res.blob();
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;

  const { data, error } = await supabase.storage
    .from("restaurant-images")
    .upload(fileName, blob, { contentType: "image/jpeg" });

  if (error || !data) {
    console.error("[upload] 失敗:", error);
    return null; // blob: URL は返さない
  }

  const publicUrl = supabase.storage
    .from("restaurant-images")
    .getPublicUrl(data.path).data.publicUrl;

  console.log("[upload] 成功 — path:", data.path, "/ publicUrl:", publicUrl);
  URL.revokeObjectURL(blobUrl);
  return publicUrl;
}
