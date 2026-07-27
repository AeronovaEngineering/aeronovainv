import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Loader2, Search, Printer } from "lucide-react";
import { toast } from "sonner";
import { formatTND, formatDate, formatDateTime } from "@/lib/format";
import { logActivity } from "@/lib/activity";
import { ListPrintTemplate } from "@/components/ListPrintTemplate";

export const Route = createFileRoute("/_authenticated/depenses")({
  head: () => ({ meta: [{ title: "Dépenses — AeroNova" }] }),
  component: DepensesPage,
});

const CATEGORIES = [
  { value: "general", label: "Général" },
  { value: "fournitures", label: "Fournitures de bureau" },
  { value: "loyer", label: "Loyer" },
  { value: "salaires", label: "Salaires" },
  { value: "transport", label: "Transport & carburant" },
  { value: "telecom", label: "Télécom & internet" },
  { value: "energie", label: "Électricité & eau" },
  { value: "maintenance", label: "Maintenance" },
  { value: "impots", label: "Impôts & taxes" },
  { value: "autre", label: "Autre" },
];
const PAY_METHODS = [
  { value: "especes", label: "Espèces" },
  { value: "virement", label: "Virement" },
  { value: "cheque", label: "Chèque" },
  { value: "carte", label: "Carte bancaire" },
];
const catLabel = (v: string) => CATEGORIES.find((c) => c.value === v)?.label ?? v;
const payLabel = (v: string) => PAY_METHODS.find((c) => c.value === v)?.label ?? v;

type ExpenseRow = {
  id: string; expense_date: string; category: string; description: string;
  supplier_id: string | null; amount_ht: number; vat_amount: number; amount_ttc: number;
  payment_method: string; notes: string | null;
  suppliers: { company_name: string } | null;
};

type FormState = {
  id?: string; expense_date: string; category: string; description: string;
  supplier_id: string; amount_ht: string; vat_rate: string; payment_method: string; notes: string;
};

const emptyForm = (): FormState => ({
  expense_date: new Date().toISOString().slice(0, 10),
  category: "general", description: "", supplier_id: "", amount_ht: "", vat_rate: "19", payment_method: "especes", notes: "",
});

function DepensesPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [toDelete, setToDelete] = useState<ExpenseRow | null>(null);

  const expenses = useQuery({
    queryKey: ["expenses"],
    queryFn: async (): Promise<ExpenseRow[]> => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*,suppliers(company_name)")
        .order("expense_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ExpenseRow[];
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

  const settingsQ = useQuery({
    queryKey: ["company_settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("company_settings").select("*").single();
      if (error) throw error;
      return data;
    },
  });

  const rows = useMemo(() => {
    const list = expenses.data ?? [];
    if (!q.trim()) return list;
    const n = q.toLowerCase();
    return list.filter((e) => e.description.toLowerCase().includes(n) || catLabel(e.category).toLowerCase().includes(n) || (e.suppliers?.company_name ?? "").toLowerCase().includes(n));
  }, [expenses.data, q]);

  const total = useMemo(() => rows.reduce((s, e) => s + Number(e.amount_ttc), 0), [rows]);
  const vatPreview = (Number(form.amount_ht) || 0) * (Number(form.vat_rate) || 0) / 100;
  const ttc = (Number(form.amount_ht) || 0) + vatPreview;

  function openNew() { setForm(emptyForm()); setOpen(true); }
  function openEdit(e: ExpenseRow) {
    const ht = Number(e.amount_ht) || 0;
    const rate = ht > 0 ? Math.round((Number(e.vat_amount) / ht) * 10000) / 100 : 0;
    setForm({
      id: e.id, expense_date: e.expense_date, category: e.category, description: e.description,
      supplier_id: e.supplier_id ?? "", amount_ht: String(e.amount_ht), vat_rate: String(rate),
      payment_method: e.payment_method, notes: e.notes ?? "",
    });
    setOpen(true);
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!form.description.trim()) return toast.error("Description requise");
    setBusy(true);
    const { data: userRes } = await supabase.auth.getUser();
    const amount_ht = Number(form.amount_ht) || 0;
    const vat_amount = Math.round(amount_ht * (Number(form.vat_rate) || 0)) / 100;
    const payload = {
      expense_date: form.expense_date,
      category: form.category,
      description: form.description.trim(),
      supplier_id: form.supplier_id || null,
      amount_ht, vat_amount, amount_ttc: amount_ht + vat_amount,
      payment_method: form.payment_method,
      notes: form.notes || null,
    };
    if (form.id) {
      const { error } = await supabase.from("expenses").update(payload).eq("id", form.id);
      setBusy(false);
      if (error) return toast.error(error.message);
      await logActivity("update", "settings", form.id, { description: payload.description });
    } else {
      const { error } = await supabase.from("expenses").insert({ ...payload, created_by: userRes.user?.id ?? null });
      setBusy(false);
      if (error) return toast.error(error.message);
      await logActivity("create", "settings", null, { description: payload.description });
    }
    toast.success("Enregistré");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["expenses"] });
  }

  async function confirmDelete() {
    if (!toDelete) return;
    const { error } = await supabase.from("expenses").delete().eq("id", toDelete.id);
    if (error) return toast.error(error.message);
    await logActivity("delete", "settings", toDelete.id, { description: toDelete.description });
    toast.success("Supprimé");
    setToDelete(null);
    qc.invalidateQueries({ queryKey: ["expenses"] });
  }

  return (
    <>
      <div className="no-print">
        <PageHeader
          title="Dépenses"
          description="Charges et frais de fonctionnement de l'entreprise."
          actions={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="w-4 h-4 mr-2" /> Imprimer
              </Button>
              <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" /> Nouvelle dépense</Button>
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
                  <th className="text-left p-3">Catégorie</th>
                  <th className="text-left p-3">Description</th>
                  <th className="text-left p-3">Fournisseur</th>
                  <th className="text-left p-3">Mode</th>
                  <th className="text-right p-3">Montant TTC</th>
                  <th className="text-right p-3 w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.isLoading && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Chargement…</td></tr>}
                {!expenses.isLoading && rows.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Aucune dépense.</td></tr>}
                {rows.map((e) => (
                  <tr key={e.id} className="border-t border-border hover:bg-surface-muted/50">
                    <td className="p-3">{formatDate(e.expense_date)}</td>
                    <td className="p-3 text-muted-foreground">{catLabel(e.category)}</td>
                    <td className="p-3 font-medium">{e.description}</td>
                    <td className="p-3 text-muted-foreground">{e.suppliers?.company_name ?? "—"}</td>
                    <td className="p-3 text-muted-foreground">{payLabel(e.payment_method)}</td>
                    <td className="p-3 text-right font-medium">{formatTND(e.amount_ttc)}</td>
                    <td className="p-3 text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(e)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setToDelete(e)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent></Card>
      </div>

      {/* Printable report — hidden on screen, shown only when printing (replaces
          printing the raw webpage with an organized, branded document) */}
      {settingsQ.data && (
        <div className="print-only">
          <ListPrintTemplate
            title="DÉPENSES"
            subtitle={`Généré le ${formatDateTime(new Date().toISOString())}${q.trim() ? ` — filtré : "${q}"` : ""}`}
            settings={settingsQ.data}
            columns={[
              { key: "date", label: "Date", width: "12%" },
              { key: "cat", label: "Catégorie", width: "16%" },
              { key: "desc", label: "Description" },
              { key: "supplier", label: "Fournisseur", width: "18%" },
              { key: "mode", label: "Mode", width: "12%" },
              { key: "amount", label: "Montant TTC", align: "right", width: "14%" },
            ]}
            rows={rows.map((e) => ({
              date: formatDate(e.expense_date),
              cat: catLabel(e.category),
              desc: e.description,
              supplier: e.suppliers?.company_name ?? "—",
              mode: payLabel(e.payment_method),
              amount: formatTND(e.amount_ttc),
            }))}
            totalLabel="Total TTC"
            totalValue={formatTND(total)}
          />
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{form.id ? "Modifier la dépense" : "Nouvelle dépense"}</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Date</Label><Input type="date" required value={form.expense_date} onChange={(e) => setForm((f) => ({ ...f, expense_date: e.target.value }))} /></div>
              <div className="space-y-2">
                <Label>Catégorie</Label>
                <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Description</Label><Input required value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Fournisseur (facultatif)</Label>
              <Select value={form.supplier_id || "none"} onValueChange={(v) => setForm((f) => ({ ...f, supplier_id: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  {(suppliers.data ?? []).map((s) => <SelectItem key={s.id} value={s.id}>{s.company_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2"><Label>Montant HT</Label><Input type="number" step="0.001" min="0" value={form.amount_ht} onChange={(e) => setForm((f) => ({ ...f, amount_ht: e.target.value }))} /></div>
              <div className="space-y-2"><Label>TVA %</Label><Input type="number" step="0.01" min="0" value={form.vat_rate} onChange={(e) => setForm((f) => ({ ...f, vat_rate: e.target.value }))} /><div className="text-[11px] text-muted-foreground">{formatTND(vatPreview, { symbol: false })}</div></div>
              <div className="space-y-2"><Label>TTC</Label><Input readOnly value={formatTND(ttc, { symbol: false })} className="bg-surface-muted" /></div>
            </div>
            <div className="space-y-2">
              <Label>Mode de paiement</Label>
              <Select value={form.payment_method} onValueChange={(v) => setForm((f) => ({ ...f, payment_method: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PAY_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
              </Select>
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
            <AlertDialogTitle>Supprimer cette dépense ?</AlertDialogTitle>
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