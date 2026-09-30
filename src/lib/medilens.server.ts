/**
 * Server-only MediLens logic: reference-range engine, AI extraction,
 * AI explanations and the safety guardrail.
 *
 * Nothing here may be imported from client code.
 */

const GATEWAY = "https://ai.gateway.lovable.dev/v1/responses";
const MODEL = "openai/gpt-6-astra";

export type TestStatus =
  | "within_reported_range"
  | "below_reported_range"
  | "above_reported_range"
  | "needs_verification"
  | "unknown";

export type ExtractedTest = {
  test_name: string;
  original_test_name: string;
  value: string;
  unit: string;
  reference_range: string;
  confidence: number;
  source_text: string;
};

export type ExtractionResult = {
  report_date: string | null;
  lab_name: string | null;
  raw_text: string;
  tests: ExtractedTest[];
};

/* ---------------------------------------------------------------- ranges */

const DASHES = /[–—−~]/g;

/**
 * Parses only the range printed on the report. Never invents a range.
 */
export function parseRange(
  reference: string | null | undefined,
): { min: number | null; max: number | null } | null {
  if (!reference) return null;
  const cleaned = reference.replace(DASHES, "-").replace(/,/g, "").trim();
  if (!cleaned) return null;

  const between = cleaned.match(/(-?\d+(?:\.\d+)?)\s*(?:to|-)\s*(-?\d+(?:\.\d+)?)/i);
  if (between) {
    const min = Number(between[1]);
    const max = Number(between[2]);
    if (Number.isFinite(min) && Number.isFinite(max)) return { min, max };
  }

  const upper = cleaned.match(/(?:<=?|less than|up to|upto|below)\s*(-?\d+(?:\.\d+)?)/i);
  if (upper) {
    const max = Number(upper[1]);
    if (Number.isFinite(max)) return { min: null, max };
  }

  const lower = cleaned.match(/(?:>=?|greater than|more than|above|at least)\s*(-?\d+(?:\.\d+)?)/i);
  if (lower) {
    const min = Number(lower[1]);
    if (Number.isFinite(min)) return { min, max: null };
  }

  return null;
}

export function parseValue(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const num = Number(match[0]);
  return Number.isFinite(num) ? num : null;
}

export function computeStatus(
  value: string | null | undefined,
  reference: string | null | undefined,
): TestStatus {
  const range = parseRange(reference);
  const num = parseValue(value);
  if (range === null || num === null) return "unknown";
  if (range.min !== null && num < range.min) return "below_reported_range";
  if (range.max !== null && num > range.max) return "above_reported_range";
  return "within_reported_range";
}

/* ------------------------------------------------------------- guardrail */

const PROHIBITED = [
  /\byou (?:have|are suffering from|are diagnosed)\b/i,
  /\bdiagnos(?:is|ed|e) (?:is|of)\b/i,
  /\byou should (?:take|start|stop)\b/i,
  /\b(?:take|start|stop|increase|reduce) (?:your )?(?:medication|medicine|tablets?|dose|dosage)\b/i,
  /\b\d+\s?(?:mg|mcg|iu|ml)\b/i,
  /\bprescrib/i,
  /\bdefinitely (?:have|means)\b/i,
];

/**
 * Removes any sentence that diagnoses, prescribes or claims certainty.
 */
export function sanitizeMedicalText(text: string | null | undefined): string {
  if (!text) return "";
  const sentences = text.split(/(?<=[.!?।])\s+/);
  const safe = sentences.filter((s) => !PROHIBITED.some((p) => p.test(s)));
  return safe.join(" ").trim();
}

/* --------------------------------------------------------------- ai call */

type InputBlock =
  | { type: "input_text"; text: string }
  | { type: "input_image"; image_url: string }
  | { type: "input_file"; filename: string; file_data: string };

/**
 * Single streamed call to the Lovable AI Gateway Responses endpoint.
 * The stream is consumed server-side and the accumulated text returned.
 */
async function callGateway(content: InputBlock[]): Promise<string> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured for this project.");

  const response = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: MODEL,
      input: [{ role: "user", content }],
      reasoning: { effort: "low" },
      store: false,
      stream: true,
    }),
  });

  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => "");
    console.error("AI gateway error", response.status, detail.slice(0, 500));
    if (response.status === 429) throw new Error("AI is busy right now. Please try again in a moment.");
    if (response.status === 402 || response.status === 403) {
      throw new Error("AI is unavailable for this workspace right now.");
    }
    throw new Error("AI request failed.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      for (const line of frame.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const event = JSON.parse(payload) as { type?: string; delta?: string };
          if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
            text += event.delta;
          }
        } catch {
          /* ignore partial or non-JSON frames */
        }
      }
    }
  }

  return text;
}


function parseJsonBlock<T>(raw: string): T | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced?.[1] ?? raw).trim();
  const start = candidate.search(/[[{]/);
  if (start === -1) return null;
  const end = Math.max(candidate.lastIndexOf("]"), candidate.lastIndexOf("}"));
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------ extraction */

const EXTRACTION_PROMPT = `You read laboratory/medical reports and transcribe them EXACTLY.

Return ONLY JSON of this shape:
{
  "report_date": "YYYY-MM-DD or null",
  "lab_name": "string or null",
  "raw_text": "all text you can read from the document",
  "tests": [
    {
      "test_name": "canonical English test name",
      "original_test_name": "exactly as printed",
      "value": "number exactly as printed",
      "unit": "exactly as printed, empty string if absent",
      "reference_range": "exactly as printed, empty string if the report does not print one",
      "confidence": 0.0,
      "source_text": "the full line from the report this row came from"
    }
  ]
}

Absolute rules:
- Transcribe numbers, units, ranges and dates verbatim. Never convert or round.
- NEVER invent a reference range. If the report does not print one, use "".
- Do not interpret, diagnose or comment. Transcription only.
- confidence is your own 0-1 certainty that the row was read correctly.
- If the document is not a medical/lab report, return {"report_date":null,"lab_name":null,"raw_text":"","tests":[]}.`;

export async function extractFromDocument(
  dataUrl: string,
  mimeType: string,
): Promise<ExtractionResult> {
  const content: InputBlock[] = mimeType === "application/pdf"
    ? [
        { type: "input_text", text: EXTRACTION_PROMPT },
        { type: "input_file", filename: "report.pdf", file_data: dataUrl },
      ]
    : [
        { type: "input_text", text: EXTRACTION_PROMPT },
        { type: "input_image", image_url: dataUrl },
      ];

  const raw = await callGateway(content);

  const parsed = parseJsonBlock<{
    report_date?: string | null;
    lab_name?: string | null;
    raw_text?: string;
    tests?: Partial<ExtractedTest>[];
  }>(raw);

  if (!parsed) throw new Error("Could not read this document.");

  const tests: ExtractedTest[] = (parsed.tests ?? [])
    .filter((t) => typeof t.test_name === "string" && t.test_name.trim() !== "")
    .map((t) => ({
      test_name: String(t.test_name).trim(),
      original_test_name: String(t.original_test_name ?? t.test_name).trim(),
      value: String(t.value ?? "").trim(),
      unit: String(t.unit ?? "").trim(),
      reference_range: String(t.reference_range ?? "").trim(),
      confidence: typeof t.confidence === "number" ? Math.min(Math.max(t.confidence, 0), 1) : 0.6,
      source_text: String(t.source_text ?? "").trim(),
    }));

  const dateOk = typeof parsed.report_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.report_date);

  return {
    report_date: dateOk ? (parsed.report_date as string) : null,
    lab_name: parsed.lab_name ? String(parsed.lab_name).slice(0, 200) : null,
    raw_text: String(parsed.raw_text ?? "").slice(0, 20000),
    tests,
  };
}

/* ---------------------------------------------------------- explanations */

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  ta: "Tamil",
  hi: "Hindi",
};

export type GeneratedExplanation = {
  test_name: string;
  summary: string;
  what_is_this_test: string;
  why_highlighted: string;
  general_context: string;
  possible_significance: string;
  common_factors: string;
};

export async function generateExplanations(
  tests: {
    test_name: string;
    value: string | null;
    unit: string | null;
    reference_range: string | null;
    status: string;
  }[],
  language: string,
  level: "simple" | "standard",
): Promise<GeneratedExplanation[]> {
  const languageName = LANGUAGE_NAMES[language] ?? "English";

  const prompt = `You are MediLens, a patient-communication assistant. You are NOT a diagnostic system.

Write in ${languageName}. Keep every number, unit, reference range and date EXACTLY as given, in Latin digits.
Keep the English medical term in brackets after a translated test name.
Explanation level: ${level === "simple" ? "very simple, everyday words" : "standard, slightly more detail"}.

Never: diagnose, name a disease as the cause, prescribe, mention medication or doses, tell anyone to start/stop treatment, or claim certainty.
Use wording like "This result is outside the reference range shown on the report." and "This result alone does not establish a diagnosis."

For each test below return an object:
{
  "test_name": "<the exact test_name given to you, unchanged>",
  "summary": "1-2 sentences on what the report shows for this test",
  "what_is_this_test": "1-2 sentences of general educational information about the test",
  "why_highlighted": "state the comparison plainly, e.g. the value versus the reference range printed on the report",
  "general_context": "1-2 sentences on why this test is commonly performed; no advice",
  "possible_significance": "1-2 sentences, educational: values outside the stated reference range can have different possible explanations and must be interpreted in context; never name a definite cause or disease",
  "common_factors": "1-2 sentences starting like 'Several factors can affect this test result, including ...' (e.g. hydration, recent illness, nutrition, medications, timing); never say any factor caused this result"
}

Return ONLY a JSON array.

Tests:
${JSON.stringify(tests)}`;

  const raw = await callGateway([{ type: "input_text", text: prompt }]);
  const parsed = parseJsonBlock<Partial<GeneratedExplanation>[]>(raw) ?? [];

  return parsed
    .filter((e) => typeof e.test_name === "string")
    .map((e) => ({
      test_name: String(e.test_name),
      summary: sanitizeMedicalText(e.summary),
      what_is_this_test: sanitizeMedicalText(e.what_is_this_test),
      why_highlighted: sanitizeMedicalText(e.why_highlighted),
      general_context: sanitizeMedicalText(e.general_context),
      possible_significance: sanitizeMedicalText(e.possible_significance),
      common_factors: sanitizeMedicalText(e.common_factors),
    }));
}

export async function generateQuestions(
  observations: string[],
  language: string,
): Promise<string[]> {
  const languageName = LANGUAGE_NAMES[language] ?? "English";

  const prompt = `You are MediLens. Write 4-6 short questions a patient can ask their doctor, in ${languageName}.

Base them only on these observations from the patient's own report:
${observations.map((o) => `- ${o}`).join("\n")}

Style:
- Simple, natural, everyday words a non-medical person would use. One short sentence each (max ~18 words).
- Mention the actual test by its common name (e.g. "hemoglobin", "TSH") so each question is clearly tied to this report.
- Focus on the results outside the reference range printed on the report first.
- Good examples: "What does my hemoglobin result mean in my case?", "Should this result be looked at together with my other blood test results?",
  "Could you explain why my TSH is outside the reference range?", "Should I repeat this test or have a follow-up test?",
  "Are there any factors that could have affected my vitamin D result?", "How does this compare with my previous report?"
- Bad (never write): technical jargon like "hematological parameter" or "pathological condition"; diagnostic questions like "Do I have anemia?".
- No medication, dose or treatment questions. Keep numbers, units and ranges exactly as given if you use them.

Return ONLY a JSON array of strings.`;

  const raw = await callGateway([{ type: "input_text", text: prompt }]);
  const parsed = parseJsonBlock<unknown[]>(raw) ?? [];

  return parsed
    .filter((q): q is string => typeof q === "string")
    .map((q) => sanitizeMedicalText(q))
    .filter((q) => q.length > 0)
    .slice(0, 6);
}

/* ------------------------------------------------------------ demo report */

export const DEMO_TESTS: ExtractedTest[] = [
  {
    test_name: "Hemoglobin",
    original_test_name: "Haemoglobin (Hb)",
    value: "11.2",
    unit: "g/dL",
    reference_range: "12–16 g/dL",
    confidence: 0.97,
    source_text: "Haemoglobin (Hb) .......... 11.2 g/dL    Ref: 12–16 g/dL",
  },
  {
    test_name: "Hematocrit",
    original_test_name: "PCV / Hematocrit",
    value: "35.4",
    unit: "%",
    reference_range: "36–46 %",
    confidence: 0.94,
    source_text: "PCV / Hematocrit .......... 35.4 %    Ref: 36–46 %",
  },
  {
    test_name: "Total Leukocyte Count",
    original_test_name: "TLC (WBC)",
    value: "7.8",
    unit: "10^9/L",
    reference_range: "4.0–11.0 10^9/L",
    confidence: 0.96,
    source_text: "TLC (WBC) .......... 7.8 x10^9/L    Ref: 4.0–11.0",
  },
  {
    test_name: "Platelet Count",
    original_test_name: "Platelets",
    value: "212",
    unit: "10^9/L",
    reference_range: "150–450 10^9/L",
    confidence: 0.72,
    source_text: "Platelets .......... 212 x10^9/L    Ref: 150–450",
  },
  {
    test_name: "Vitamin D (25-OH)",
    original_test_name: "25-Hydroxy Vitamin D",
    value: "18",
    unit: "ng/mL",
    reference_range: "30–100 ng/mL",
    confidence: 0.95,
    source_text: "25-Hydroxy Vitamin D .......... 18 ng/mL    Ref: 30–100 ng/mL",
  },
  {
    test_name: "TSH",
    original_test_name: "Thyroid Stimulating Hormone",
    value: "4.9",
    unit: "µIU/mL",
    reference_range: "0.4–4.0 µIU/mL",
    confidence: 0.93,
    source_text: "TSH .......... 4.9 µIU/mL    Ref: 0.4–4.0 µIU/mL",
  },
  {
    test_name: "Serum Creatinine",
    original_test_name: "Creatinine",
    value: "0.9",
    unit: "mg/dL",
    reference_range: "",
    confidence: 0.9,
    source_text: "Creatinine .......... 0.9 mg/dL",
  },
];

/* ------------------------------------------------------------- ask */

export async function answerQuestion(
  question: string,
  reportFacts: string[],
  knowledge: string[],
  language: string,
): Promise<string> {
  const languageName = LANGUAGE_NAMES[language] ?? "English";
  const prompt = `You are "Ask MediLens", a patient-education assistant. You are NOT a doctor and never diagnose.

Answer in ${languageName}, in 2-6 short, plain sentences. Keep numbers, units, ranges and dates exactly as given.

You may use ONLY:
(A) FROM THE PATIENT'S VERIFIED REPORT:
${reportFacts.map((f) => `- ${f}`).join("\n")}
(B) GENERAL EDUCATIONAL INFORMATION (MedlinePlus-based):
${knowledge.map((k) => `- ${k}`).join("\n") || "- (none)"}

Rules:
- When you state something from (A), start that part with "From your report:"; when from (B), start with "General information:".
- Never invent patient information, values or reference ranges. Only compare with the range printed on the report.
- Never diagnose, name a definite cause, prescribe, or mention medicines or doses. Never claim certainty.
- If (A) and (B) do not contain enough to answer, reply exactly with the ${languageName} translation of: "I don't have enough information in the uploaded report to answer that reliably."
- End with one short sentence suggesting they discuss it with a qualified healthcare professional.

Question: ${question}`;
  const raw = await callGateway([{ type: "input_text", text: prompt }]);
  return sanitizeMedicalText(raw);
}
