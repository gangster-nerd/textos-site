/**
 * Step `prepare --article <id>` — turns a textos-site editorial brief (`textos/briefs/<id>.json`)
 * into a TextOS CTC intake, hands it to TextOS's own CTC adapter and exports every slot prompt
 * TextOS would send to a writer. Ported from shortsos-site scripts/textos/steps/prepare.ts.
 *
 *  1. Evidence is built from the brief, never typed freehand: every excerpt must be a VERBATIM
 *     quote (whitespace-normalized) of a textos-v0 commit message, a textos-v0 file at the product
 *     pin, or a field of the pinned product manifest. Here the product IS the pinned TextOS
 *     checkout: the product pin and the writer pin are the same SHA (`textos/tool.json`), and every
 *     cited commit must be in its history (`git merge-base --is-ancestor`). `content:commits` then
 *     records the cited commits in the ledger the site checks.
 *  2. Approval goes through TextOS's own `approveEvidenceForUse`, with its invariant checks. Who
 *     decided is taken from the brief and recorded as-is. No public-use clearance is applied: no
 *     human has cleared commit-derived facts for public_web yet.
 *  3. `adaptCtcIntakeToExecutionPlan` (TextOS) builds and validates the plan and its hashes.
 *  4. For each slot, `resolveSlotEvidence` + `buildSlotPrompt` (TextOS) produce the exact prompt;
 *     it is written under `textos/runs/<id>/prompts/` (git-ignored). `write` refuses any response
 *     written against a prompt that no longer matches.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { join } from "node:path";

import { TEXTOS_DIR, SITE_ROOT, TEXTOS_REF, TEXTOS_ROOT, argValue, loadTextos, readJson, sha256, writeJson, writeText } from "./lib";
import type { EvidenceApprovalDecision } from "./lib";
import type {
  ApprovedEvidenceItem,
  ClaimProfile,
  CtcGeoWriterIntake,
  CtcGeoWriterProvenance,
  GeoWriterSlot,
  MentionedEntity,
  GenerationPolicy,
} from "./textos-contracts";
import { promptFileName, type ArticleBrief, type BriefEvidence } from "../../../lib/textos-client/brief";

const normalizeWs = (s: string) => s.replace(/\s+/g, " ").trim();
const PRODUCT_PUBLISHER = "TextOS product repository (gangster-nerd/textos-v0), V1 certification trunk";

interface ProductCommit {
  sha: string;
  date: string;
  subject: string;
}

/** A cited product commit, read from the product checkout. Briefs cite full SHAs, and only commits
 *  in the history of the product pin: anything else is refused. */
function productCommit(productRef: string, cited: string): ProductCommit {
  if (!/^[0-9a-f]{40}$/.test(cited)) throw new Error(`prepare: briefs cite full 40-hex SHAs (got ${cited}).`);
  const ancestry = spawnSync("git", ["-C", TEXTOS_ROOT, "merge-base", "--is-ancestor", cited, productRef], { encoding: "utf8" });
  if (ancestry.status !== 0) throw new Error(`prepare: ${cited} is not in the history of the product pin ${productRef}.`);
  const [sha, date, subject] = execFileSync("git", ["-C", TEXTOS_ROOT, "log", "-1", "--format=%H%x1f%aI%x1f%s", cited], { encoding: "utf8" })
    .trim()
    .split("\x1f");
  if (sha !== cited || !date || subject === undefined) throw new Error(`prepare: could not read commit ${cited}.`);
  return { sha, date, subject };
}

interface ManifestEntity {
  id: string;
  prohibitedClaims: string[];
  knownLimits: string[];
}

async function main(): Promise<void> {
  const articleId = argValue("--article");
  if (!articleId) throw new Error("prepare: --article <id> is required.");

  const brief = readJson<ArticleBrief>(join(TEXTOS_DIR, "briefs", `${articleId}.json`));
  if (brief.articleId !== articleId) throw new Error(`prepare: brief file ${articleId}.json declares articleId ${brief.articleId}.`);

  const tool = readJson<{ writer: { sha: string }; product: { sha: string } }>(join(TEXTOS_DIR, "tool.json"));
  const productRef = tool.product.sha;
  if (productRef !== TEXTOS_REF || tool.writer.sha !== TEXTOS_REF) {
    throw new Error(`prepare: textos/tool.json pins writer ${tool.writer.sha} and product ${productRef}; the checkout is at ${TEXTOS_REF}. Both pins must be this SHA.`);
  }
  if (execFileSync("git", ["-C", TEXTOS_ROOT, "rev-parse", "--is-shallow-repository"], { encoding: "utf8" }).trim() !== "false") {
    throw new Error("prepare: the TextOS checkout is shallow; a truncated history would make real commits look unreachable.");
  }
  const tip = productCommit(productRef, productRef);
  const manifest = readJson<{ entities: ManifestEntity[] }>(join(SITE_ROOT, "product-manifest", "textos-v0.capability-manifest.json"));
  for (const id of brief.entityIds) {
    if (!manifest.entities.some((e) => e.id === id)) throw new Error(`prepare: entity ${id} is not in the pinned product manifest.`);
  }

  const client = readJson<{ generationPolicy: GenerationPolicy; roster: MentionedEntity[] }>(
    join(TEXTOS_DIR, "client", "client-profile.json"),
  );
  const claimProfile = readJson<ClaimProfile>(join(TEXTOS_DIR, "client", "claim-profile.json"));

  // ── 1. Evidence, verbatim from its source ──────────────────────────────────────────────────
  const rawEvidence: ApprovedEvidenceItem[] = brief.evidence.map((ev: BriefEvidence) => {
    const quote = normalizeWs(ev.source.quote);
    let sourceTitle: string;
    let retrievedAt: string;
    if (ev.source.kind === "product_commit") {
      const commit = productCommit(productRef, ev.source.sha);
      const body = normalizeWs(execFileSync("git", ["-C", TEXTOS_ROOT, "show", "-s", "--format=%B", commit.sha], { encoding: "utf8" }));
      if (!body.includes(quote)) {
        throw new Error(`prepare: ${ev.id} quote is not verbatim in the message of ${commit.sha}:\n  «${quote}»`);
      }
      sourceTitle = `TextOS product commit ${commit.sha.slice(0, 7)}: ${commit.subject}`;
      retrievedAt = commit.date;
    } else if (ev.source.kind === "product_file") {
      const content = normalizeWs(execFileSync("git", ["-C", TEXTOS_ROOT, "show", `${productRef}:${ev.source.path}`], { encoding: "utf8" }));
      if (!content.includes(quote)) {
        throw new Error(`prepare: ${ev.id} quote is not verbatim in ${ev.source.path} at ${productRef}:\n  «${quote}»`);
      }
      sourceTitle = `TextOS product repository file ${ev.source.path} at ${productRef.slice(0, 7)}`;
      retrievedAt = tip.date;
    } else {
      const src = ev.source;
      const entity = manifest.entities.find((e) => e.id === src.entityId);
      if (!entity) throw new Error(`prepare: ${ev.id} names unknown manifest entity ${src.entityId}.`);
      const values = entity[src.field].map(normalizeWs);
      if (!values.some((v) => v.includes(quote))) {
        throw new Error(`prepare: ${ev.id} quote is not verbatim in ${entity.id}.${src.field}:\n  «${quote}»`);
      }
      sourceTitle = `TextOS product manifest, ${entity.id}.${src.field}`;
      retrievedAt = tip.date;
    }
    return {
      id: ev.id,
      kind: "official_brand_evidence",
      sourceUrl: null,
      sourceTitle,
      sourcePublisher: PRODUCT_PUBLISHER,
      retrievedAt,
      contentHash: sha256(quote),
      excerpt: quote,
      subject: { kind: "tracked_brand", name: "TextOS" },
      claimTypes: ev.claimTypes,
      maxSupportStrength: ev.maxSupportStrength,
      limitations: ev.limitations,
      epistemicStatus: "operator_supplied",
      publicUse: "pending",
      approvedForGeneration: false,
      approvedBy: null,
      approvedAt: null,
      approvalScope: { briefIds: [], locale: brief.locale, channel: "internal_demo" },
    };
  });

  // ── 2. Approval — TextOS's own transition ────────────────────────────────────────────────────
  const textos = await loadTextos();
  const approvalDecision: EvidenceApprovalDecision = {
    briefIds: [brief.articleId],
    locale: brief.locale,
    channel: brief.publicationChannel,
    approvedBy: brief.approval.approvedBy,
    approvedAt: brief.approval.approvedAt,
  };
  const evidence = rawEvidence.map((item) => {
    const approved = textos.approveEvidenceForUse(item, approvalDecision);
    if (!approved.approved) throw new Error(`prepare: TextOS refused approval of ${item.id}: ${approved.reason}`);
    const violations = textos.approvalInvariantViolations(item, approved.item);
    if (violations.length > 0) throw new Error(`prepare: approval invariants broken for ${item.id}: ${violations.join("; ")}`);
    return approved.item;
  });

  const publicationContext = { channel: brief.publicationChannel, briefId: brief.articleId, locale: brief.locale } as CtcGeoWriterIntake["publicationContext"];
  const usability = evidence.map((item) => ({ evidenceId: item.id, ...textos.evaluateEvidenceUsability(item, publicationContext) }));
  const unusable = usability.filter((u) => !u.usable);
  if (unusable.length > 0) {
    throw new Error(`prepare: evidence not usable on ${brief.publicationChannel}: ${unusable.map((u) => `${u.evidenceId} (${u.reason})`).join("; ")}`);
  }

  // ── 3. Intake → TextOS CTC adapter ────────────────────────────────────────────────────────────
  const provenance: CtcGeoWriterProvenance = { ...brief.provenance, canonicalProductSha: productRef };
  for (const group of provenance.ctcSourceGroups) {
    for (const sha of group.sourceCommits) productCommit(productRef, sha);
  }
  const intake: CtcGeoWriterIntake = {
    provenance,
    locale: brief.locale,
    policy: client.generationPolicy,
    publicationContext,
    claimProfile,
    roster: client.roster,
    evidence,
    slots: brief.slots,
  };
  const adapted = textos.adaptCtcIntakeToExecutionPlan(intake);

  const runDir = join(TEXTOS_DIR, "runs", brief.articleId);
  writeJson(join(runDir, "intake.json"), intake);
  writeJson(join(runDir, "evidence-usability.json"), usability);

  // ── 4. Slot prompts, exactly as TextOS renders them ──────────────────────────────────────────
  const promptHashes: Record<string, string> = {};
  for (const slot of adapted.plan.slots as GeoWriterSlot[]) {
    const { usable } = textos.resolveSlotEvidence(adapted.plan, slot);
    const prompt = textos.buildSlotPrompt({
      planId: adapted.plan.planId,
      locale: adapted.plan.locale,
      targetQuery: adapted.plan.targetQuery,
      slot,
      usableEvidence: usable,
    });
    const hash = sha256(`${prompt.system}\n\n${prompt.user}`);
    promptHashes[slot.id] = hash;
    writeText(
      join(runDir, "prompts", promptFileName(slot.id)),
      `<!-- prompt sha256: ${hash} — rendered by TextOS buildSlotPrompt at ${TEXTOS_REF} -->\n\n` +
        `## system\n\n${prompt.system}\n\n## user\n\n${prompt.user}\n`,
    );
  }
  writeJson(join(runDir, "adapt.json"), {
    textosRef: TEXTOS_REF,
    adapterMethodVersion: adapted.adapterMethodVersion,
    planId: adapted.plan.planId,
    executionPlanHash: adapted.executionPlanHash,
    ctcHandoffHash: adapted.ctcHandoffHash,
    promptHashes,
  });

  console.log(`prepare: ${brief.articleId} ready.`);
  console.log(`  channel:           ${brief.publicationChannel}`);
  console.log(`  evidence:          ${evidence.length}`);
  console.log(`  executionPlanHash: ${adapted.executionPlanHash}`);
  console.log(`  slots:             ${adapted.plan.slots.map((s) => s.id).join(", ")}`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
