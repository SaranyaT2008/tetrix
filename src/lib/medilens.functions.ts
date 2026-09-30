import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Lang = "en" | "ta" | "hi";
type Level = "simple" | "standard";

const asLang = (v: unknown): Lang => (v === "ta" || v === "hi" ? v : "en");
const asLevel = (v: unknown): Level => (v === "standard" ? "standard" : "simple");

/**
 * Reads the uploaded file, extracts structured rows with AI, computes
 * reference-range status from the report's own ranges and stores everything.
 */
export const processReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { reportId: string }) => ({ reportId: String(input.reportId) }))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { computeStatus, extractFromDocument } = await import("./medilens.server");

    const { data: report, error: reportError } = await supabase
      .from("reports")
      .select("id, storage_path, filename")
      .eq("id", data.reportId)
      .single();
    if (reportError || !report?.storage_path) throw new Error("Report not found.");

    await supabase.from("reports").update({ status: "processing" }).eq("id", report.id);

    try {
      const { data: file, error: fileError } = await supabase.storage
        .from("reports")
        .download(report.storage_path);
      if (fileError || !file) throw new Error("Could not read the uploaded file.");

      const mimeType = file.type || "image/jpeg";
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (let i = 0; i < bytes.length; i += 8192) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
      }
      const dataUrl = `data:${mimeType};base64,${btoa(binary)}`;

      const extracted = await extractFromDocument(dataUrl, mimeType);
      if (extracted.tests.length === 0) throw new Error("No test results were found in this file.");

      await supabase.from("report_tests").delete().eq("report_id", report.id);

      const rows = extracted.tests.map((t, index) => ({
        report_id: report.id,
        test_name: t.test_name,
        original_test_name: t.original_test_name,
        value: t.value,
        unit: t.unit,
        reference_range: t.reference_range,
        status: t.confidence < 0.85 ? "needs_verification" : computeStatus(t.value, t.reference_range),
        confidence: t.confidence,
        source_text: t.source_text,
        verified: false,
        position: index,
      }));

      const { error: insertError } = await supabase.from("report_tests").insert(rows);
      if (insertError) throw new Error(insertError.message);

      await supabase
        .from("reports")
        .update({
          status: "verification_required",
          raw_text: extracted.raw_text,
          report_date: extracted.report_date,
          lab_name: extracted.lab_name,
          updated_at: new Date().toISOString(),
        })
        .eq("id", report.id);

      return { ok: true as const, count: rows.length };
    } catch (error) {
      await supabase.from("reports").update({ status: "failed" }).eq("id", report.id);
      throw error instanceof Error ? error : new Error("Processing failed.");
    }
  });

/** Creates a clearly-labelled fictional report so the whole flow can be tried. */
export const createDemoReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { computeStatus, DEMO_TESTS } = await import("./medilens.server");

    const { data: report, error } = await supabase
      .from("reports")
      .insert({
        user_id: userId,
        filename: "Demo Medical Report (sample data)",
        lab_name: "Sample Diagnostics (demo)",
        report_date: new Date().toISOString().slice(0, 10),
        is_demo: true,
        status: "verification_required",
        raw_text: DEMO_TESTS.map((t) => t.source_text).join("\n"),
      })
      .select("id")
      .single();
    if (error || !report) throw new Error(error?.message ?? "Could not create the demo report.");

    const rows = DEMO_TESTS.map((t, index) => ({
      report_id: report.id,
      test_name: t.test_name,
      original_test_name: t.original_test_name,
      value: t.value,
      unit: t.unit,
      reference_range: t.reference_range,
      status: t.confidence < 0.85 ? "needs_verification" : computeStatus(t.value, t.reference_range),
      confidence: t.confidence,
      source_text: t.source_text,
      verified: false,
      position: index,
    }));

    const { error: insertError } = await supabase.from("report_tests").insert(rows);
    if (insertError) throw new Error(insertError.message);

    return { reportId: report.id };
  });

/** Recomputes status against the report's own range after a manual edit. */
export const saveTestEdit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    testId: string;
    value: string;
    unit: string;
    reference_range: string;
  }) => ({
    testId: String(input.testId),
    value: String(input.value ?? ""),
    unit: String(input.unit ?? ""),
    reference_range: String(input.reference_range ?? ""),
  }))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { computeStatus } = await import("./medilens.server");

    const { error } = await supabase
      .from("report_tests")
      .update({
        value: data.value,
        unit: data.unit,
        reference_range: data.reference_range,
        status: computeStatus(data.value, data.reference_range),
        verified: true,
      })
      .eq("id", data.testId);
    if (error) throw new Error(error.message);

    // A manual edit invalidates any explanation written for the old value.
    await supabase.from("explanations").delete().eq("report_test_id", data.testId);
    return { ok: true as const };
  });

/** Returns explanations for the report in the requested language, generating them once. */
export const getExplanations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { reportId: string; language: string; level: string }) => ({
    reportId: String(input.reportId),
    language: asLang(input.language),
    level: asLevel(input.level),
  }))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: tests, error } = await supabase
      .from("report_tests")
      .select("id, test_name, value, unit, reference_range, status")
      .eq("report_id", data.reportId)
      .order("position");
    if (error) throw new Error(error.message);
    if (!tests || tests.length === 0) return { explanations: [] };

    const ids = tests.map((t) => t.id);
    const { data: existing } = await supabase
      .from("explanations")
      .select("*")
      .in("report_test_id", ids)
      .eq("language", data.language)
      .eq("explanation_level", data.level);

    const have = new Set((existing ?? []).map((e) => e.report_test_id));
    const missing = tests.filter((t) => !have.has(t.id));

    if (missing.length > 0) {
      const { generateExplanations } = await import("./medilens.server");
      const generated = await generateExplanations(
        missing.map((t) => ({
          test_name: t.test_name,
          value: t.value,
          unit: t.unit,
          reference_range: t.reference_range,
          status: t.status,
        })),
        data.language,
        data.level,
      );

      const safety =
        data.language === "ta"
          ? "இந்த முடிவு மட்டும் ஒரு நோயறிதலை உறுதிப்படுத்தாது. தகுதியான மருத்துவ நிபுணரிடம் பேசுங்கள்."
          : data.language === "hi"
            ? "यह परिणाम अकेले कोई निदान स्थापित नहीं करता। किसी योग्य स्वास्थ्य पेशेवर से चर्चा करें।"
            : "This result alone does not establish a diagnosis. Discuss this result with a qualified healthcare professional.";

      const rows = missing
        .map((t) => {
          const match = generated.find((g) => g.test_name === t.test_name);
          if (!match) return null;
          return {
            report_test_id: t.id,
            language: data.language,
            explanation_level: data.level,
            summary: match.summary,
            what_is_this_test: match.what_is_this_test,
            why_highlighted: match.why_highlighted,
            general_context: match.general_context,
            possible_significance: match.possible_significance,
            common_factors: match.common_factors,
            safety_message: safety,
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

      if (rows.length > 0) {
        await supabase.from("explanations").upsert(rows, {
          onConflict: "report_test_id,language,explanation_level",
        });
      }
    }

    const { data: all } = await supabase
      .from("explanations")
      .select("*")
      .in("report_test_id", ids)
      .eq("language", data.language)
      .eq("explanation_level", data.level);

    return { explanations: all ?? [] };
  });

/** Returns doctor-discussion questions in the requested language, generating them once. */
export const getDoctorQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { reportId: string; language: string; refresh?: boolean }) => ({
    reportId: String(input.reportId),
    language: asLang(input.language),
    refresh: input.refresh === true,
  }))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    if (data.refresh) {
      await supabase.from("doctor_questions").delete().eq("report_id", data.reportId).eq("language", data.language);
    }

    const { data: existing } = await supabase
      .from("doctor_questions")
      .select("*")
      .eq("report_id", data.reportId)
      .eq("language", data.language)
      .order("created_at");
    if (existing && existing.length > 0) return { questions: existing };

    const { data: tests } = await supabase
      .from("report_tests")
      .select("id, test_name, value, unit, reference_range, status")
      .eq("report_id", data.reportId)
      .order("position");
    if (!tests || tests.length === 0) return { questions: [] };

    const observations = tests.map((t) => {
      const range = t.reference_range
        ? `reference range printed on the report: ${t.reference_range}`
        : "no reference range printed on the report";
      return `${t.test_name}: ${t.value ?? ""} ${t.unit ?? ""} (${range}; status: ${t.status})`;
    });

    const { generateQuestions } = await import("./medilens.server");
    const questions = await generateQuestions(observations, data.language);
    if (questions.length === 0) return { questions: [] };

    const outOfRange = tests.filter((t) => t.status !== "within_reported_range").map((t) => t.id);
    const evidence = outOfRange.length > 0 ? outOfRange : tests.map((t) => t.id);

    const { data: inserted, error } = await supabase
      .from("doctor_questions")
      .insert(
        questions.map((question) => ({
          report_id: data.reportId,
          language: data.language,
          question,
          evidence_test_ids: evidence,
        })),
      )
      .select("*");
    if (error) throw new Error(error.message);

    return { questions: inserted ?? [] };
  });

/** Answers a question using only the verified report plus curated educational knowledge. */
export const askMediLens = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { reportId: string; question: string; language: string }) => ({
    reportId: String(input.reportId),
    question: String(input.question ?? "").slice(0, 600).trim(),
    language: asLang(input.language),
  }))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    if (!data.question) throw new Error("Please type a question.");

    const { data: report } = await supabase
      .from("reports")
      .select("id, report_date, lab_name, status")
      .eq("id", data.reportId)
      .single();
    if (!report || report.status !== "verified") throw new Error("Verify this report first.");

    const { data: tests } = await supabase
      .from("report_tests")
      .select("test_name, value, unit, reference_range, status")
      .eq("report_id", data.reportId)
      .order("position");

    const { TEST_KNOWLEDGE, findKnowledge } = await import("./test-knowledge");
    const facts = [
      `Report date: ${report.report_date ?? "not printed"}${report.lab_name ? `, lab: ${report.lab_name}` : ""}`,
      ...(tests ?? []).map(
        (t) =>
          `${t.test_name}: ${t.value ?? ""} ${t.unit ?? ""}; reference range printed on report: ${t.reference_range || "not printed"}; status: ${t.status}`,
      ),
    ];

    const q = data.question.toLowerCase();
    const picked = new Map<string, (typeof TEST_KNOWLEDGE)[number]>();
    for (const t of tests ?? []) {
      const k = findKnowledge(t.test_name);
      if (k) picked.set(k.id, k);
    }
    for (const k of TEST_KNOWLEDGE) {
      if (k.aliases.some((a) => q.includes(a)) || q.includes(k.name.en.toLowerCase())) picked.set(k.id, k);
    }
    const knowledge = [...picked.values()].map(
      (k) =>
        `${k.name.en}: ${k.what_is_this_test.en} ${k.why_is_it_tested.en} Factors that may lower it: ${k.below_range_common_factors.en.join(", ")}. Factors that may raise it: ${k.above_range_common_factors.en.join(", ")}. Related tests: ${k.related_tests.join(", ")}.`,
    );

    const { answerQuestion } = await import("./medilens.server");
    const answer = await answerQuestion(data.question, facts, knowledge, data.language);
    const fallback =
      data.language === "ta"
        ? "பதிவேற்றப்பட்ட அறிக்கையில் இதற்கு நம்பகமாகப் பதிலளிக்கப் போதுமான தகவல் என்னிடம் இல்லை."
        : data.language === "hi"
          ? "अपलोड की गई रिपोर्ट में इसका भरोसेमंद उत्तर देने के लिए मेरे पास पर्याप्त जानकारी नहीं है।"
          : "I don't have enough information in the uploaded report to answer that reliably.";
    return { answer: answer || fallback };
  });
