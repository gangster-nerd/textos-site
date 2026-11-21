import { describe, expect, test } from "vitest";
import { assessDelivery, deliveryEnvironment, type ModeReceipt } from "../scripts/delivery-certification";

const source = { sha: "a".repeat(40), tree: "b".repeat(40) };
function receipt(mode: "editorial" | "production", conversion: "off" | "demo"): ModeReceipt {
  return { ...source, mode, conversion, workspace: `/isolated/${mode}-${conversion}`, fresh: true,
    environment: { vercelEnv: mode === "production" ? "production" : "preview", preview: mode === "editorial" },
    steps: ["install", mode === "production" ? "verify:production" : "verify:a3r", "source-integrity"].map(name => ({ name, exit: 0 })) };
}
const all = () => [receipt("editorial", "off"), receipt("production", "off"), receipt("editorial", "demo"), receipt("production", "demo")];

describe("delivery is cumulative, source-pinned and isolated", () => {
  test("DECISIVE: all-green editorial certifications alone are REFUSED", () => {
    const editorial = [receipt("editorial", "off"), receipt("editorial", "demo")];
    expect(editorial.every(r => r.steps.every(s => s.exit === 0))).toBe(true);
    const result = assessDelivery(source, ["off", "demo"], editorial);
    expect(result.result).toBe("fail");
    expect(result.failures).toContain("missing_or_duplicate:production:off");
    expect(result.failures).toContain("missing_or_duplicate:production:demo");
  });
  test("both modes, both conversions, same source and distinct fresh builds pass", () => {
    expect(assessDelivery(source, ["off", "demo"], all()).result).toBe("pass");
  });
  test("a failed Production step cannot be compensated by editorial success", () => {
    const runs = all(); runs[1].steps[1].exit = 1;
    expect(assessDelivery(source, ["off", "demo"], runs).result).toBe("fail");
  });
  test.each(["sha", "tree"] as const)("a different %s is refused", key => {
    const runs = all(); runs[1][key] = "c".repeat(40);
    expect(assessDelivery(source, ["off", "demo"], runs).result).toBe("fail");
  });
  test("reused workspace is refused", () => {
    const runs = all(); runs[1].workspace = runs[0].workspace;
    expect(assessDelivery(source, ["off", "demo"], runs).result).toBe("fail");
  });
  test("stale output is refused", () => {
    const runs = all(); runs[1].fresh = false;
    expect(assessDelivery(source, ["off", "demo"], runs).result).toBe("fail");
  });
  test("preview posing as Production is refused", () => {
    const runs = all(); runs[1].environment = runs[0].environment;
    expect(assessDelivery(source, ["off", "demo"], runs).result).toBe("fail");
  });
  test("duplicate or missing profiles are refused", () => {
    expect(assessDelivery(source, ["off", "demo"], all().slice(1)).result).toBe("fail");
    expect(assessDelivery(source, ["off", "demo"], [...all(), receipt("production", "off")]).result).toBe("fail");
  });
  test("missing source integrity proof is refused", () => {
    const runs = all(); runs[1].steps.pop();
    expect(assessDelivery(source, ["off", "demo"], runs).result).toBe("fail");
  });
  test("no profiles cannot yield vacuous PASS", () => {
    expect(assessDelivery(source, [], []).result).toBe("fail");
  });
  test("Production deletes an inherited preview authorisation", () => {
    const env: NodeJS.ProcessEnv = { NODE_ENV: "test", VERCEL_ENV: "preview", CONTENT_PREVIEW_MODE: "true" };
    const actual = deliveryEnvironment(env, "production", "off");
    expect(actual.VERCEL_ENV).toBe("production");
    expect(actual.NODE_ENV).toBe("production");
    expect(actual).not.toHaveProperty("CONTENT_PREVIEW_MODE");
    expect(env.CONTENT_PREVIEW_MODE).toBe("true");
  });
});
