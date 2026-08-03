import { getVisual } from "@/lib/visuals/visual-registry";

type Props = {
  visualId: string;
};

// Rend un asset approuvé du registre. L'alt vient du registre (obligatoire), jamais
// du contenu. Non résolvable / non approuvé → null (les gates l'ont déjà bloqué au build).
export function ContentVisual({ visualId }: Props) {
  const visual = getVisual(visualId);
  if (!visual || visual.status !== "approved") return null;

  return (
    <figure className="content-visual" data-visual-id={visual.id}>
      {/* SVG statique servi depuis /public ; next/image volontairement évité
          (output: export, pas de sharp). Alt du registre = source unique. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={visual.src} alt={visual.alt} />
      <figcaption>{visual.caption}</figcaption>
    </figure>
  );
}

export default ContentVisual;
