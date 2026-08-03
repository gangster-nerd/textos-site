// Registre FERMÉ des clusters de contenu (taxonomie), validé par Zod au chargement.
// Chaque contenu déclare un `clusterId` vérifié contre ce registre par les gates.

import { z } from "zod";

export const CLUSTER_IDS = [
  "measurement-trust",
  "measurement-methodology",
  "product-engineering",
] as const;

export type ClusterId = (typeof CLUSTER_IDS)[number];
export type ClusterStatus = "active" | "retired";

export const ContentClusterSchema = z
  .object({
    id: z.enum(CLUSTER_IDS),
    label: z.string().trim().min(1),
    status: z.enum(["active", "retired"]),
  })
  .strict();

export type ContentCluster = z.infer<typeof ContentClusterSchema>;

export const ContentClusterRegistrySchema = z.record(
  z.enum(CLUSTER_IDS),
  ContentClusterSchema
);

const RAW_CONTENT_CLUSTERS = {
  "measurement-trust": {
    id: "measurement-trust",
    label: "Measurement trust",
    status: "active",
  },
  "measurement-methodology": {
    id: "measurement-methodology",
    label: "Measurement methodology",
    status: "active",
  },
  "product-engineering": {
    id: "product-engineering",
    label: "Product engineering",
    status: "active",
  },
} satisfies Record<ClusterId, unknown>;

/** Registre validé. Une malformation échoue ICI, au chargement — donc au build. */
export const CONTENT_CLUSTERS = ContentClusterRegistrySchema.parse(
  RAW_CONTENT_CLUSTERS
) as Record<ClusterId, ContentCluster>;

export function getCluster(id: string): ContentCluster | undefined {
  return CONTENT_CLUSTERS[id as ClusterId];
}
