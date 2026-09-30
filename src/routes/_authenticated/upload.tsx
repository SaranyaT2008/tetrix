import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { FileUp, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { processReport } from "@/lib/medilens.functions";
import { cn } from "@/lib/utils";

const ALLOWED = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
const MAX_BYTES = 10 * 1024 * 1024;

type Stage = "idle" | "uploading" | "extracting" | "structuring" | "done";

export const Route = createFileRoute("/_authenticated/upload")({
  head: () => ({
    meta: [
      { title: "Upload a report — MediLens" },
      { name: "description", content: "Upload a PDF or photo of your lab report for verification and explanation." },
      { property: "og:title", content: "Upload a report — MediLens" },
      { property: "og:description", content: "Upload a PDF or photo of your lab report for verification and explanation." },
    ],
  }),
  component: UploadPage,
});

function UploadPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = Route.useRouteContext();
  const runProcess = useServerFn(processReport);
  const inputRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<Stage>("idle");
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState("");

  const busy = stage !== "idle" && stage !== "done";

  async function handleFile(file: File) {
    if (!ALLOWED.includes(file.type)) {
      toast.error(t("upload.invalid_type"));
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error(t("upload.too_large"));
      return;
    }

    setFileName(file.name);
    setStage("uploading");

    const path = `${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
    const { error: uploadError } = await supabase.storage
      .from("reports")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) {
      setStage("idle");
      toast.error(uploadError.message);
      return;
    }

    const { data: report, error: insertError } = await supabase
      .from("reports")
      .insert({
        user_id: user.id,
        filename: file.name,
        storage_path: path,
        status: "processing",
      })
      .select("id")
      .single();
    if (insertError || !report) {
      setStage("idle");
      toast.error(insertError?.message ?? t("common.error"));
      return;
    }

    setStage("extracting");
    try {
      setStage("structuring");
      await runProcess({ data: { reportId: report.id } });
      await queryClient.invalidateQueries({ queryKey: ["reports"] });
      setStage("done");
      navigate({ to: "/reports/$id", params: { id: report.id } });
    } catch (error) {
      setStage("idle");
      toast.error(error instanceof Error ? error.message : t("upload.failed"));
      navigate({ to: "/reports/$id", params: { id: report.id } });
    }
  }

  const stages: { key: Stage; label: string }[] = [
    { key: "uploading", label: t("upload.uploading") },
    { key: "extracting", label: t("upload.extracting") },
    { key: "structuring", label: t("upload.structuring") },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">{t("upload.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("app.disclaimer")}</p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file && !busy) void handleFile(file);
        }}
        className={cn(
          "glass-panel flex flex-col items-center justify-center gap-4 border-2 border-dashed px-6 py-16 text-center transition-colors",
          dragging ? "border-brand bg-brand/5" : "border-brand/30",
        )}
      >
        <span className="grid size-12 place-items-center rounded-2xl bg-brand/10 text-brand">
          {busy ? <Loader2 className="size-5 animate-spin" /> : <FileUp className="size-5" />}
        </span>
        <p className="font-display text-lg font-semibold">{t("upload.drag")}</p>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{t("upload.or")}</p>
        <Button
          className="rounded-xl bg-ink text-ink-foreground hover:bg-ink/90"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {t("upload.browse")}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = "";
          }}
        />
        <div className="text-xs text-muted-foreground">
          <p>{t("upload.supported")}</p>
          <p>{t("upload.max_size")}</p>
        </div>
      </div>

      {busy && (
        <div className="glass-panel p-6">
          <p className="truncate text-sm font-semibold">{fileName}</p>
          <ol className="mt-4 space-y-2.5 text-sm">
            {stages.map((item) => {
              const order = stages.findIndex((s) => s.key === item.key);
              const current = stages.findIndex((s) => s.key === stage);
              const state = order < current ? "done" : order === current ? "active" : "todo";
              return (
                <li key={item.key} className="flex items-center gap-3">
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      state === "done" ? "bg-teal" : state === "active" ? "bg-brand" : "bg-border",
                    )}
                  />
                  <span className={state === "todo" ? "text-muted-foreground" : "font-medium"}>{item.label}</span>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
