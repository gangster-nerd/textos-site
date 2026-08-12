import { productProofExample as proof } from "@/lib/product-proof/example";
import { ProductProofObservations } from "./ProductProofObservations";
import { ProductProofEvidence } from "./ProductProofEvidence";

/**
 * PRODUCT PROOF — de quoi une mesure est faite.
 *
 * Le panneau Authority Presence répond à « qu'est-ce que ça mesure ? ». Celui-ci répond à une autre
 * question, et à elle seule : « qu'y a-t-il DERRIÈRE ce nombre ? ». Les deux surfaces sont
 * complémentaires — aucune ne réexplique l'union, le non-observable ni le panel versionné, qui
 * appartiennent au premier panneau et à la méthodologie.
 *
 * APP-SHAPED, PAS APP-FAKE. La structure — observations, evidence, provenance — est celle de l'UI
 * réelle du produit (textos-v0 @ designSnapshotSha). Les valeurs sont inventées et la surface le
 * dit deux fois : par l'étiquette en tête, par la note en pied. Aucun compte, aucun run exécuté,
 * aucun provider appelé, aucune donnée client.
 *
 * L'existence de ces écrans dans le produit n'ajoute AUCUNE capacité publique : cette surface
 * reprend une grammaire documentaire, elle ne déclare rien. Le manifeste de capacités épinglé reste
 * la seule autorité sur ce que le site a le droit d'affirmer.
 */
export function ProductProof() {
  const observation = proof.observations.find((o) => o.ref === proof.evidence.observationRef);

  // La fixture garantit ce rattachement par invariant ; le garde reste, car un composant ne doit
  // jamais rendre une Evidence orpheline si la fixture change un jour.
  if (!observation) return null;

  return (
    <figure className="panel proof" aria-labelledby="product-proof-title">
      <div className="panel__head">
        <h3 className="panel__title" id="product-proof-title">
          Inside one measurement
        </h3>
        <span className="panel__badge">Illustrative</span>
      </div>

      <div className="panel__body">
        <p className="proof__lede">
          A measurement is a set of observations. Each observation keeps the answer that was
          captured, the sources that answer cited, and the exact instrument that produced it.
        </p>
      </div>

      <ProductProofObservations
        observations={proof.observations}
        evidenceRef={proof.evidence.observationRef}
      />

      <div className="panel__body proof__evidence">
        <ProductProofEvidence observation={observation} evidence={proof.evidence} />
      </div>

      <figcaption className="panel__note">
        <strong>Illustrative observation</strong> using TextOS&rsquo;s production evidence
        structure. The structure comes from the product; the values do not. Nothing here is a run
        that was executed or a brand that was measured.{" "}
        <span className="muted">
          Read the two middle rows together: an answer that cites nothing is counted as zero
          citations, while an answer that was never produced has nothing to count &mdash; it is not
          a zero.
        </span>
      </figcaption>
    </figure>
  );
}
