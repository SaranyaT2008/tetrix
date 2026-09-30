import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CheckCircle2, MoreVertical } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";

export const REPORT_TYPES = ["blood_test", "diabetes", "thyroid", "lipid", "kidney", "liver", "vitamin", "other"] as const;

/** Display name for a report: user-chosen name, falling back to the uploaded filename. */
export function reportLabel(r: { custom_name?: string | null; filename: string }) {
  return r.custom_name?.trim() || r.filename;
}

function useRefreshReports() {
  const qc = useQueryClient();
  return () => Promise.all([
    qc.invalidateQueries({ queryKey: ["reports"] }),
    qc.invalidateQueries({ queryKey: ["report"] }),
    qc.invalidateQueries({ queryKey: ["dashboard"] }),
    qc.invalidateQueries(),
  ]);
}

async function updateReport(id: string, patch: { custom_name?: string; report_type?: string | null; report_date?: string | null }) {
  const { error } = await supabase.from("reports").update(patch).eq("id", id);
  if (error) throw error;
}

/** Shown on a processed report so the user can store it under a preferred name. */
export function SaveReportCard({ report }: {
  report: { id: string; filename: string; custom_name: string | null; report_date: string | null; report_type: string | null };
}) {
  const { t } = useTranslation();
  const refresh = useRefreshReports();
  const [name, setName] = useState(report.custom_name ?? "");
  const [date, setDate] = useState(report.report_date ?? "");
  const [type, setType] = useState(report.report_type ?? "blood_test");
  const [saving, setSaving] = useState(false);
  const saved = Boolean(report.custom_name);

  async function save() {
    if (!name.trim()) { toast.error(t("saved_reports.enter_name")); return; }
    setSaving(true);
    try {
      await updateReport(report.id, { custom_name: name.trim().slice(0, 120), report_type: type, report_date: date || null });
      toast.success(t("saved_reports.saved"));
      await refresh();
    } catch {
      toast.error(t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="glass-panel p-6">
      <p className="flex items-center gap-2 text-sm font-semibold text-brand">
        <CheckCircle2 className="size-4" /> {t("saved_reports.processed")}
      </p>
      <h2 className="mt-1 font-display text-lg font-bold">{saved ? t("saved_reports.saved_as", { name: report.custom_name }) : t("saved_reports.save_title")}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="cr-name">{t("saved_reports.name")}</Label>
          <Input id="cr-name" value={name} maxLength={120} placeholder={t("saved_reports.enter_name")} onChange={(e) => setName(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="cr-date">{t("report.report_date")}</Label>
          <Input id="cr-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="cr-type">{t("saved_reports.type")}</Label>
          <select id="cr-type" value={type} onChange={(e) => setType(e.target.value)}
            className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
            {REPORT_TYPES.map((k) => <option key={k} value={k}>{t(`saved_reports.types.${k}`)}</option>)}
          </select>
        </div>
      </div>
      <Button onClick={save} disabled={saving} className="mt-4 rounded-xl bg-ink text-ink-foreground hover:bg-ink/90">
        {saved ? t("saved_reports.save") : t("saved_reports.save_report")}
      </Button>
    </section>
  );
}

/** ⋮ menu for a saved report: View, Compare, Rename, Delete. */
export function ReportMenu({ report }: { report: { id: string; filename: string; custom_name: string | null } }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const refresh = useRefreshReports();
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useState(reportLabel(report));

  async function rename() {
    if (!name.trim()) { toast.error(t("saved_reports.enter_name")); return; }
    try {
      await updateReport(report.id, { custom_name: name.trim().slice(0, 120) });
      toast.success(t("saved_reports.saved"));
      setRenameOpen(false);
      await refresh();
    } catch {
      toast.error(t("common.error"));
    }
  }

  async function remove() {
    const { error } = await supabase.from("reports").delete().eq("id", report.id);
    if (error) { toast.error(t("common.error")); return; }
    toast.success(t("saved_reports.deleted"));
    setDeleteOpen(false);
    await refresh();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={t("saved_reports.actions")} onClick={(e) => e.stopPropagation()}>
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => navigate({ to: "/reports/$id", params: { id: report.id } })}>{t("saved_reports.view")}</DropdownMenuItem>
          <DropdownMenuItem asChild><Link to="/compare">{t("nav.compare")}</Link></DropdownMenuItem>
          <DropdownMenuItem onSelect={() => { setName(reportLabel(report)); setRenameOpen(true); }}>{t("saved_reports.rename")}</DropdownMenuItem>
          <DropdownMenuItem className="text-destructive" onSelect={() => setDeleteOpen(true)}>{t("saved_reports.delete")}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("saved_reports.rename_title")}</DialogTitle></DialogHeader>
          <Input value={name} maxLength={120} placeholder={t("saved_reports.enter_name")} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && rename()} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenameOpen(false)}>{t("saved_reports.cancel")}</Button>
            <Button className="bg-ink text-ink-foreground hover:bg-ink/90" onClick={rename}>{t("saved_reports.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("saved_reports.delete_title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("saved_reports.delete_body", { name: reportLabel(report) })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("saved_reports.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>{t("saved_reports.delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
