import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, Percent, Plus, Trash2, Info, Calculator, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { formatTND, formatDate } from "@/lib/format";
import { logActivity } from "@/lib/activity";

export const Route = createFileRoute("/_authenticated/retenues")({
  head: () => ({ meta: [{ title: "Retenue à la source — AeroNova" }] }),
  component: RetenuesPage,
});

type PurchaseWh = {
  id: string; invoice_date: string; supplier_invoice_number: string | null;
  subtotal_ht: number; withholding_rate: number; withholding_amount: number;
  suppliers: { company_name: string } | null;
};
type ManualWh = {
  id: string; entry_date: string; beneficiary: string;
  base_amount: number; rate: number; amount: number; notes: string | null;
};
type UnifiedRow = {
  key: string; source: "achat" | "manuel"; date: string; label: string;
  base: number; rate: number; amount: number; manualId?: string;
};

const emptyForm = () => ({
  entry_date: new Date().toISOString().slice(0, 10),
  beneficiary: "", base_amount: "", rate: "", notes: "",
});


function RetenuesPage() {
  const now = new Date().getFullYear();
  const qc = useQueryClient();
  const [year, setYear] = useState(String(now));
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [toDelete, setToDelete] = useState<UnifiedRow | null>(null);

  const purchasesQ = useQuery({
    queryKey: ["withholdings"],
    queryFn: async (): Promise<PurchaseWh[]> => {
      const { data, error } = await supabase
        .from("purchase_invoices")
        .select("id,invoice_date,supplier_invoice_number,subtotal_ht,withholding_rate,withholding_amount,suppliers(company_name)")
        .gt("withholding_amount", 0)
        .order("invoice_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PurchaseWh[];
    },
  });

  const manualQ = useQuery({
    queryKey: ["withholding_entries"],
    queryFn: async (): Promise<ManualWh[]> => {
      const { data, error } = await supabase
        .from("withholding_entries")
        .select("id,entry_date,beneficiary,base_amount,rate,amount,notes")
        .order("entry_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ManualWh[];
    },
  });

  const unified = useMemo<UnifiedRow[]>(() => {
    const a: UnifiedRow[] = (purchasesQ.data ?? []).map((r) => ({
      key: "a" + r.id, source: "achat", date: r.invoice_date,
      label: r.suppliers?.company_name ?? r.supplier_invoice_number ?? "Fournisseur",
      base: Number(r.subtotal_ht), rate: Number(r.withholding_rate), amount: Number(r.withholding_amount),
    }));
    const m: UnifiedRow[] = (manualQ.data ?? []).map((r) => ({
      key: "m" + r.id, source: "manuel", date: r.entry_date, label: r.beneficiary,
      base: Number(r.base_amount), rate: Number(r.rate), amount: Number(r.amount), manualId: r.id,
    }));
    return [...a, ...m].sort((x, y) => (x.date < y.date ? 1 : -1));
  }, [purchasesQ.data, manualQ.data]);

  const years = useMemo(() => {
    const set = new Set<string>([String(now)]);
    unified.forEach((r) => set.add(r.date.slice(0, 4)));
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [unified, now]);

  const rows = useMemo(() => unified.filter((r) => r.date.slice(0, 4) === year), [unified, year]);
  const totalBase = useMemo(() => rows.reduce((s, r) => s + r.base, 0), [rows]);
  const totalWh = useMemo(() => rows.reduce((s, r) => s + r.amount, 0), [rows]);

  // 🔹 Calcul automatique du montant
  const amountPreview = useMemo(() => {
    const base = Number(form.base_amount) || 0;
    const rate = Number(form.rate) || 0;
    return Math.round(base * rate * 100) / 10000; // base * taux / 100
  }, [form.base_amount, form.rate]);

  // 🔹 Effet pour mettre à jour automatiquement le montant
  useEffect(() => {
    // Le montant est calculé automatiquement et n'est pas stocké dans le formulaire
    // Il sera calculé à la soumission
  }, [form.base_amount, form.rate]);

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!form.beneficiary.trim()) return toast.error("Bénéficiaire requis");
    
    // 🔹 Utiliser le montant calculé automatiquement
    const calculatedAmount = amountPreview;
    if (calculatedAmount <= 0) {
      return toast.error("Le montant de la retenue doit être supérieur à 0 (vérifiez base HT et taux)");
    }
    
    setBusy(true);
    const { data: userRes } = await supabase.auth.getUser();
    const { error } = await supabase.from("withholding_entries").insert({
      entry_date: form.entry_date,
      beneficiary: form.beneficiary.trim(),
      base_amount: Number(form.base_amount) || 0,
      rate: Number(form.rate) || 0,
      amount: calculatedAmount,
      notes: form.notes || null,
      created_by: userRes.user?.id ?? null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    await logActivity("create", "invoice", null, { beneficiary: form.beneficiary, amount: calculatedAmount });
    toast.success(`Retenue de ${formatTND(calculatedAmount)} enregistrée`);
    setForm(emptyForm());
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["withholding_entries"] });
  }

  async function confirmDelete() {
    if (!toDelete?.manualId) return;
    const { error } = await supabase.from("withholding_entries").delete().eq("id", toDelete.manualId);
    if (error) return toast.error(error.message);
    toast.success("Supprimé");
    setToDelete(null);
    qc.invalidateQueries({ queryKey: ["withholding_entries"] });
  }

  const loading = purchasesQ.isLoading || manualQ.isLoading;

  return (
    <>
      <PageHeader
        title="Retenue à la source"
        description="Retenues sur factures d'achat et retenues manuelles à reverser à l'administration fiscale."
        actions={
          <div className="flex items-center gap-2">
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>{years.map((y) => <SelectItem key={y} value={y}>Année {y}</SelectItem>)}</SelectContent>
            </Select>
            <Button onClick={() => { setForm(emptyForm()); setOpen(true); }}><Plus className="w-4 h-4 mr-2" /> Retenue à la source</Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Base imposable (HT) {year}</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{formatTND(totalBase)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total retenu {year}</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold text-gold">{formatTND(totalWh)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Taux moyen</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {totalBase > 0 ? ((totalWh / totalBase) * 100).toFixed(2) : "0"}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Nombre d'opérations</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {rows.length}
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({rows.filter(r => r.source === "achat").length} achats, {rows.filter(r => r.source === "manuel").length} manuelles)
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card><CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground bg-surface-muted">
              <tr>
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Bénéficiaire / Fournisseur</th>
                <th className="text-left p-3">Origine</th>
                <th className="text-right p-3">Base HT</th>
                <th className="text-right p-3">Taux</th>
                <th className="text-right p-3">Retenue</th>
                <th className="text-right p-3 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></td></tr>}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={7} className="p-10 text-center text-muted-foreground">
                  <Percent className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  Aucune retenue enregistrée pour {year}.
                </td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.key} className="border-t border-border hover:bg-surface-muted/50">
                  <td className="p-3">{formatDate(r.date)}</td>
                  <td className="p-3 font-medium">{r.label}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      r.source === "achat" 
                        ? "bg-blue-100 text-blue-700" 
                        : "bg-purple-100 text-purple-700"
                    }`}>
                      {r.source === "achat" ? "Facture d'achat" : "Manuelle"}
                    </span>
                  </td>
                  <td className="p-3 text-right">{r.base > 0 ? formatTND(r.base) : "—"}</td>
                  <td className="p-3 text-right text-muted-foreground">{r.rate > 0 ? `${r.rate}%` : "—"}</td>
                  <td className="p-3 text-right font-medium text-gold">{formatTND(r.amount)}</td>
                  <td className="p-3 text-right">
                    {r.source === "manuel" && (
                      <Button variant="ghost" size="icon" onClick={() => setToDelete(r)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length > 0 && (
                <tr className="border-t-2 border-border bg-surface-muted font-semibold">
                  <td className="p-3" colSpan={3}>Total {year}</td>
                  <td className="p-3 text-right">{formatTND(totalBase)}</td>
                  <td className="p-3"></td>
                  <td className="p-3 text-right">{formatTND(totalWh)}</td>
                  <td className="p-3"></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouvelle retenue à la source</DialogTitle>
            <DialogDescription>
              Le montant est calculé automatiquement à partir de la base HT et du taux.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input 
                  type="date" 
                  required 
                  value={form.entry_date} 
                  onChange={(e) => setForm((f) => ({ ...f, entry_date: e.target.value }))} 
                />
              </div>
              <div className="space-y-2">
                <Label>Bénéficiaire *</Label>
                <Input 
                  required 
                  placeholder="Nom du bénéficiaire" 
                  value={form.beneficiary} 
                  onChange={(e) => setForm((f) => ({ ...f, beneficiary: e.target.value }))} 
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Base HT</Label>
                <div className="relative">
                  <Input 
                    type="number" 
                    step="0.001" 
                    min="0" 
                    placeholder="0" 
                    value={form.base_amount} 
                    onChange={(e) => setForm((f) => ({ ...f, base_amount: e.target.value }))} 
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">TND</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Taux %</Label>
                <div className="relative">
                  <Input 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    max="100"
                    placeholder="0" 
                    value={form.rate} 
                    onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))} 
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                </div>
              </div>
            </div>
            
            {/* 🔹 Section calcul automatique */}
            <div className="rounded-md bg-surface-muted p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Calcul de la retenue</span>
                <Calculator className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Base HT</span>
                <span className="font-medium">{formatTND(Number(form.base_amount) || 0)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Taux</span>
                <span className="font-medium">{Number(form.rate) || 0}%</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-2">
                <span className="font-semibold">Montant retenu</span>
                <span className={`font-bold text-lg ${amountPreview > 0 ? 'text-gold' : 'text-muted-foreground'}`}>
                  {formatTND(amountPreview)}
                </span>
              </div>
              {amountPreview === 0 && Number(form.base_amount) > 0 && Number(form.rate) > 0 && (
                <div className="text-xs text-destructive mt-1">
                  ⚠️ Vérifiez les valeurs (taux en pourcentage)
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea 
                value={form.notes} 
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} 
                placeholder="Informations complémentaires..."
              />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button 
                type="submit" 
                disabled={busy || amountPreview <= 0}
                title={amountPreview <= 0 ? "Le montant doit être supérieur à 0" : ""}
              >
                {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Enregistrer {amountPreview > 0 ? `(${formatTND(amountPreview)})` : ""}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette retenue ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est définitive. Seuls les administrateurs peuvent supprimer une retenue.
              {toDelete && (
                <div className="mt-2 p-2 bg-muted rounded text-sm">
                  <span className="font-medium">{toDelete.label}</span> — {formatTND(toDelete.amount)}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}