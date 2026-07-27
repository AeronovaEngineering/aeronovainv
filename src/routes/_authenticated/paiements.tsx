import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Trash2, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { formatTND, formatDate, formatDocNumber } from "@/lib/format";
import { logActivity } from "@/lib/activity";
import { PaymentReportDialog } from "@/components/PaymentReportDialog";

export const Route = createFileRoute("/_authenticated/paiements")({
  head: () => ({ meta: [{ title: "Paiements — AeroNova" }] }),
  component: PaiementsPage,
});

const METHODS = [
  { value: "virement", label: "Virement" },
  { value: "cheque", label: "Chèque" },
  { value: "especes", label: "Espèces" },
  { value: "carte", label: "Carte bancaire" },
  { value: "traite", label: "Traite" },
];
const methodLabel = (v: string) => METHODS.find((m) => m.value === v)?.label ?? v;

type PaymentRow = {
  id: string; invoice_id: string; payment_date: string; amount: number;
  method: string; reference: string | null;
  invoices: { number: number; year: number; total_ttc: number; clients: { company_name: string } | null } | null;
};

function PaiementsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState<PaymentRow | null>(null);
  const [form, setForm] = useState({ invoice_id: "", payment_date: new Date().toISOString().slice(0, 10), amount: "", method: "virement", reference: "" });

  const payments = useQuery({
    queryKey: ["payments"],
    queryFn: async (): Promise<PaymentRow[]> => {
      const { data, error } = await supabase
        .from("payments")
        .select("id,invoice_id,payment_date,amount,method,reference,invoices(number,year,total_ttc,clients(company_name))")
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PaymentRow[];
    },
  });

  const openInvoices = useQuery({
    queryKey: ["open_invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("id,number,year,total_ttc,paid_amount,status,clients(company_name)")
        .in("status", ["validated", "partially_paid"])
        .order("document_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const selectedInvoice = useMemo(
    () => (openInvoices.data ?? []).find((i) => i.id === form.invoice_id),
    [openInvoices.data, form.invoice_id],
  );
  const remaining = selectedInvoice ? Number(selectedInvoice.total_ttc) - Number(selectedInvoice.paid_amount) : 0;

  const rows = useMemo(() => {
    const list = payments.data ?? [];
    if (!q.trim()) return list;
    const n = q.toLowerCase();
    return list.filter((p) =>
      (p.invoices?.clients?.company_name ?? "").toLowerCase().includes(n) ||
      (p.reference ?? "").toLowerCase().includes(n) ||
      (p.invoices ? formatDocNumber(p.invoices.number, p.invoices.year).includes(n) : false),
    );
  }, [payments.data, q]);

  const total = useMemo(() => rows.reduce((s, p) => s + Number(p.amount), 0), [rows]);

  function openDialog() {
    setForm({ invoice_id: "", payment_date: new Date().toISOString().slice(0, 10), amount: "", method: "virement", reference: "" });
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.invoice_id) return toast.error("Sélectionnez une facture");
    const amount = Number(form.amount);
    if (!amount || amount <= 0) return toast.error("Montant invalide");
    setBusy(true);
    const { data: userRes } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("payments").insert({
      invoice_id: form.invoice_id,
      payment_date: form.payment_date,
      amount,
      method: form.method,
      reference: form.reference || null,
      created_by: userRes.user?.id ?? null,
    }).select("id").single();
    setBusy(false);
    if (error) return toast.error(error.message);
    await logActivity("payment", "invoice", form.invoice_id, { amount, method: form.method });
    toast.success("Paiement enregistré");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["payments"] });
    qc.invalidateQueries({ queryKey: ["open_invoices"] });
    qc.invalidateQueries({ queryKey: ["documents", "invoice"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    void data;
  }

  async function confirmDelete() {
    if (!toDelete) return;
    const { error } = await supabase.from("payments").delete().eq("id", toDelete.id);
    if (error) return toast.error(error.message);
    await logActivity("delete", "invoice", toDelete.invoice_id, { amount: toDelete.amount });
    toast.success("Paiement supprimé");
    setToDelete(null);
    qc.invalidateQueries({ queryKey: ["payments"] });
    qc.invalidateQueries({ queryKey: ["open_invoices"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  }

  return (
    <>
      <PageHeader
        title="Paiements"
        description="Encaissements sur factures — les statuts se mettent à jour automatiquement."
        actions={
          <div className="flex items-center gap-2">
            <PaymentReportDialog />
            <Button onClick={openDialog}><Plus className="w-4 h-4 mr-2" /> Enregistrer un paiement</Button>
          </div>
        }
      />
      <Card><CardContent className="p-0">
        <div className="p-3 border-b border-border flex items-center justify-between gap-3 flex-wrap">
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" className="pl-9" />
          </div>
          <div className="text-sm text-muted-foreground">Total affiché : <span className="font-semibold text-foreground">{formatTND(total)}</span></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground bg-surface-muted">
              <tr>
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Facture</th>
                <th className="text-left p-3">Client</th>
                <th className="text-left p-3">Mode</th>
                <th className="text-left p-3">Référence</th>
                <th className="text-right p-3">Montant</th>
                <th className="text-right p-3 w-16">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.isLoading && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Chargement…</td></tr>}
              {!payments.isLoading && rows.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Aucun paiement.</td></tr>}
              {rows.map((p) => (
                <tr key={p.id} className="border-t border-border hover:bg-surface-muted/50">
                  <td className="p-3">{formatDate(p.payment_date)}</td>
                  <td className="p-3 font-medium">{p.invoices ? formatDocNumber(p.invoices.number, p.invoices.year) : "—"}</td>
                  <td className="p-3 text-muted-foreground">{p.invoices?.clients?.company_name ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{methodLabel(p.method)}</td>
                  <td className="p-3 text-muted-foreground">{p.reference ?? "—"}</td>
                  <td className="p-3 text-right font-medium">{formatTND(p.amount)}</td>
                  <td className="p-3 text-right">
                    <Button variant="ghost" size="icon" onClick={() => setToDelete(p)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Enregistrer un paiement</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label>Facture</Label>
              <Select value={form.invoice_id} onValueChange={(v) => {
                const inv = (openInvoices.data ?? []).find((i) => i.id === v);
                const rem = inv ? Number(inv.total_ttc) - Number(inv.paid_amount) : 0;
                setForm((f) => ({ ...f, invoice_id: v, amount: rem > 0 ? rem.toFixed(3) : "" }));
              }}>
                <SelectTrigger><SelectValue placeholder="Sélectionner une facture ouverte" /></SelectTrigger>
                <SelectContent>
                  {(openInvoices.data ?? []).map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {formatDocNumber(i.number, i.year)} — {i.clients?.company_name ?? "—"} ({formatTND(Number(i.total_ttc) - Number(i.paid_amount))} restant)
                    </SelectItem>
                  ))}
                  {(openInvoices.data ?? []).length === 0 && <div className="p-2 text-sm text-muted-foreground">Aucune facture ouverte.</div>}
                </SelectContent>
              </Select>
              {selectedInvoice && <p className="text-xs text-muted-foreground">Restant dû : {formatTND(remaining)}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Date</Label><Input type="date" required value={form.payment_date} onChange={(e) => setForm((f) => ({ ...f, payment_date: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Montant (DT)</Label><Input type="number" step="0.001" min="0" required value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Mode de paiement</Label>
                <Select value={form.method} onValueChange={(v) => setForm((f) => ({ ...f, method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Référence</Label><Input value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} placeholder="N° chèque / virement" /></div>
            </div>
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
            <AlertDialogTitle>Supprimer ce paiement ?</AlertDialogTitle>
            <AlertDialogDescription>Le statut de la facture sera recalculé. Seuls les administrateurs peuvent supprimer.</AlertDialogDescription>
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
