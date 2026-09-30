/**
 * ChangeGuard — comparability checks between two reports.
 * Pure, client-safe logic. Never interprets health; only checks whether two
 * reported values can be fairly compared and computes the numerical change.
 */
import { findKnowledge } from "@/lib/test-knowledge";

export type CGStatus =
  | "COMPARABLE"
  | "UNIT_DIFFERENCE"
  | "REFERENCE_RANGE_CHANGED"
  | "TEST_MISMATCH"
  | "REQUIRES_VERIFICATION"
  | "DATA_UNAVAILABLE";

export type CGTest = {
  id: string;
  test_name: string;
  original_test_name: string | null;
  value: string | null;
  unit: string | null;
  reference_range: string | null;
  confidence: number | null;
  source_text: string | null;
  verified: boolean;
};

export type CGReportMeta = { id: string; filename: string; date: string };

export type CGResult = {
  key: string;
  test_name: string;
  previous: CGTest | null;
  current: CGTest | null;
  match: "exact" | "possible" | "confirmed" | "none";
  status: CGStatus;
  previous_value: number | null;
  current_value: number | null;
  change: number | null;
  percentage_change: number | null;
  changed: boolean;
};

export type CGComparison = {
  comparison_id: string;
  previous: CGReportMeta;
  current: CGReportMeta;
  summary: {
    total_tests: number;
    comparable: number;
    changed: number;
    requires_verification: number;
    not_comparable: number;
  };
  results: CGResult[];
};

const LOW_CONFIDENCE = 0.7;

export function numericValue(value: string | null) {
  if (!value) return null;
  const m = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
export const normUnit = (u: string | null) =>
  (u ?? "").toLowerCase().replace(/\s+/g, "").replace(/[µμ]/g, "u").replace(/mcg/g, "ug");
export const normRange = (r: string | null) =>
  (r ?? "").toLowerCase().replace(/\s+/g, "").replace(/[–—]/g, "-").replace(/to/g, "-");

/** Words that hint two differently named tests *might* be the same measurement. */
const HINT_GROUPS = [["glucose", "sugar", "fbs", "rbs", "ppbs"], ["hb", "hemoglobin", "haemoglobin"]];
const STOP = new Set(["serum", "blood", "total", "test", "level", "plasma", "count", "fasting", "random"]);

function isPossibleMatch(a: string, b: string) {
  const wa = norm(a).split(" "), wb = norm(b).split(" ");
  if (wa.some((w) => !STOP.has(w) && w.length > 2 && wb.includes(w))) return true;
  return HINT_GROUPS.some((g) => wa.some((w) => g.includes(w)) && wb.some((w) => g.includes(w)));
}

function sameTest(a: string, b: string) {
  if (norm(a) === norm(b)) return true;
  const ka = findKnowledge(a), kb = findKnowledge(b);
  return Boolean(ka && kb && ka.id === kb.id);
}

function evaluate(prev: CGTest | null, curr: CGTest | null, match: CGResult["match"]): Omit<CGResult, "key" | "test_name" | "previous" | "current" | "match"> {
  const pv = numericValue(prev?.value ?? null);
  const cv = numericValue(curr?.value ?? null);
  const base = { previous_value: pv, current_value: cv, change: null, percentage_change: null, changed: false };
  if (match === "possible") return { ...base, status: "TEST_MISMATCH" };
  if (!prev || !curr || pv === null || cv === null) return { ...base, status: "DATA_UNAVAILABLE" };
  const lowConf = (t: CGTest) => !t.verified || (t.confidence !== null && t.confidence < LOW_CONFIDENCE);
  if (lowConf(prev) || lowConf(curr)) return { ...base, status: "REQUIRES_VERIFICATION" };
  if (normUnit(prev.unit) !== normUnit(curr.unit)) return { ...base, status: "UNIT_DIFFERENCE" };
  const change = Number((cv - pv).toFixed(4));
  const pct = pv !== 0 ? Number((((cv - pv) / pv) * 100).toFixed(2)) : null;
  const computed = { ...base, change, percentage_change: pct, changed: change !== 0 };
  if (normRange(prev.reference_range) !== normRange(curr.reference_range))
    return { ...computed, percentage_change: null, status: "REFERENCE_RANGE_CHANGED" };
  return { ...computed, status: "COMPARABLE" };
}

/**
 * Service abstraction. Runs locally today; can be swapped for a server/API call
 * (POST /api/changeguard/compare) returning the same CGComparison shape.
 */
export function compareReports(
  previous: CGReportMeta,
  current: CGReportMeta,
  prevTests: CGTest[],
  currTests: CGTest[],
  confirmedMatches: Set<string> = new Set(),
): CGComparison {
  const results: CGResult[] = [];
  const usedPrev = new Set<string>();

  for (const c of currTests) {
    let p = prevTests.find((t) => !usedPrev.has(t.id) && sameTest(t.test_name, c.test_name));
    let match: CGResult["match"] = p ? "exact" : "none";
    if (!p) {
      p = prevTests.find((t) => !usedPrev.has(t.id) && isPossibleMatch(t.test_name, c.test_name));
      if (p) match = confirmedMatches.has(`${p.id}:${c.id}`) ? "confirmed" : "possible";
    }
    if (p) usedPrev.add(p.id);
    results.push({ key: `${p?.id ?? "none"}:${c.id}`, test_name: c.test_name, previous: p ?? null, current: c, match, ...evaluate(p ?? null, c, match) });
  }
  for (const p of prevTests) {
    if (usedPrev.has(p.id)) continue;
    results.push({ key: `${p.id}:none`, test_name: p.test_name, previous: p, current: null, match: "none", ...evaluate(p, null, "none") });
  }

  const summary = {
    total_tests: results.length,
    comparable: results.filter((r) => r.status === "COMPARABLE").length,
    changed: results.filter((r) => r.status === "COMPARABLE" && r.changed).length,
    requires_verification: results.filter((r) => r.status === "REQUIRES_VERIFICATION" || r.status === "TEST_MISMATCH").length,
    not_comparable: results.filter((r) => ["UNIT_DIFFERENCE", "REFERENCE_RANGE_CHANGED", "DATA_UNAVAILABLE"].includes(r.status)).length,
  };
  return { comparison_id: `${previous.id}:${current.id}`, previous, current, summary, results };
}
