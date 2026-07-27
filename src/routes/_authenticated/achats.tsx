import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge, type Status } from "@/components/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { formatTND, formatDate } from "@/lib/format";
import { logActivity } from "@/lib/activity";
import { PurchaseReportDialog } from "@/components/PurchaseReportDialog";

export const Route = createFileRoute("/_authenticated/achats")({
  head: () => ({ meta: [{ title: "Factures d'achat — AeroNova" }] }),
  component: AchatsPage,
});

type PurchaseRow = {
  id: string; supplier_id: string | null; supplier_invoice_number: string | null; invoice_date: string;
  description: string | null; subtotal_ht: number; vat_rate: number; vat_amount: number; fiscal_stamp: number;
  total_ttc: number; withholding_rate: number; withholding_amount: number; net_payable: number;
  status: Status; notes: string | null; suppliers: { company_name: string } | null;
};

type FormState = {
  id?: string; supplier_id: string; supplier_invoice_number: string; invoice_date: string; description: string;
  subtotal_ht: string; vat_rate: string; fiscal_stamp: string; withholding_rate: string; status: Status; notes: string;
};

const emptyForm = (): FormState => ({
  supplier_id: "", supplier_invoice_number: "", invoice_date: new Date().toISOString().slice(0, 10),
  description: "", subtotal_ht: "", vat_rate: "19", fiscal_stamp: "1", withholding_rate: "0", status: "validated", notes: "",
});

function compute(f: FormState) {
  const ht = Number(f.subtotal_ht) || 0;
  const vat = ht * (Number(f.vat_rate) || 0) / 100;
  const stamp = Number(f.fiscal_stamp) || 0;
  const ttc = ht + vat + stamp;
  const wh = ht * (Number(f.withholding_rate) || 0) / 100;
  const net = ttc - wh;
  return { ht, vat, stamp, ttc, wh, net };
}

const STATUS_OPTIONS: Status[] = ["draft", "validated", "partially_paid", "paid", "cancelled"];
const STATUS_LABEL: Record<Status, string> = { draft: "Brouillon", validated: "Validé", partially_paid: "Payé partiellement", paid: "Payé", cancelled: "Annulé" };

function AchatsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [toDelete, setToDelete] = useState<PurchaseRow | null>(null);

  const purchases = useQuery({
    queryKey: ["purchase_invoices"],
    queryFn: async (): Promise<PurchaseRow[]> => {
      const { data, error } = await supabase
        .from("purchase_invoices")
        .select("*,suppliers(company_name)")
        .order("invoice_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PurchaseRow[];
    },
  });

  const suppliers = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("id,company_name").order("company_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = useMemo(() => {
    const list = purchases.data ?? [];
    if (!q.trim()) return list;
    const n = q.toLowerCase();
    return list.filter((p) =>
      (p.suppliers?.company_name ?? "").toLowerCase().includes(n) ||
      (p.supplier_invoice_number ?? "").toLowerCase().includes(n) ||
      (p.description ?? "").toLowerCase().includes(n));
  }, [purchases.data, q]);

  const total = useMemo(() => rows.reduce((s, p) => s + Number(p.total_ttc), 0), [rows]);
  const c = compute(form);

  function openNew() { setForm(emptyForm()); setOpen(true); }
  function openEdit(p: PurchaseRow) {
    setForm({
      id: p.id, supplier_id: p.supplier_id ?? "", supplier_invoice_number: p.supplier_invoice_number ?? "",
      invoice_date: p.invoice_date, description: p.description ?? "", subtotal_ht: String(p.subtotal_ht),
      vat_rate: String(p.vat_rate), fiscal_stamp: String(p.fiscal_stamp), withholding_rate: String(p.withholding_rate),
      status: p.status, notes: p.notes ?? "",
    });
    setOpen(true);
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!form.supplier_id) return toast.error("Sélectionnez un fournisseur");
    setBusy(true);
    const { data: userRes } = await supabase.auth.getUser();
    const payload = {
      supplier_id: form.supplier_id,
      supplier_invoice_number: form.supplier_invoice_number || null,
      invoice_date: form.invoice_date,
      description: form.description || null,
      subtotal_ht: c.ht, vat_rate: Number(form.vat_rate) || 0, vat_amount: c.vat,
      fiscal_stamp: c.stamp, total_ttc: c.ttc,
      withholding_rate: Number(form.withholding_rate) || 0, withholding_amount: c.wh, net_payable: c.net,
      status: form.status, notes: form.notes || null,
    };
    if (form.id) {
      const { error } = await supabase.from("purchase_invoices").update(payload).eq("id", form.id);
      setBusy(false);
      if (error) return toast.error(error.message);
      await logActivity("update", "invoice", form.id, { supplier_invoice_number: payload.supplier_invoice_number });
    } else {
      const { error } = await supabase.from("purchase_invoices").insert({ ...payload, created_by: userRes.user?.id ?? null });
      setBusy(false);
      if (error) return toast.error(error.message);
      await logActivity("create", "invoice", null, { supplier_invoice_number: payload.supplier_invoice_number });
    }
    toast.success("Enregistré");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["purchase_invoices"] });
  }

  async function confirmDelete() {
    if (!toDelete) return;
    const { error } = await supabase.from("purchase_invoices").delete().eq("id", toDelete.id);
    if (error) return toast.error(error.message);
    await logActivity("delete", "invoice", toDelete.id, {});
    toast.success("Supprimé");
    setToDelete(null);
    qc.invalidateQueries({ queryKey: ["purchase_invoices"] });
  }

  return (
    <>
      <div className="no-print">
        <PageHeader
          title="Factures d'achat"
          description="Factures fournisseurs, TVA, timbre fiscal et retenue à la source."
          actions={
            <div className="flex gap-2 items-center">
              <PurchaseReportDialog />
              <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" /> Nouvelle facture d'achat</Button>
            </div>
          }
        />
        <Card><CardContent className="p-0">
          <div className="p-3 border-b border-border flex items-center justify-between gap-3 flex-wrap">
            <div className="relative max-w-sm w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" className="pl-9" />
            </div>
            <div className="text-sm text-muted-foreground">Total TTC affiché : <span className="font-semibold text-foreground">{formatTND(total)}</span></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground bg-surface-muted">
                <tr>
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">N° facture</th>
                  <th className="text-left p-3">Fournisseur</th>
                  <th className="text-right p-3">HT</th>
                  <th className="text-right p-3">Retenue</th>
                  <th className="text-right p-3">Net à payer</th>
                  <th className="text-left p-3">Statut</th>
                  <th className="text-right p-3 w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {purchases.isLoading && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Chargement…</td></tr>}
                {!purchases.isLoading && rows.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Aucune facture d'achat.</td></tr>}
                {rows.map((p) => (
                  <tr key={p.id} className="border-t border-border hover:bg-surface-muted/50">
                    <td className="p-3">{formatDate(p.invoice_date)}</td>
                    <td className="p-3 font-medium">{p.supplier_invoice_number ?? "—"}</td>
                    <td className="p-3 text-muted-foreground">{p.suppliers?.company_name ?? "—"}</td>
                    <td className="p-3 text-right">{formatTND(p.subtotal_ht)}</td>
                    <td className="p-3 text-right text-muted-foreground">{Number(p.withholding_amount) > 0 ? formatTND(p.withholding_amount) : "—"}</td>
                    <td className="p-3 text-right font-medium">{formatTND(p.net_payable)}</td>
                    <td className="p-3"><StatusBadge status={p.status} /></td>
                    <td className="p-3 text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setToDelete(p)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent></Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{form.id ? "Modifier la facture d'achat" : "Nouvelle facture d'achat"}</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label>Fournisseur</Label>
              <Select value={form.supplier_id} onValueChange={(v) => setForm((f) => ({ ...f, supplier_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>{(suppliers.data ?? []).map((s) => <SelectItem key={s.id} value={s.id}>{s.company_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>N° facture fournisseur</Label><Input value={form.supplier_invoice_number} onChange={(e) => setForm((f) => ({ ...f, supplier_invoice_number: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Date</Label><Input type="date" required value={form.invoice_date} onChange={(e) => setForm((f) => ({ ...f, invoice_date: e.target.value }))} /></div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea 
                rows={3} 
                value={form.description} 
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} 
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2"><Label>Montant HT</Label><Input type="number" step="0.001" min="0" value={form.subtotal_ht} onChange={(e) => setForm((f) => ({ ...f, subtotal_ht: e.target.value }))} /></div>
              <div className="space-y-2"><Label>TVA %</Label><Input type="number" step="0.01" min="0" value={form.vat_rate} onChange={(e) => setForm((f) => ({ ...f, vat_rate: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Timbre</Label><Input type="number" step="0.001" min="0" value={form.fiscal_stamp} onChange={(e) => setForm((f) => ({ ...f, fiscal_stamp: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Retenue à la source %</Label><Input type="number" step="0.01" min="0" value={form.withholding_rate} onChange={(e) => setForm((f) => ({ ...f, withholding_rate: e.target.value }))} /></div>
              <div className="space-y-2">
                <Label>Statut</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as Status }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="rounded-md bg-surface-muted p-3 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">TVA</span><span>{formatTND(c.vat)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total TTC</span><span>{formatTND(c.ttc)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Retenue à la source</span><span>{formatTND(c.wh)}</span></div>
              <div className="flex justify-between font-semibold border-t border-border pt-1 mt-1"><span>Net à payer</span><span>{formatTND(c.net)}</span></div>
            </div>
            <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={busy}>{busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Enregistrer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette facture d'achat ?</AlertDialogTitle>
            <AlertDialogDescription>Action définitive. Seuls les administrateurs peuvent supprimer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}