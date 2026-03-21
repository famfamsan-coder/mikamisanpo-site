"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import NextImage from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Star, MapPin, Globe, Pencil, Trash2, Share2 } from "lucide-react";
import { supabase, fromDb, toDb, uploadImages, type DbRow } from "./lib/supabase";

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
interface Restaurant {
  id: string;
  name: string;
  nameEn: string;
  category: string;
  location: string;
  rating: number;
  review: string;
  date: string;
  images: string[];
  imageAlt: string;
  tagline?: string;
  mapsUrl?: string;
  websiteUrl?: string;
}

type Phase = "cover" | "index" | "article" | "form";

const SERIF_JP = "'Shippori Mincho', 'Noto Serif JP', serif";
const SERIF_EN = "'Cormorant Garamond', serif";

/* ─────────────────────────────────────────────
   Date formatter  "2025-11-03" → "2025年11月3日"
───────────────────────────────────────────── */
function formatDate(d: string): string {
  if (!d) return "";
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[1]}年${parseInt(m[2])}月${parseInt(m[3])}日`;
  return d;
}

/* ─────────────────────────────────────────────
   Initial Data
───────────────────────────────────────────── */
const initialRestaurants: Restaurant[] = [
  {
    id: "1",
    name: "割烹 三木屋",
    nameEn: "Kappo Mikiya",
    category: "京料理",
    location: "京都市東山区",
    rating: 5,
    review:
      "出汁の香りが静かに立ち込める、坪庭を望む小さな個室。季節の食材をひとつひとつ丁寧に扱った懐石は、料理人の静かな誇りを感じさせるものだった。白味噌仕立ての椀物には、京都という街の奥深さそのものが凝縮されていた。\n\n箸を置くたびに、次の一皿への期待が静かに膨らんでいく。食事とはこうあるべきだ、と思わずにはいられない夜だった。",
    date: "2025-11-03",
    images: [
      "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=1400&h=900&fit=crop&q=85",
      "https://images.unsplash.com/photo-1569558940588-3f2b4e2f6f07?w=1400&h=900&fit=crop&q=85",
    ],
    imageAlt: "美しく盛り付けられた懐石料理",
    tagline: "静寂の中の一献",
    mapsUrl: "https://www.google.com/maps/search/割烹+三木屋+京都市東山区",
    websiteUrl: "https://example.com/kappo-mikiya",
  },
  {
    id: "2",
    name: "串かつ 浪速亭",
    nameEn: "Kushikatsu Naniwa-tei",
    category: "大阪料理",
    location: "大阪市浪速区",
    rating: 4,
    review:
      "揚げたての串かつをソースに一度だけ潜らせ、口に運ぶ。この一連の所作の中に、大阪の粋がある。カウンター越しに大将と交わす言葉は短くても温かく、初めて訪れたはずなのに、どこか懐かしい気持ちになった。\n\nビールとの相性はもちろん言うまでもなく。締めのどて焼きで胃袋も心も満たされた、そんな夜だった。",
    date: "2025-10-20",
    images: [
      "https://images.unsplash.com/photo-1544025162-d76694265947?w=1400&h=900&fit=crop&q=85",
    ],
    imageAlt: "カウンターに並ぶ揚げたての串かつ",
    tagline: "大阪の粋、一串に宿る",
    mapsUrl: "https://www.google.com/maps/search/串かつ+浪速亭+大阪市浪速区",
  },
  {
    id: "3",
    name: "Les Rosées",
    nameEn: "Les Rosées",
    category: "フレンチ",
    location: "神戸市中央区",
    rating: 5,
    review:
      "神戸の夜景を望む窓辺で、一皿一皿と静かに向き合う時間。地元産の素材をフレンチの技法で昇華させた料理は、どれも詩的な美しさを纏っていた。ソムリエが選んだブルゴーニュのグラスを傾けると、料理の輪郭がさらに鮮明になってゆく。\n\n食事全体が、ひとつの美しい物語のようだった。神戸という港町の夜に、こんな場所があることを誰かに伝えたくなった。",
    date: "2025-09-15",
    images: [
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1400&h=900&fit=crop&q=85",
      "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1400&h=900&fit=crop&q=85",
      "https://images.unsplash.com/photo-1551218808-94e220e084d2?w=1400&h=900&fit=crop&q=85",
    ],
    imageAlt: "洗練されたフレンチのコース料理",
    tagline: "港町に咲く一夜の物語",
    mapsUrl: "https://www.google.com/maps/search/Les+Rosées+神戸市中央区",
    websiteUrl: "https://example.com/les-rosees",
  },
];

const emptyForm = {
  name: "",
  nameEn: "",
  category: "",
  location: "",
  rating: 5,
  review: "",
  date: "",
  images: [] as string[],
  tagline: "",
  mapsUrl: "",
  websiteUrl: "",
};

/* ─────────────────────────────────────────────
   Framer Motion Variants
───────────────────────────────────────────── */
const coverVariants = {
  initial: { x: 0, opacity: 1 },
  exit: {
    x: "-105%",
    opacity: 0,
    transition: { duration: 0.32, ease: [0.4, 0, 0.2, 1] as const },
  },
};
const fadeUpVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.24, ease: "easeOut" as const } },
  exit:    { opacity: 0,        transition: { duration: 0.16 } },
};
const formVariants = {
  initial: { y: "100%" },
  animate: { y: 0,      transition: { duration: 0.3,  ease: [0.25, 0.46, 0.45, 0.94] as const } },
  exit:    { y: "100%", transition: { duration: 0.22, ease: [0.4, 0, 0.2, 1]          as const } },
};
const slideVariants = {
  enter:  (dir: number) => ({ x: dir >= 0 ? "100%" : "-100%", opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:   (dir: number) => ({ x: dir >= 0 ? "-100%" : "100%", opacity: 0 }),
};
const slideTransition = { duration: 0.26, ease: [0.25, 0.46, 0.45, 0.94] as const };

/* ─────────────────────────────────────────────
   compressImage — Canvas でリサイズ＆JPEG圧縮
   最大 1400×900、品質 0.82 に収める
───────────────────────────────────────────── */
function compressImage(file: File, maxW = 1400, maxH = 900, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const tmpUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(tmpUrl);
      let { naturalWidth: w, naturalHeight: h } = img;
      // アスペクト比を保ちながら縮小
      if (w > maxW || h > maxH) {
        const ratio = Math.min(maxW / w, maxH / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width  = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("canvas unavailable")); return; }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error("toBlob failed")); return; }
          resolve(URL.createObjectURL(blob));
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(tmpUrl); reject(new Error("load failed")); };
    img.src = tmpUrl;
  });
}

/* ─────────────────────────────────────────────
   FlexImage
───────────────────────────────────────────── */
function FlexImage({
  src, alt, className, style, onLoad, priority,
}: {
  src: string; alt: string; className?: string;
  style?: React.CSSProperties; onLoad?: () => void; priority?: boolean;
}) {
  const [hasError, setHasError] = useState(false);
  if (!src || hasError) {
    return (
      <div style={{ position: "absolute", inset: 0, width: "100%", height: "100%", background: "rgba(184,146,42,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "11px", letterSpacing: "0.2em", color: "rgba(184,146,42,0.4)" }}>no photo</span>
      </div>
    );
  }
  const isLocal = src.startsWith("blob:") || src.startsWith("data:");
  if (isLocal) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className={className}
        style={{ objectFit: "cover", position: "absolute", inset: 0, width: "100%", height: "100%", ...style }}
        onLoad={onLoad}
        onError={() => setHasError(true)}
      />
    );
  }
  return (
    <NextImage src={src} alt={alt} fill sizes="(max-width: 768px) 100vw, 50vw"
      className={className} style={style} onLoad={onLoad} priority={priority}
      onError={() => setHasError(true)}
    />
  );
}

/* ─────────────────────────────────────────────
   StarRating / StarPicker
───────────────────────────────────────────── */
function StarRating({ rating, max = 5, size = 15 }: { rating: number; max?: number; size?: number }) {
  return (
    <div className="flex gap-1" aria-label={`${rating}点 / ${max}点満点`}>
      {Array.from({ length: max }, (_, i) => (
        <Star key={i} size={size} strokeWidth={1.5}
          style={{ color: "var(--gold)", fill: i < rating ? "var(--gold)" : "none" }} />
      ))}
    </div>
  );
}
function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1" style={{ paddingTop: "4px" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" onClick={() => onChange(i)}
          onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(0)}
          aria-label={`${i}点`}
          style={{ background: "none", border: "none", cursor: "pointer", padding: "0 2px" }}
        >
          <Star size={26} strokeWidth={1.5}
            style={{ color: "var(--gold)", fill: i <= (hover || value) ? "var(--gold)" : "none", transition: "fill 0.15s" }}
          />
        </button>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   FormField
───────────────────────────────────────────── */
function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "28px" }}>
      <label style={{ display: "block", fontFamily: SERIF_EN, fontSize: "10px", letterSpacing: "0.28em", textTransform: "uppercase", color: "var(--gold)", opacity: 0.85, marginBottom: "8px" }}>
        {label}{required && <span style={{ color: "var(--gold)", marginLeft: "3px" }}>*</span>}
      </label>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Masthead
───────────────────────────────────────────── */
function Masthead({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <header style={{ position: "absolute", top: 0, left: 0, right: 0, height: "52px", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", borderBottom: "1px solid rgba(184,146,42,0.25)", zIndex: 10 }}>
      {left}
      <span style={{ fontFamily: SERIF_JP, fontSize: "13px", letterSpacing: "0.2em", fontWeight: 500, color: "var(--ink)", opacity: 0.65 }}>三上うまいもん散歩</span>
      {right}
    </header>
  );
}

function GoldDiamond() {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8"><path d="M4 0 L8 4 L4 8 L0 4 Z" fill="var(--gold)" opacity="0.7" /></svg>
  );
}
function OrnamentRow({ text }: { text?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: text ? "24px" : "0", padding: "0 4px" }}>
      <div style={{ flex: 1, height: "1px", background: "var(--gold)", opacity: 0.3 }} />
      {text
        ? <span style={{ fontFamily: SERIF_EN, fontStyle: "italic", fontSize: "11px", letterSpacing: "0.2em", color: "var(--gold)", opacity: 0.7, whiteSpace: "nowrap" }}>{text}</span>
        : <GoldDiamond />}
      <div style={{ flex: 1, height: "1px", background: "var(--gold)", opacity: 0.3 }} />
    </div>
  );
}

/* ─────────────────────────────────────────────
   StoreLinks
───────────────────────────────────────────── */
function StoreLinks({ mapsUrl, websiteUrl, dark }: { mapsUrl?: string; websiteUrl?: string; dark?: boolean }) {
  if (!mapsUrl && !websiteUrl) return null;
  const color = dark ? "rgba(248,244,236,0.75)" : "var(--gold)";
  const border = dark ? "rgba(248,244,236,0.25)" : "rgba(184,146,42,0.4)";
  const bg     = dark ? "rgba(16,14,12,0.38)"    : "rgba(248,244,236,0.75)";
  const base   = { display: "flex", alignItems: "center", gap: "5px", padding: "5px 10px", border: `1px solid ${border}`, background: bg, backdropFilter: "blur(4px)", textDecoration: "none", fontFamily: SERIF_EN, fontSize: "11px", letterSpacing: "0.1em", color } as React.CSSProperties;
  return (
    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
      {mapsUrl  && <a href={mapsUrl}  target="_blank" rel="noopener noreferrer" style={base}><MapPin  size={12} strokeWidth={1.5} />Maps</a>}
      {websiteUrl && <a href={websiteUrl} target="_blank" rel="noopener noreferrer" style={base}><Globe size={12} strokeWidth={1.5} />Web</a>}
    </div>
  );
}

/* ─────────────────────────────────────────────
   DeleteConfirmModal
───────────────────────────────────────────── */
function DeleteConfirmModal({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(28,26,24,0.68)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1, transition: { duration: 0.2 } }}
        style={{ background: "var(--cream)", padding: "36px 32px", maxWidth: "320px", width: "90%", border: "1px solid rgba(184,146,42,0.3)", textAlign: "center" }}
      >
        <p style={{ fontFamily: SERIF_JP, fontSize: "12px", letterSpacing: "0.1em", color: "var(--ink)", opacity: 0.55, marginBottom: "8px" }}>この記録を削除しますか？</p>
        <p style={{ fontFamily: SERIF_JP, fontSize: "16px", fontWeight: 500, letterSpacing: "0.1em", color: "var(--ink)", marginBottom: "28px" }}>{name}</p>
        <div style={{ display: "flex", gap: "12px" }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "11px", border: "1px solid rgba(184,146,42,0.4)", background: "transparent", cursor: "pointer", fontFamily: SERIF_JP, fontSize: "13px", letterSpacing: "0.15em", color: "var(--ink)" }}>
            キャンセル
          </button>
          <button onClick={onConfirm} style={{ flex: 1, padding: "11px", border: "none", background: "var(--ink)", cursor: "pointer", fontFamily: SERIF_JP, fontSize: "13px", letterSpacing: "0.2em", color: "var(--cream)" }}>
            削 除
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main Page
───────────────────────────────────────────── */
export default function Home() {
  const [phase, setPhase]                 = useState<Phase>("cover");
  const [restaurants, setRestaurants]     = useState<Restaurant[]>(initialRestaurants);
  const [currentIndex, setCurrentIndex]   = useState(0);
  const [direction, setDirection]         = useState(0);
  const [imgLoaded, setImgLoaded]         = useState(false);
  const [imgIdx, setImgIdx]               = useState(0);
  const [form, setForm]                   = useState(emptyForm);
  const [editingId, setEditingId]         = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [urlInput, setUrlInput]           = useState("");
  const [gpsLoading, setGpsLoading]       = useState(false);
  const [isMagazineMode, setIsMagazineMode] = useState(false);
  const [linkCopied, setLinkCopied]       = useState(false);
  const [compressing, setCompressing]     = useState(false);
  const [submitting, setSubmitting]       = useState(false);
  const [saveError, setSaveError]         = useState<string | null>(null);
  const [dbLoaded, setDbLoaded]           = useState(false);
  const [isMobile, setIsMobile]           = useState(false);
  const fileInputRef                      = useRef<HTMLInputElement>(null);
  const touchStartX                       = useRef(0);
  const touchStartY                       = useRef(0);

  /* ── Responsive ── */
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 680);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  /* ── Magazine mode detection ── */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "magazine") setIsMagazineMode(true);
  }, []);

  /* ── Supabase: 起動時にデータ取得 ── */
  useEffect(() => {
    supabase
      .from("restaurants")
      .select("*")
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error("[Supabase SELECT] データ取得失敗:", error);
        } else if (data && data.length > 0) {
          setRestaurants((data as DbRow[]).map(fromDb));
        }
        setDbLoaded(true);
      });
  }, []);

  const updateForm = useCallback(
    (key: keyof typeof emptyForm, value: string | number | string[]) =>
      setForm((f) => ({ ...f, [key]: value })),
    []
  );

  /* ── File upload — Canvas 圧縮してから追加 ── */
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    e.target.value = "";          // 同じファイルを再選択できるようリセット
    setCompressing(true);
    try {
      const urls = await Promise.all(files.map((f) => compressImage(f)));
      setForm((f) => ({ ...f, images: [...f.images, ...urls] }));
    } catch (err) {
      console.error("Image compression failed:", err);
    } finally {
      setCompressing(false);
    }
  }, []);

  const removeFormImage = useCallback((idx: number) => {
    setForm((f) => {
      const url = f.images[idx];
      if (url.startsWith("blob:")) URL.revokeObjectURL(url);
      return { ...f, images: f.images.filter((_, i) => i !== idx) };
    });
  }, []);

  const addUrlImage = useCallback(() => {
    const url = urlInput.trim();
    if (!url) return;
    setForm((f) => ({ ...f, images: [...f.images, url] }));
    setUrlInput("");
  }, [urlInput]);

  /* ── GPS ── */
  const getGPS = useCallback(() => {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setForm((f) => ({ ...f, mapsUrl: `https://www.google.com/maps?q=${latitude},${longitude}` }));
        setGpsLoading(false);
      },
      () => setGpsLoading(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  /* ── Share ── */
  const copyMagazineLink = useCallback(() => {
    const url = `${window.location.origin}${window.location.pathname}?mode=magazine`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    });
  }, []);

  /* ── Navigation ── */
  const openArticle = useCallback((index: number) => {
    setCurrentIndex(index);
    setImgLoaded(false);
    setImgIdx(0);
    setDirection(0);
    setPhase("article");
  }, []);

  const openForm = useCallback(() => {
    setForm({ ...emptyForm, images: [] });
    setUrlInput("");
    setEditingId(null);
    setSaveError(null);
    setPhase("form");
  }, []);

  const openEdit = useCallback((r: Restaurant) => {
    setForm({
      name: r.name,
      nameEn: r.nameEn,
      category: r.category,
      location: r.location,
      rating: r.rating,
      review: r.review,
      date: r.date,
      images: [...r.images],
      tagline: r.tagline || "",
      mapsUrl: r.mapsUrl || "",
      websiteUrl: r.websiteUrl || "",
    });
    setEditingId(r.id);
    setUrlInput("");
    setPhase("form");
  }, []);

  const submitForm = useCallback(async () => {
    if (!form.name.trim() || submitting) return;
    setSubmitting(true);
    setSaveError(null);
    try {
      // ── 画像処理（複数対応。blob: のみアップロード。失敗時はスキップ）──
      const { imageUrl: finalImageUrl, extraImages } = await uploadImages(form.images);
      if (form.images.length > 0 && !finalImageUrl && extraImages.length === 0) {
        console.warn("[submit] 全画像アップロード失敗 — image_url = null で保存継続");
      }

      // ── エラー詳細を整形して返す helper ──
      const formatError = (e: { message?: string; details?: string; hint?: string; code?: string }) =>
        [e.message, e.details && `details: ${e.details}`, e.hint && `hint: ${e.hint}`, e.code && `code: ${e.code}`]
          .filter(Boolean).join(" / ");

      // ── ID確定：編集時はそのID、新規はUUID生成 ──
      const isEditing = editingId !== null;
      const id = editingId ?? crypto.randomUUID();

      // ── UPSERT ペイロード組み立て（id を含む） ──
      const upsertPayload = {
        id,
        ...toDb(form),
        image_url: finalImageUrl,
        extra_images: extraImages,
      };

      console.log("[upsert] 送信データ:", JSON.stringify(upsertPayload));

      // ── UPSERT（IDが存在すれば UPDATE、なければ INSERT） ──
      const { data, error } = await supabase
        .from("restaurants")
        .upsert([upsertPayload], { onConflict: "id" })
        .select()
        .single();

      if (error) {
        console.error("[upsert] 失敗:", JSON.stringify(error));
        setSaveError(`保存失敗: ${formatError(error)}`);
      } else if (data) {
        console.log("[upsert] 成功:", data);
        if (isEditing) {
          const idx = restaurants.findIndex((r) => r.id === editingId);
          setRestaurants((prev) => prev.map((r) => r.id === editingId ? fromDb(data as DbRow) : r));
          setCurrentIndex(idx >= 0 ? idx : 0);
          setImgIdx(0); setImgLoaded(false);
          setEditingId(null);
          setPhase("article");
        } else {
          setRestaurants((prev) => [...prev, fromDb(data as DbRow)]);
          setPhase("index");
        }
      } else {
        const msg = "UPSERT後のSELECTが空 — RLS SELECTポリシーを確認";
        console.warn("[upsert]", msg);
        setSaveError(msg);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[submit] 予期しない例外:", e);
      setSaveError(`予期しないエラー: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  }, [form, editingId, restaurants, submitting]);

  const deleteRestaurant = useCallback(async (id: string) => {
    const { error } = await supabase.from("restaurants").delete().eq("id", id);
    if (error) {
      console.error("[Supabase DELETE] 削除失敗:", error);
      return;
    }
    setRestaurants((prev) => prev.filter((r) => r.id !== id));
    setConfirmDeleteId(null);
    setPhase("index");
  }, []);

  const goNext = useCallback(() => {
    if (currentIndex >= restaurants.length - 1) return;
    setDirection(1); setImgLoaded(false); setImgIdx(0);
    setCurrentIndex((i) => i + 1);
  }, [currentIndex, restaurants.length]);

  const goPrev = useCallback(() => {
    if (currentIndex <= 0) return;
    setDirection(-1); setImgLoaded(false); setImgIdx(0);
    setCurrentIndex((i) => i - 1);
  }, [currentIndex]);

  /* ── Touch swipe ── */
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    const dy = Math.abs(touchStartY.current - e.changedTouches[0].clientY);
    if (Math.abs(dx) > 48 && dy < 36) { if (dx > 0) goNext(); else goPrev(); }
  }, [goNext, goPrev]);

  /* ── Keyboard ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase === "cover"   && e.key === "Enter")      setPhase("index");
      if (phase === "article") {
        if (e.key === "ArrowRight") goNext();
        if (e.key === "ArrowLeft")  goPrev();
        if (e.key === "Escape")     setPhase("index");
      }
      if (phase === "form" && e.key === "Escape") { setEditingId(null); setPhase("index"); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, goNext, goPrev]);

  const restaurant = restaurants[currentIndex];

  /* ── Shared icon-button style ── */
  const iconBtn = (extra?: React.CSSProperties): React.CSSProperties => ({
    background: "none", border: "none", cursor: "pointer", padding: "6px",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "var(--ink)", opacity: 0.5, ...extra,
  });

  /* ──────────────────────────────────────────
     Render
  ────────────────────────────────────────── */
  return (
    <main className="fixed inset-0 overflow-hidden" style={{ backgroundColor: "var(--cream)" }}>

      {/* Delete confirmation modal */}
      {confirmDeleteId !== null && (() => {
        const target = restaurants.find((r) => r.id === confirmDeleteId);
        return target ? (
          <DeleteConfirmModal
            name={target.name}
            onConfirm={() => deleteRestaurant(confirmDeleteId)}
            onCancel={() => setConfirmDeleteId(null)}
          />
        ) : null;
      })()}

      {/* ════════════════════════ COVER ════════════════════════ */}
      <AnimatePresence>
        {phase === "cover" && (
          <motion.div
            key="cover"
            variants={coverVariants}
            initial="initial"
            exit="exit"
            onClick={() => setPhase("index")}
            role="button" tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && setPhase("index")}
            aria-label="アプリを開く"
            style={{ position: "fixed", inset: 0, zIndex: 20, backgroundColor: "var(--cream)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", userSelect: "none" }}
          >
            <div className="texture-overlay" />
            {["top", "bottom"].map((pos) => (
              <div key={pos} style={{ position: "absolute", [pos]: 0, left: 0, right: 0, height: "1px", opacity: 0.3, background: "linear-gradient(90deg, transparent, var(--gold), transparent)" }} />
            ))}
            <div style={{ position: "absolute", left: "32px",  top: 0, bottom: 0, width: "1px", background: "var(--gold)", opacity: 0.2 }} />
            <div style={{ position: "absolute", right: "32px", top: 0, bottom: 0, width: "1px", background: "var(--gold)", opacity: 0.2 }} />

            {isMagazineMode && (
              <div style={{ position: "absolute", top: "20px", right: "50px", padding: "3px 10px", border: "1px solid rgba(184,146,42,0.4)", background: "rgba(184,146,42,0.08)" }}>
                <span style={{ fontFamily: SERIF_EN, fontSize: "9px", letterSpacing: "0.25em", color: "var(--gold)", textTransform: "uppercase" }}>Magazine View</span>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, padding: "0 32px", textAlign: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "32px" }}>
                <div style={{ width: "64px", height: "1px", background: "var(--gold)", opacity: 0.5 }} />
                <GoldDiamond />
                <div style={{ width: "64px", height: "1px", background: "var(--gold)", opacity: 0.5 }} />
              </div>
              <p style={{ color: "var(--gold)", letterSpacing: "0.3em", fontFamily: SERIF_EN, fontStyle: "italic", fontSize: "12px", marginBottom: "16px" }}>
                Mikami&apos;s Gourmet Journey
              </p>
              <h1 style={{ color: "var(--ink)", fontFamily: SERIF_JP, fontSize: "clamp(2.4rem, 8vw, 5rem)", fontWeight: 500, letterSpacing: "0.12em", lineHeight: 1.2 }}>
                三上うまいもん散歩
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "32px" }}>
                <div style={{ width: "64px", height: "1px", background: "var(--gold)", opacity: 0.5 }} />
                <GoldDiamond />
                <div style={{ width: "64px", height: "1px", background: "var(--gold)", opacity: 0.5 }} />
              </div>
              <p style={{ marginTop: "40px", color: "var(--ink)", opacity: 0.4, letterSpacing: "0.2em", fontFamily: SERIF_EN, fontSize: "12px" }}>
                Vol. III &nbsp;·&nbsp; 2025 Autumn
              </p>
            </div>

            <div style={{ position: "absolute", bottom: "48px", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
              <p className="tap-hint" style={{ color: "var(--ink)", opacity: 0.5, letterSpacing: "0.3em", fontFamily: SERIF_EN, fontSize: "12px" }}>Tap to Open</p>
              <svg className="tap-hint" width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ animationDelay: "0.3s" }}>
                <path d="M10 4 L10 16 M6 12 L10 16 L14 12" stroke="var(--gold)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
              </svg>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════════════════════ INDEX ════════════════════════ */}
      <AnimatePresence>
        {phase === "index" && (
          <motion.div
            key="index"
            variants={fadeUpVariants}
            initial="initial" animate="animate" exit="exit"
            style={{ position: "fixed", inset: 0, zIndex: 10, backgroundColor: "var(--cream)" }}
          >
            <div className="texture-overlay" />

            <Masthead
              left={
                <span style={{ fontFamily: SERIF_EN, fontStyle: "italic", fontSize: "12px", letterSpacing: "0.15em", color: "var(--gold)", opacity: 0.8 }}>
                  {isMagazineMode ? "📖 Magazine View" : "Mikami's Gourmet Journey"}
                </span>
              }
              right={
                <span style={{ fontFamily: SERIF_EN, fontSize: "12px", letterSpacing: "0.1em", color: "var(--ink)", opacity: 0.4 }}>
                  {restaurants.length} 件
                </span>
              }
            />

            <div style={{ position: "absolute", top: "52px", bottom: "64px", left: 0, right: 0, overflowY: "auto", padding: isMobile ? "28px 16px" : "32px clamp(24px, 5vw, 64px)", scrollbarWidth: "thin", scrollbarColor: "#d4c5a9 transparent" }}>
              <OrnamentRow text="Vol. III · 2025 Autumn" />

              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(3, minmax(0, 280px))", gap: isMobile ? "14px" : "20px", justifyContent: "center" }}>
                {restaurants.map((r, i) => (
                  <div key={r.id} style={{ position: "relative", border: "1px solid rgba(184,146,42,0.2)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                    <motion.button
                      onClick={() => openArticle(i)}
                      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                      whileTap={{ scale: 0.98 }}
                      style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", display: "flex", flexDirection: "column", flex: 1 }}
                    >
                      {/* Photo */}
                      <div style={{ position: "relative", aspectRatio: "2/3", width: "100%", overflow: "hidden" }}>
                        {r.images[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.images[0]} alt={r.imageAlt} style={{ objectFit: "cover", width: "100%", height: "100%", display: "block" }} />
                        ) : (
                          <div style={{ width: "100%", height: "100%", background: "rgba(184,146,42,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "11px", letterSpacing: "0.2em", color: "rgba(184,146,42,0.4)" }}>no photo</span>
                          </div>
                        )}
                        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 55%, rgba(28,26,24,0.72))" }} />
                        <div style={{ position: "absolute", top: "8px", left: "8px", padding: "2px 7px", background: "rgba(248,244,236,0.92)", border: "1px solid rgba(184,146,42,0.4)" }}>
                          <span style={{ fontFamily: SERIF_JP, fontSize: "10px", letterSpacing: "0.15em", color: "var(--gold)" }}>{r.category}</span>
                        </div>
                        <div style={{ position: "absolute", bottom: "8px", left: "8px", display: "flex", gap: "2px" }}>
                          {Array.from({ length: 5 }, (_, j) => (
                            <Star key={j} size={9} strokeWidth={1.5} style={{ color: "var(--gold)", fill: j < r.rating ? "var(--gold)" : "none" }} />
                          ))}
                        </div>
                        {r.images.length > 1 && (
                          <div style={{ position: "absolute", bottom: "8px", right: "8px", padding: "2px 5px", background: "rgba(16,14,12,0.55)", backdropFilter: "blur(4px)" }}>
                            <span style={{ fontFamily: SERIF_EN, fontSize: "9px", color: "rgba(248,244,236,0.7)", letterSpacing: "0.05em" }}>+{r.images.length - 1}</span>
                          </div>
                        )}
                      </div>
                      {/* Text body */}
                      <div style={{ padding: "10px 11px 8px", borderTop: "1px solid rgba(184,146,42,0.15)" }}>
                        <p style={{ fontFamily: SERIF_EN, fontStyle: "italic", fontSize: "10px", letterSpacing: "0.08em", color: "var(--gold)", marginBottom: "3px", opacity: 0.85, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{r.nameEn}</p>
                        <p style={{ fontFamily: SERIF_JP, fontSize: "13px", letterSpacing: "0.06em", color: "var(--ink)", fontWeight: 500, lineHeight: 1.35, marginBottom: "4px", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{r.name}</p>
                        <p style={{ fontFamily: SERIF_EN, fontSize: "10px", color: "var(--ink)", opacity: 0.35, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{[r.location, formatDate(r.date)].filter(Boolean).join(" · ")}</p>
                      </div>
                    </motion.button>

                    {/* Edit / Delete row (hidden in magazine mode) */}
                    {!isMagazineMode && (
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px", padding: "6px 10px 10px", borderTop: "1px solid rgba(184,146,42,0.1)" }}>
                        <motion.button
                          onClick={(e) => { e.stopPropagation(); openEdit(r); }}
                          whileTap={{ scale: 0.9 }}
                          style={{ display: "flex", alignItems: "center", gap: "4px", background: "none", border: "1px solid rgba(184,146,42,0.3)", padding: "3px 8px", cursor: "pointer", fontFamily: SERIF_EN, fontSize: "9px", letterSpacing: "0.12em", color: "var(--gold)" }}
                        >
                          <Pencil size={9} strokeWidth={1.8} />編集
                        </motion.button>
                        <motion.button
                          onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(r.id); }}
                          whileTap={{ scale: 0.9 }}
                          style={{ display: "flex", alignItems: "center", gap: "4px", background: "none", border: "1px solid rgba(184,146,42,0.2)", padding: "3px 8px", cursor: "pointer", fontFamily: SERIF_EN, fontSize: "9px", letterSpacing: "0.12em", color: "var(--ink)", opacity: 0.4 }}
                        >
                          <Trash2 size={9} strokeWidth={1.8} />削除
                        </motion.button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <footer style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "64px", borderTop: "1px solid rgba(184,146,42,0.2)", backgroundColor: "rgba(248,244,236,0.95)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", gap: "16px" }}>
              {isMagazineMode ? (
                <p style={{ fontFamily: SERIF_EN, fontStyle: "italic", fontSize: "12px", letterSpacing: "0.2em", color: "var(--gold)", opacity: 0.7 }}>
                  Mikami&apos;s Gourmet Journey
                </p>
              ) : (
                <>
                  <motion.button
                    onClick={copyMagazineLink}
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    style={{ display: "flex", alignItems: "center", gap: "7px", padding: "9px 18px", border: "1px solid rgba(184,146,42,0.35)", background: "transparent", cursor: "pointer", fontFamily: SERIF_JP, fontSize: "12px", letterSpacing: "0.12em", color: linkCopied ? "var(--gold)" : "var(--ink)", opacity: 0.75, transition: "color 0.3s" }}
                  >
                    <Share2 size={13} strokeWidth={1.5} />
                    {linkCopied ? "コピーしました ✓" : "友達に共有"}
                  </motion.button>

                  <div style={{ width: "1px", height: "22px", background: "rgba(184,146,42,0.25)" }} />

                  <motion.button
                    onClick={openForm}
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 22px", border: "1px solid rgba(184,146,42,0.5)", background: "transparent", cursor: "pointer", fontFamily: SERIF_JP, fontSize: "13px", letterSpacing: "0.18em", color: "var(--ink)" }}
                  >
                    <span style={{ fontSize: "18px", color: "var(--gold)", lineHeight: 1 }}>+</span>
                    新しい記録を追加
                  </motion.button>
                </>
              )}
            </footer>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════════════════════ ARTICLE ════════════════════════ */}
      <AnimatePresence>
        {phase === "article" && restaurant && (
          <motion.div
            key="article"
            variants={fadeUpVariants}
            initial="initial" animate="animate" exit="exit"
            style={{ position: "fixed", inset: 0, zIndex: 10, backgroundColor: "var(--cream)" }}
          >
            <div className="texture-overlay" />

            <Masthead
              left={
                <motion.button
                  onClick={() => setPhase("index")}
                  whileHover={{ x: -3 }}
                  style={{ display: "flex", alignItems: "center", gap: "5px", background: "none", border: "none", cursor: "pointer", fontFamily: SERIF_EN, fontStyle: "italic", fontSize: "12px", letterSpacing: "0.1em", color: "var(--gold)", opacity: 0.8, padding: "4px 0" }}
                >
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M8.5 2 L3.5 6.5 L8.5 11" stroke="var(--gold)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  目次
                </motion.button>
              }
              right={
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  {!isMagazineMode && (
                    <>
                      <motion.button
                        onClick={() => openEdit(restaurant)}
                        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        style={iconBtn()}
                        aria-label="編集"
                        title="この記録を編集"
                      >
                        <Pencil size={14} strokeWidth={1.8} />
                      </motion.button>
                      <motion.button
                        onClick={() => setConfirmDeleteId(restaurant.id)}
                        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        style={iconBtn({ opacity: 0.35 })}
                        aria-label="削除"
                        title="この記録を削除"
                      >
                        <Trash2 size={14} strokeWidth={1.8} />
                      </motion.button>
                      <div style={{ width: "1px", height: "16px", background: "rgba(184,146,42,0.25)" }} />
                    </>
                  )}
                  <span style={{ fontFamily: SERIF_EN, fontSize: "12px", letterSpacing: "0.1em", color: "var(--ink)", opacity: 0.4 }}>
                    {currentIndex + 1} / {restaurants.length}
                  </span>
                </div>
              }
            />

            {/* Sliding spread area */}
            <div
              style={{ position: "absolute", top: "52px", bottom: "56px", left: 0, right: 0, overflow: "hidden" }}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <AnimatePresence initial={false} custom={direction}>
                <motion.div
                  key={currentIndex}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter" animate="center" exit="exit"
                  transition={slideTransition}
                  style={{ position: "absolute", inset: 0, display: "flex" }}
                >
                  {isMobile ? (
                    /* ══════ MOBILE ══════ */
                    <>
                      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
                        <div className="photo-placeholder" style={{ position: "absolute", inset: 0 }} />
                        {(restaurant.images[imgIdx] ?? restaurant.images[0]) && (
                          <FlexImage
                            src={restaurant.images[imgIdx] ?? restaurant.images[0]}
                            alt={restaurant.imageAlt}
                            className="object-cover"
                            style={{ transition: "opacity 0.4s ease", opacity: imgLoaded ? 1 : 0 }}
                            onLoad={() => setImgLoaded(true)}
                            priority
                          />
                        )}
                        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to left, rgba(16,14,12,0.82) 0%, rgba(16,14,12,0.50) 45%, rgba(16,14,12,0.62) 100%)" }} />
                      </div>

                      <div style={{ position: "absolute", top: "14px", right: "14px", padding: "3px 9px", background: "rgba(248,244,236,0.12)", backdropFilter: "blur(6px)", border: "1px solid rgba(184,146,42,0.5)", zIndex: 3 }}>
                        <span style={{ fontFamily: SERIF_JP, fontSize: "10px", letterSpacing: "0.2em", color: "var(--gold)" }}>{restaurant.category}</span>
                      </div>

                      {restaurant.images.length > 1 && (
                        <div style={{ position: "absolute", top: "46px", right: "14px", display: "flex", gap: "5px", zIndex: 3 }}>
                          {restaurant.images.map((_, i) => (
                            <button key={i} onClick={() => { setImgLoaded(false); setImgIdx(i); }}
                              style={{ width: i === imgIdx ? "16px" : "6px", height: "6px", borderRadius: "9999px", background: i === imgIdx ? "var(--gold)" : "rgba(248,244,236,0.4)", border: "none", cursor: "pointer", padding: 0, transition: "width 0.3s, background 0.3s" }}
                              aria-label={`写真${i + 1}`}
                            />
                          ))}
                        </div>
                      )}

                      {/* 縦書きコンテンツ — 本文最優先レイアウト */}
                      <div style={{ position: "absolute", inset: 0, padding: "20px 12px 64px", display: "flex", flexDirection: "row-reverse", alignItems: "stretch", overflow: "hidden", zIndex: 2 }}>

                        {/* 店名列（コンパクト化） */}
                        <div style={{ writingMode: "vertical-rl", textOrientation: "mixed", flexShrink: 0, display: "flex", flexDirection: "column", justifyContent: "center", paddingLeft: "2px", paddingTop: "36px" }}>
                          <span style={{ fontFamily: SERIF_EN, fontStyle: "italic", fontSize: "9px", letterSpacing: "0.15em", color: "rgba(184,146,42,0.7)", marginBottom: "8px" }}>{restaurant.nameEn}</span>
                          <span style={{ fontFamily: SERIF_JP, fontSize: "clamp(1.1rem, 4vw, 1.4rem)", fontWeight: 500, letterSpacing: "0.18em", lineHeight: 1.0, color: "rgba(255,252,244,0.96)" }}>{restaurant.name}</span>
                        </div>

                        <div style={{ flexShrink: 0, width: "1px", margin: "12px 8px", background: "linear-gradient(to bottom, transparent, rgba(184,146,42,0.6) 20%, rgba(184,146,42,0.6) 80%, transparent)" }} />

                        {/* カテゴリ・評価列（タグライン省略・文字小） */}
                        <div style={{ writingMode: "vertical-rl", textOrientation: "mixed", flexShrink: 0, display: "flex", flexDirection: "column", gap: "10px", paddingRight: "2px", justifyContent: "center" }}>
                          <span style={{ fontFamily: SERIF_JP, fontSize: "10px", letterSpacing: "0.2em", color: "rgba(184,146,42,0.85)" }}>{restaurant.category}</span>
                          <span style={{ fontFamily: SERIF_JP, fontSize: "10px", letterSpacing: "0.05em", color: "rgba(184,146,42,0.9)" }}>{"★".repeat(restaurant.rating)}{"☆".repeat(5 - restaurant.rating)}</span>
                        </div>

                        <div style={{ flexShrink: 0, width: "1px", margin: "12px 8px", background: "linear-gradient(to bottom, transparent, rgba(184,146,42,0.35) 20%, rgba(184,146,42,0.35) 80%, transparent)" }} />

                        {/* 本文列 — 全文表示・スクロール対応・画面の大半を占有 */}
                        <div className="review-mobile" style={{ writingMode: "vertical-rl", textOrientation: "mixed", flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                          <span style={{ fontFamily: SERIF_JP, fontSize: "12px", lineHeight: 2.0, letterSpacing: "0.06em", color: "rgba(240,234,222,0.82)", flexShrink: 0, whiteSpace: "pre-wrap" }}>{restaurant.review}</span>
                          <span style={{ fontFamily: SERIF_EN, fontStyle: "italic", fontSize: "9px", letterSpacing: "0.12em", color: "rgba(248,244,236,0.32)", marginTop: "16px", flexShrink: 0 }}>{restaurant.location}</span>
                          <span style={{ fontFamily: SERIF_JP, fontSize: "9px", letterSpacing: "0.12em", color: "rgba(248,244,236,0.26)", marginTop: "8px", flexShrink: 0 }}>{formatDate(restaurant.date)}</span>
                        </div>

                      </div>

                      <div style={{ position: "absolute", bottom: "14px", left: "14px", zIndex: 3 }}>
                        <StoreLinks mapsUrl={restaurant.mapsUrl} websiteUrl={restaurant.websiteUrl} dark />
                      </div>
                    </>
                  ) : (
                    /* ══════ DESKTOP ══════ */
                    <>
                      {/* Left 58%: Photo */}
                      <div style={{ position: "relative", flexShrink: 0, width: "58%", height: "100%", overflow: "hidden" }}>
                        <div className="photo-placeholder" style={{ position: "absolute", inset: 0 }} />
                        {(restaurant.images[imgIdx] ?? restaurant.images[0]) && (
                          <FlexImage
                            src={restaurant.images[imgIdx] ?? restaurant.images[0]}
                            alt={restaurant.imageAlt}
                            className="object-cover"
                            style={{ transition: "opacity 0.4s ease", opacity: imgLoaded ? 1 : 0 }}
                            onLoad={() => setImgLoaded(true)}
                            priority
                          />
                        )}
                        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(16,14,12,0.06) 0%, transparent 35%, rgba(16,14,12,0.75) 75%, rgba(16,14,12,0.90) 100%)" }} />

                        <div style={{ position: "absolute", top: "24px", left: "24px", padding: "4px 11px", background: "rgba(248,244,236,0.1)", backdropFilter: "blur(6px)", border: "1px solid rgba(184,146,42,0.5)", zIndex: 2 }}>
                          <span style={{ fontFamily: SERIF_JP, fontSize: "11px", letterSpacing: "0.22em", color: "var(--gold)" }}>{restaurant.category}</span>
                        </div>

                        {restaurant.images.length > 1 && (
                          <div style={{ position: "absolute", top: "62px", left: "24px", display: "flex", gap: "6px", zIndex: 2 }}>
                            {restaurant.images.map((_, i) => (
                              <button key={i} onClick={() => { setImgLoaded(false); setImgIdx(i); }}
                                style={{ width: i === imgIdx ? "20px" : "7px", height: "7px", borderRadius: "9999px", background: i === imgIdx ? "var(--gold)" : "rgba(248,244,236,0.4)", border: "none", cursor: "pointer", padding: 0, transition: "width 0.3s, background 0.3s" }}
                                aria-label={`写真${i + 1}`}
                              />
                            ))}
                          </div>
                        )}

                        {restaurant.tagline && (
                          <div style={{ position: "absolute", right: "16px", top: "50%", transform: "translateY(-50%)", zIndex: 2 }}>
                            <span style={{ writingMode: "vertical-rl", textOrientation: "mixed", fontFamily: SERIF_JP, fontSize: "11px", letterSpacing: "0.38em", color: "rgba(248,244,236,0.55)" }}>{restaurant.tagline}</span>
                          </div>
                        )}

                        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "clamp(20px,3vw,36px) clamp(20px,3vw,36px) clamp(24px,3.5vw,40px)", zIndex: 2 }}>
                          <p style={{ fontFamily: SERIF_EN, fontStyle: "italic", fontSize: "clamp(11px,1.1vw,13px)", letterSpacing: "0.18em", color: "rgba(184,146,42,0.8)", marginBottom: "6px" }}>{restaurant.nameEn}</p>
                          <h2 style={{ fontFamily: SERIF_JP, fontSize: "clamp(1.8rem, 4vw, 3.2rem)", fontWeight: 500, letterSpacing: "0.1em", lineHeight: 1.15, color: "rgba(255,252,244,0.97)", marginBottom: "14px" }}>{restaurant.name}</h2>
                          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                            <StarRating rating={restaurant.rating} size={15} />
                            <span style={{ fontFamily: SERIF_EN, fontStyle: "italic", fontSize: "11px", letterSpacing: "0.1em", color: "rgba(248,244,236,0.5)" }}>{restaurant.location}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right 42%: Review */}
                      <div style={{ flex: 1, minWidth: 0, position: "relative", display: "flex", flexDirection: "column", overflow: "hidden", padding: "clamp(28px,4vw,56px) clamp(24px,3.5vw,48px)", borderLeft: "1px solid rgba(184,146,42,0.12)" }}>
                        <div style={{ position: "absolute", bottom: "10%", left: "50%", transform: "translateX(-50%)", pointerEvents: "none", overflow: "hidden", whiteSpace: "nowrap" }}>
                          <span style={{ fontFamily: SERIF_EN, fontSize: "clamp(4rem, 10vw, 9rem)", fontWeight: 700, color: "var(--ink)", opacity: 0.028, letterSpacing: "0.05em", textTransform: "uppercase", userSelect: "none" }}>{restaurant.nameEn.toUpperCase()}</span>
                        </div>

                        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "clamp(20px,3vw,36px)" }}>
                            <div style={{ width: "32px", height: "1px", background: "var(--gold)", opacity: 0.45 }} />
                            <GoldDiamond />
                            <div style={{ flex: 1, height: "1px", background: "var(--gold)", opacity: 0.18 }} />
                          </div>

                          <div className="review-text" style={{ flex: 1, minHeight: 0, overflow: "hidden auto" }}>
                            {restaurant.review.split("\n\n").map((para, i) => (
                              <p key={i} style={{ fontFamily: SERIF_JP, fontSize: "clamp(12px, 1.3vw, 15px)", fontWeight: 400, lineHeight: 2.1, color: "#3D3830", marginBottom: "1.4em" }}>{para}</p>
                            ))}
                          </div>

                          <div style={{ marginTop: "auto", paddingTop: "16px", borderTop: "1px solid rgba(184,146,42,0.2)" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
                              <StoreLinks mapsUrl={restaurant.mapsUrl} websiteUrl={restaurant.websiteUrl} />
                              <span style={{ fontFamily: SERIF_JP, fontSize: "12px", letterSpacing: "0.15em", color: "var(--ink)", opacity: 0.4 }}>{formatDate(restaurant.date)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer nav */}
            <footer style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "56px", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", borderTop: "1px solid rgba(184,146,42,0.2)", backgroundColor: "rgba(248,244,236,0.92)", backdropFilter: "blur(8px)" }}>
              <motion.button onClick={goPrev} disabled={currentIndex === 0} whileHover={currentIndex > 0 ? { x: -3 } : {}} style={{ display: "flex", alignItems: "center", gap: "8px", opacity: currentIndex === 0 ? 0.25 : 0.7, cursor: currentIndex === 0 ? "default" : "pointer", background: "none", border: "none" }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3 L5 8 L10 13" stroke="var(--ink)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <span style={{ fontFamily: SERIF_EN, fontSize: "13px", letterSpacing: "0.1em", color: "var(--ink)" }}>Prev</span>
              </motion.button>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {restaurants.map((_, i) => (
                  <motion.button
                    key={i}
                    onClick={() => {
                      if (i === currentIndex) return;
                      setDirection(i > currentIndex ? 1 : -1);
                      setImgLoaded(false); setImgIdx(0);
                      setCurrentIndex(i);
                    }}
                    whileHover={{ scale: 1.3 }}
                    style={{ borderRadius: "9999px", width: i === currentIndex ? "20px" : "6px", height: "6px", background: i === currentIndex ? "var(--gold)" : "rgba(184,146,42,0.3)", border: "none", cursor: "pointer", padding: 0, transition: "width 0.3s, background 0.3s" }}
                    aria-label={`${i + 1}件目`}
                  />
                ))}
              </div>

              <motion.button onClick={goNext} disabled={currentIndex === restaurants.length - 1} whileHover={currentIndex < restaurants.length - 1 ? { x: 3 } : {}} style={{ display: "flex", alignItems: "center", gap: "8px", opacity: currentIndex === restaurants.length - 1 ? 0.25 : 0.7, cursor: currentIndex === restaurants.length - 1 ? "default" : "pointer", background: "none", border: "none" }}>
                <span style={{ fontFamily: SERIF_EN, fontSize: "13px", letterSpacing: "0.1em", color: "var(--ink)" }}>Next</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3 L11 8 L6 13" stroke="var(--ink)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </motion.button>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════════════════════ FORM ════════════════════════ */}
      <AnimatePresence>
        {phase === "form" && (
          <motion.div
            key="form"
            variants={formVariants}
            initial="initial" animate="animate" exit="exit"
            style={{ position: "fixed", inset: 0, zIndex: 30, backgroundColor: "var(--cream)" }}
          >
            <div className="texture-overlay" />

            <Masthead
              left={
                <button
                  onClick={() => { setEditingId(null); setPhase(editingId !== null ? "article" : "index"); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink)", opacity: 0.45, fontSize: "22px", lineHeight: 1, padding: "2px 0", fontWeight: 300 }}
                  aria-label="閉じる"
                >×</button>
              }
              right={
                <span style={{ fontFamily: SERIF_EN, fontStyle: "italic", fontSize: "11px", letterSpacing: "0.15em", color: "var(--gold)", opacity: 0.7 }}>
                  {editingId !== null ? "Edit" : "New"}
                </span>
              }
            />

            <div style={{ position: "absolute", top: "52px", bottom: "72px", left: 0, right: 0, overflowY: "auto", padding: "32px 24px 16px", scrollbarWidth: "thin", scrollbarColor: "#d4c5a9 transparent" }}>
              <OrnamentRow />
              <div style={{ height: "28px" }} />

              <FormField label="店名" required>
                <input type="text" value={form.name} onChange={(e) => updateForm("name", e.target.value)} placeholder="例：割烹 三木屋" className="form-input" style={{ fontFamily: SERIF_JP }} />
              </FormField>

              <FormField label="英語名 / ローマ字">
                <input type="text" value={form.nameEn} onChange={(e) => updateForm("nameEn", e.target.value)} placeholder="例：Kappo Mikiya" className="form-input" style={{ fontFamily: SERIF_EN, fontStyle: "italic" }} />
              </FormField>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
                <FormField label="ジャンル">
                  <input type="text" value={form.category} onChange={(e) => updateForm("category", e.target.value)} placeholder="例：和食" className="form-input" style={{ fontFamily: SERIF_JP }} />
                </FormField>
                <FormField label="エリア">
                  <input type="text" value={form.location} onChange={(e) => updateForm("location", e.target.value)} placeholder="例：京都市東山区" className="form-input" style={{ fontFamily: SERIF_JP }} />
                </FormField>
              </div>

              <FormField label="評価">
                <StarPicker value={form.rating as number} onChange={(v) => updateForm("rating", v)} />
              </FormField>

              <FormField label="訪問日">
                <input type="date" value={form.date} onChange={(e) => updateForm("date", e.target.value)} className="form-input" style={{ fontFamily: SERIF_JP }} />
              </FormField>

              <FormField label="感想・レビュー">
                <textarea value={form.review} onChange={(e) => updateForm("review", e.target.value)} placeholder="食の記憶を、言葉に。" rows={10} className="form-input form-textarea" style={{ fontFamily: SERIF_JP, resize: "vertical", display: "block" }} />
              </FormField>

              <FormField label="キャッチコピー（縦書き）">
                <input type="text" value={form.tagline} onChange={(e) => updateForm("tagline", e.target.value)} placeholder="例：静寂の中の一献" className="form-input" style={{ fontFamily: SERIF_JP }} />
              </FormField>

              {/* Google Maps URL */}
              <FormField label="Google Maps リンク">
                <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
                  <input
                    type="text"
                    value={form.mapsUrl}
                    onChange={(e) => updateForm("mapsUrl", e.target.value)}
                    placeholder="https://maps.google.com/..."
                    className="form-input"
                    style={{ fontFamily: "monospace", fontSize: "12px", flex: 1 }}
                  />
                  <motion.button
                    type="button"
                    onClick={getGPS}
                    disabled={gpsLoading}
                    whileTap={{ scale: 0.95 }}
                    style={{ flexShrink: 0, padding: "8px 12px", border: "1px solid rgba(184,146,42,0.5)", background: "transparent", cursor: gpsLoading ? "default" : "pointer", fontFamily: SERIF_JP, fontSize: "12px", letterSpacing: "0.05em", color: "var(--ink)", opacity: gpsLoading ? 0.5 : 1, whiteSpace: "nowrap" }}
                    title="現在地のGPS座標をGoogle MapsリンクとしてURLへ自動入力"
                  >
                    {gpsLoading ? "取得中…" : "📍 現在地"}
                  </motion.button>
                </div>
              </FormField>

              {/* Website URL */}
              <FormField label="お店のウェブサイト">
                <input
                  type="text"
                  value={form.websiteUrl}
                  onChange={(e) => updateForm("websiteUrl", e.target.value)}
                  placeholder="https://..."
                  className="form-input"
                  style={{ fontFamily: "monospace", fontSize: "12px" }}
                />
              </FormField>

              {/* Images (multiple) */}
              <FormField label="写真（複数可）">
                <div>
                  {form.images.length > 0 && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginBottom: "12px" }}>
                      {form.images.map((src, i) => (
                        <div key={i} style={{ position: "relative", aspectRatio: "1", overflow: "hidden", border: "1px solid rgba(184,146,42,0.2)" }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={src} alt={`preview ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                          {i === 0 && (
                            <div style={{ position: "absolute", top: "4px", left: "4px", padding: "1px 5px", background: "rgba(184,146,42,0.85)" }}>
                              <span style={{ fontFamily: SERIF_EN, fontSize: "8px", color: "var(--cream)", letterSpacing: "0.1em" }}>MAIN</span>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => removeFormImage(i)}
                            style={{ position: "absolute", top: "4px", right: "4px", width: "20px", height: "20px", borderRadius: "9999px", background: "rgba(28,26,24,0.7)", border: "none", cursor: "pointer", color: "rgba(248,244,236,0.9)", fontSize: "13px", lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}
                            aria-label={`写真${i + 1}を削除`}
                          >×</button>
                        </div>
                      ))}
                    </div>
                  )}

                  <motion.button
                    type="button"
                    onClick={() => !compressing && fileInputRef.current?.click()}
                    whileTap={compressing ? {} : { scale: 0.97 }}
                    style={{ width: "100%", padding: "11px", border: "1px solid rgba(184,146,42,0.45)", background: "transparent", cursor: compressing ? "default" : "pointer", fontFamily: SERIF_JP, fontSize: "13px", letterSpacing: "0.12em", color: "var(--ink)", marginBottom: "10px", opacity: compressing ? 0.6 : 1, transition: "opacity 0.2s" }}
                  >
                    {compressing ? "⏳ \u00a0 圧縮・処理中..." : "📷 \u00a0 アルバム・カメラから選択（複数可）"}
                  </motion.button>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleFileChange} />

                  <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
                    <input
                      type="text"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addUrlImage())}
                      placeholder="または画像 URL を貼り付けて追加..."
                      className="form-input"
                      style={{ fontFamily: "monospace", fontSize: "12px", flex: 1 }}
                    />
                    <motion.button
                      type="button"
                      onClick={addUrlImage}
                      whileTap={{ scale: 0.95 }}
                      style={{ flexShrink: 0, padding: "8px 12px", border: "1px solid rgba(184,146,42,0.45)", background: "transparent", cursor: "pointer", fontFamily: SERIF_JP, fontSize: "12px", letterSpacing: "0.05em", color: "var(--ink)", opacity: urlInput.trim() ? 1 : 0.4 }}
                    >追加</motion.button>
                  </div>
                </div>
              </FormField>

              <div style={{ height: "8px" }} />
            </div>

            {/* Submit */}
            <footer style={{ position: "absolute", bottom: 0, left: 0, right: 0, borderTop: "1px solid rgba(184,146,42,0.2)", backgroundColor: "rgba(248,244,236,0.95)", backdropFilter: "blur(8px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "12px 24px", gap: "8px" }}>
              {saveError && (
                <div style={{ width: "100%", maxWidth: "360px", padding: "8px 12px", background: "rgba(180,30,30,0.08)", border: "1px solid rgba(180,30,30,0.35)", color: "#b01e1e", fontFamily: "monospace", fontSize: "11px", lineHeight: 1.5, wordBreak: "break-all" }}>
                  ⚠ {saveError}
                </div>
              )}
              <motion.button
                onClick={submitForm}
                disabled={!form.name.trim() || submitting}
                whileHover={form.name.trim() && !submitting ? { scale: 1.02 } : {}}
                whileTap={form.name.trim() && !submitting ? { scale: 0.97 } : {}}
                style={{ width: "100%", maxWidth: "360px", padding: "15px", background: form.name.trim() && !submitting ? "var(--ink)" : "rgba(28,26,24,0.18)", color: "var(--cream)", border: "none", cursor: form.name.trim() && !submitting ? "pointer" : "default", fontFamily: SERIF_JP, fontSize: "14px", letterSpacing: "0.25em", fontWeight: 500, transition: "background 0.25s" }}
              >
                {submitting ? "保 存 中 …" : editingId !== null ? "変 更 を 保 存" : "記 録 す る"}
              </motion.button>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
