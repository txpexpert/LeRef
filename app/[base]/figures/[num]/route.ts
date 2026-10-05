// Image d'un logigramme. Servie uniquement par le serveur, après contrôle :
// abonné au guide, ou logigramme inséré dans un paragraphe en accès libre.
import { getBase, getImageFigure, getParagraphe } from "@/lib/contenu";
import { imageLocale, modeLocal } from "@/lib/local";
import { accesGuide } from "@/lib/session";

export const dynamic = "force-dynamic";

const PRIVE = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow, noarchive, noimageindex",
  "Content-Disposition": "inline",
};

export async function GET(_req: Request, { params }: { params: { base: string; num: string } }) {
  const num = Number(params.num);
  if (!Number.isInteger(num) || num < 1) return new Response(null, { status: 404 });
  const base = await getBase(params.base);
  if (!base) return new Response(null, { status: 404 });
  if (modeLocal()) {
    const img = imageLocale(base.slug, num);
    return img ? new Response(new Uint8Array(img.data), { headers: { ...PRIVE, "Content-Type": img.mime } }) : new Response(null, { status: 404 });
  }
  const figure = await getImageFigure(base.slug, num);
  if (!figure) return new Response(null, { status: 404 });

  const acces = await accesGuide(base.slug);
  if (!acces.ok) {
    const para = await getParagraphe(base.slug, figure.paragraphe);
    if (!para?.gratuit) return new Response(null, { status: 403, headers: PRIVE });
  }
  return new Response(Buffer.from(figure.image, "base64"), { headers: { ...PRIVE, "Content-Type": figure.mime } });
}
