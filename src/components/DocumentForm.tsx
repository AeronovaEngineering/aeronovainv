import { useEffect, useMemo, useRef, useState, lazy, Suspense } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Loader2, Printer, FileText, Save } from "lucide-react";
import { formatTND } from "@/lib/format";
import { logActivity } from "@/lib/activity";
import { StatusBadge, STATUS_LABELS, type Status } from "@/components/StatusBadge";
import type { Database } from "@/integrations/supabase/types";
import { type Item } from "@/components/InvoiceTemplate";

type DocKind = "quotation" | "invoice";
type Settings = Database["public"]["Tables"]["company_settings"]["Row"];

// Extended status type to include "converted"
type ExtendedStatus = Status | "converted";

type FormState = {
  document_date: string;
  number: number;
  client_id: string;
  project_name: string;
  project_address: string;
  vat_rate: number;
  fiscal_stamp: number;
  status: ExtendedStatus;
  notes: string;
  conditions_generales: string;
  items: (Item & { id?: string })[];
};

// Extended status labels
const EXTENDED_STATUS_LABELS: Record<ExtendedStatus, string> = {
  ...STATUS_LABELS,
  converted: "Converti",
};
const PaginatedInvoiceTemplate = lazy(() => 
  import("@/components/PaginatedInvoiceTemplate").then(module => ({
    default: module.PaginatedInvoiceTemplate
  }))
);
export function DocumentForm({
  kind, documentId,
}: { kind: DocKind; documentId?: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isNew = !documentId;
  const table = kind === "quotation" ? "quotations" : "invoices";
  const itemsTable = kind === "quotation" ? "quotation_items" : "invoice_items";
  const fk = kind === "quotation" ? "quotation_id" : "invoice_id";

  const [busy, setBusy] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const [savedDoc, setSavedDoc] = useState<{ id: string; number: number; year: number; status: ExtendedStatus } | null>(null);
  const [newClientMode, setNewClientMode] = useState(false);
  const [newClient, setNewClient] = useState({ company_name: "", matricule_fiscal: "", address: "", telephone: "" });
  const [renderPreview, setRenderPreview] = useState(false);

  const settingsQ = useQuery({
    queryKey: ["company_settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("company_settings").select("*").eq("id", 1).single();
      if (error) throw error; return data;
    },
  });

  const clientsQ = useQuery({
    queryKey: ["clients"],
    queryFn: async () => (await supabase.from("clients").select("id,company_name,address,telephone,matricule_fiscal").order("company_name")).data ?? [],
  });

  const existingQ = useQuery({
    queryKey: [table, documentId],
    enabled: !!documentId,
    queryFn: async () => {
      const [docResult, itemsResult] = await Promise.all([
        supabase.from(table).select("*").eq("id", documentId!).maybeSingle(),
        supabase.from(itemsTable).select("*").eq(fk as never, documentId!).order("position"),
      ]);

      if (docResult.error) throw docResult.error;
      if (itemsResult.error) throw itemsResult.error;

      return { doc: docResult.data, items: itemsResult.data ?? [] };
    },
  });

  const [form, setForm] = useState<FormState>({
    document_date: new Date().toISOString().slice(0, 10),
    number: 1,
    client_id: "", project_name: "", project_address: "",
    vat_rate: 19, fiscal_stamp: 1, status: "draft", notes: "",
    conditions_generales: "",
    items: [{ description: "", unit: "unité", quantity: 1, unit_price_ht: 0, total_ht: 0 }],
  });

  useEffect(() => {
    // Only render preview in the browser, after hydration
    setRenderPreview(true);
  }, []);

  useEffect(() => {
    if (existingQ.data?.doc) {
      const d = existingQ.data.doc as any;
      const docStatus = d.status as ExtendedStatus;
      setSavedDoc({ id: d.id, number: d.number, year: d.year, status: docStatus });
      setForm({
        document_date: d.document_date,
        number: d.number,
        client_id: d.client_id,
        project_name: d.project_name ?? "",
        project_address: d.project_address ?? "",
        vat_rate: Number(d.vat_rate),
        fiscal_stamp: Number(d.fiscal_stamp),
        status: docStatus,
        notes: d.notes ?? "",
        conditions_generales: d.conditions_generales ?? "",
        items: (existingQ.data.items ?? []).map((it) => ({
          id: it.id, description: it.description, unit: it.unit ?? "unité",
          quantity: Number(it.quantity), unit_price_ht: Number(it.unit_price_ht), total_ht: Number(it.total_ht),
        })),
      });
    }
  }, [existingQ.data]);

  useEffect(() => {
    if (isNew && settingsQ.data) {
      setForm((f) => ({ ...f, vat_rate: Number(settingsQ.data.default_vat_rate), fiscal_stamp: Number(settingsQ.data.fiscal_stamp) }));
    }
  }, [settingsQ.data, isNew]);

  // Prefill number = last invoice number + 1 for new invoices (still editable manually)
  const lastNumberQ = useQuery({
    queryKey: [table, "last_number", new Date(form.document_date).getFullYear()],
    enabled: isNew && kind === "invoice",
    queryFn: async () => {
      const y = new Date(form.document_date).getFullYear();
      const { data } = await supabase
        .from(table)
        .select("number")
        .eq("year", y)
        .order("number", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data?.number ?? 0;
    },
  });

  useEffect(() => {
    if (isNew && kind === "invoice" && lastNumberQ.data !== undefined) {
      setForm((f) => ({ ...f, number: (lastNumberQ.data ?? 0) + 1 }));
    }
  }, [lastNumberQ.data, isNew, kind]);

  const totals = useMemo(() => {
    const subtotal_ht = form.items.reduce((s, it) => s + Number(it.quantity) * Number(it.unit_price_ht), 0);
    const vat_amount = subtotal_ht * (Number(form.vat_rate) / 100);
    const total_ttc = subtotal_ht + vat_amount + Number(form.fiscal_stamp);
    return {
      subtotal_ht: round3(subtotal_ht), vat_amount: round3(vat_amount), total_ttc: round3(total_ttc),
    };
  }, [form.items, form.vat_rate, form.fiscal_stamp]);

  const existingClient = clientsQ.data?.find((c) => c.id === form.client_id) ?? null;
  const client = newClientMode
    ? { id: "", company_name: newClient.company_name, address: newClient.address, telephone: newClient.telephone, matricule_fiscal: newClient.matricule_fiscal }
    : existingClient;

  function updateItem(i: number, patch: Partial<Item>) {
    setForm((f) => {
      const items = [...f.items];
      items[i] = { ...items[i], ...patch } as Item;
      items[i].total_ht = round3(Number(items[i].quantity) * Number(items[i].unit_price_ht));
      return { ...f, items };
    });
  }

  function addItem() {
    setForm((f) => ({ ...f, items: [...f.items, { description: "", unit: "unité", quantity: 1, unit_price_ht: 0, total_ht: 0 }] }));
  }

  function removeItem(i: number) {
    setForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  }

  async function save() {
    if (newClientMode) {
      if (!newClient.company_name.trim() || !newClient.matricule_fiscal.trim() || !newClient.address.trim()) {
        toast.error("Nom, matricule fiscal et adresse du client sont obligatoires");
        return;
      }
    } else if (!form.client_id) {
      toast.error("Sélectionnez un client");
      return;
    }
    if (form.items.length === 0 || form.items.some((it) => !it.description.trim())) {
      toast.error("Chaque ligne doit avoir une description");
      return;
    }
    setBusy(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();

      // Create the client on the fly and persist it in the directory.
      let clientId = form.client_id;
      if (newClientMode) {
        const { data: cIns, error: cErr } = await supabase.from("clients").insert({
          company_name: newClient.company_name.trim(),
          matricule_fiscal: newClient.matricule_fiscal.trim() || null,
          address: newClient.address.trim() || null,
          telephone: newClient.telephone.trim() || null,
          created_by: userRes.user?.id ?? null,
        }).select("id").single();
        if (cErr) throw cErr;
        clientId = cIns.id;
        await logActivity("create", "client", clientId, { company_name: newClient.company_name });
        setForm((f) => ({ ...f, client_id: clientId }));
        setNewClientMode(false);
        qc.invalidateQueries({ queryKey: ["clients"] });
      }

      let docId = documentId;
      let number = savedDoc?.number;
      let year = savedDoc?.year;

      if (!docId) {
        const y = new Date(form.document_date).getFullYear();
        let n: number;
        if (kind === "invoice") {
          n = form.number;
        } else {
          const { data: numRes, error: numErr } = await supabase.rpc("next_document_number", { _doc_type: kind, _year: y });
          if (numErr) throw numErr;
          n = numRes as number;
        }
        const insertPayload: any = {
          number: n, year: y,
          document_date: form.document_date,
          client_id: clientId,
          project_name: form.project_name || null,
          project_address: form.project_address || null,
          vat_rate: form.vat_rate,
          fiscal_stamp: form.fiscal_stamp,
          subtotal_ht: totals.subtotal_ht,
          vat_amount: totals.vat_amount,
          total_ttc: totals.total_ttc,
          status: form.status,
          notes: form.notes || null,
          created_by: userRes.user?.id ?? null,
        };
        if (kind === "quotation") {
          insertPayload.conditions_generales = form.conditions_generales || null;
        }
        const { data: ins, error } = await supabase.from(table).insert(insertPayload).select("id,number,year,status").single();
        if (error) throw error;
        docId = ins.id; number = ins.number; year = ins.year;
        setSavedDoc({ id: ins.id, number: ins.number, year: ins.year, status: ins.status as ExtendedStatus });
        await logActivity("create", kind, docId, { number, year });
      } else {
        const updatePayload: any = {
          document_date: form.document_date,
          client_id: clientId,
          project_name: form.project_name || null,
          project_address: form.project_address || null,
          vat_rate: form.vat_rate,
          fiscal_stamp: form.fiscal_stamp,
          subtotal_ht: totals.subtotal_ht,
          vat_amount: totals.vat_amount,
          total_ttc: totals.total_ttc,
          status: form.status,
          notes: form.notes || null,
        };
        if (kind === "quotation") {
          updatePayload.conditions_generales = form.conditions_generales || null;
        }
        const { error } = await supabase.from(table).update(updatePayload).eq("id", docId);
        if (error) throw error;
        await logActivity("update", kind, docId);
      }

      // Replace all items (simplest)
      await supabase.from(itemsTable).delete().eq(fk as never, docId!);
      const rows = form.items.map((it, idx) => ({
        [fk]: docId, position: idx,
        description: it.description, unit: it.unit ?? "unité",
        quantity: it.quantity, unit_price_ht: it.unit_price_ht, total_ht: it.total_ht,
      }));
      const { error: itemsErr } = await supabase.from(itemsTable).insert(rows as never);
      if (itemsErr) throw itemsErr;

      toast.success("Enregistré");
      qc.invalidateQueries({ queryKey: [table] });
      if (isNew && docId) {
        navigate({ to: kind === "quotation" ? "/devis/$id" : "/factures/$id", params: { id: docId } });
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  }

  async function convertToInvoice() {
    if (!savedDoc || kind !== "quotation") return;
    setBusy(true);
    try {
      const y = new Date(form.document_date).getFullYear();
      const { data: numRes, error: numErr } = await supabase.rpc("next_document_number", { _doc_type: "invoice", _year: y });
      if (numErr) throw numErr;
      const { data: userRes } = await supabase.auth.getUser();
      const { data: ins, error } = await supabase.from("invoices").insert({
        number: numRes as number, year: y,
        document_date: form.document_date, client_id: form.client_id,
        project_name: form.project_name || null, project_address: form.project_address || null,
        vat_rate: form.vat_rate, fiscal_stamp: form.fiscal_stamp,
        subtotal_ht: totals.subtotal_ht, vat_amount: totals.vat_amount, total_ttc: totals.total_ttc,
        status: "validated", notes: form.notes || null,
        converted_from_quotation_id: savedDoc.id,
        created_by: userRes.user?.id ?? null,
      }).select("id").single();
      if (error) throw error;
      const rows = form.items.map((it, idx) => ({
        invoice_id: ins.id, position: idx,
        description: it.description, unit: it.unit ?? "unité",
        quantity: it.quantity, unit_price_ht: it.unit_price_ht, total_ht: it.total_ht,
      }));
      await supabase.from("invoice_items").insert(rows as never);
      await logActivity("convert", "quotation", savedDoc.id, { to_invoice: ins.id });
      
      // Update the quotation status to "converted"
      const { error: updateError } = await supabase
        .from("quotations")
        .update({ status: "converted" as any })
        .eq("id", savedDoc.id);
      if (updateError) {
        // The invoice was created successfully; failing to flag the quotation isn't fatal
      }
      
      toast.success("Facture créée");
      navigate({ to: "/factures/$id", params: { id: ins.id } });
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  }

  // Locked if status is "paid" OR (kind is "quotation" and status is "converted")
  const isLocked = savedDoc?.status === "paid" || (kind === "quotation" && savedDoc?.status === "converted");

  async function updateStatus(status: ExtendedStatus) {
    if (!savedDoc) return;
    const { error } = await supabase.from(table).update({ status: status as any }).eq("id", savedDoc.id);
    if (error) return toast.error(error.message);
    await logActivity(status === "validated" ? "validate" : status === "cancelled" ? "cancel" : "update", kind, savedDoc.id, { status });
    setSavedDoc({ ...savedDoc, status });
    setForm((f) => ({ ...f, status }));
    toast.success("Statut mis à jour");
  }

  async function downloadPdf() {
    if (!savedDoc) {
      toast.error("Enregistrez d'abord le document avant de télécharger le PDF");
      return;
    }
    if (!printRef.current) {
      toast.error("L'aperçu n'est pas encore prêt, réessayez dans un instant");
      return;
    }
    // printRef.current wraps page <div>s only once PaginatedInvoiceTemplate
    // has finished measuring row heights (see useRowHeights). If it's still
    // in its "measuring" phase, .children won't contain real page divs yet.
    if (printRef.current.children.length === 0) {
      toast.error("Le document est encore en cours de préparation, réessayez dans un instant");
      return;
    }
    setGeneratingPdf(true);
    try {
      const { generatePaginatedPdf } = await import("@/lib/exporttopdf");
      const prefix = kind === "quotation" ? "Devis" : "Facture";
      await generatePaginatedPdf(printRef.current, `${prefix}-${savedDoc.number}-${savedDoc.year}.pdf`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de la génération du PDF");
    } finally {
      setGeneratingPdf(false);
    }
  }

  if (settingsQ.isLoading || (documentId && existingQ.isLoading)) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {savedDoc ? `${kind === "quotation" ? "Devis" : "Facture"} N° ${savedDoc.number}-${savedDoc.year}` : `Nouveau ${kind === "quotation" ? "devis" : "facture"}`}
          </h1>
          {savedDoc && <div className="mt-1"><StatusBadge status={savedDoc.status as Status} /></div>}
        </div>
        <div className="flex flex-wrap gap-2">
          {savedDoc && (
            <>
              <Select value={savedDoc.status} onValueChange={(v) => updateStatus(v as ExtendedStatus)}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(EXTENDED_STATUS_LABELS).map(([v, label]) => (
                    <SelectItem key={v} value={v}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={downloadPdf} disabled={generatingPdf}>
                {generatingPdf ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Printer className="w-4 h-4 mr-2" />}
                Télécharger PDF
              </Button>
              {kind === "quotation" && (
                <Button variant="outline" onClick={convertToInvoice} disabled={busy || isLocked}>
                  <FileText className="w-4 h-4 mr-2" /> Convertir en facture
                </Button>
              )}
            </>
          )}
          <Button onClick={save} disabled={busy || isLocked}>
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Enregistrer
          </Button>
        </div>
      </div>

      {isLocked && (
        <div className="no-print rounded-md border border-success/30 bg-success/10 text-success px-4 py-3 text-sm">
          {savedDoc?.status === "paid" 
            ? `Cette ${kind === "quotation" ? "devis" : "facture"} est marquée <strong>Payée</strong> et est donc verrouillée : aucune modification n'est possible. Pour la déverrouiller, changez son statut ci-dessus.`
            : kind === "quotation" && savedDoc?.status === "converted" 
            ? "Ce devis a été <strong>converti en facture</strong> et est donc verrouillé : aucune modification n'est possible."
            : "Ce document est verrouillé et ne peut pas être modifié."}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3 no-print">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Informations</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" disabled={isLocked} value={form.document_date} onChange={(e) => setForm({ ...form, document_date: e.target.value })} />
              </div>
              {kind === "invoice" && (
                <div className="space-y-1.5">
                  <Label>N° Facture</Label>
                  <Input
                    type="number"
                    disabled={isLocked}
                    value={form.number}
                    onChange={(e) => setForm({ ...form, number: Number(e.target.value) })}
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Client *</Label>
                  <button type="button" className="text-xs text-gold hover:underline disabled:opacity-50 disabled:pointer-events-none"
                    disabled={isLocked}
                    onClick={() => setNewClientMode((v) => !v)}>
                    {newClientMode ? "Choisir un client existant" : "+ Nouveau client"}
                  </button>
                </div>
                {!newClientMode && (
                  <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })} disabled={isLocked}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner un client" /></SelectTrigger>
                    <SelectContent>
                      {(clientsQ.data ?? []).map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {newClientMode && (
                  <Input disabled={isLocked} placeholder="Nom de la société *" value={newClient.company_name}
                    onChange={(e) => setNewClient({ ...newClient, company_name: e.target.value })} />
                )}
              </div>
            </div>
            {newClientMode && (
              <div className="grid grid-cols-2 gap-4 rounded-md border border-dashed border-border p-3">
                <div className="space-y-1.5"><Label>Matricule fiscal *</Label>
                  <Input disabled={isLocked} value={newClient.matricule_fiscal} onChange={(e) => setNewClient({ ...newClient, matricule_fiscal: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Téléphone</Label>
                  <Input disabled={isLocked} value={newClient.telephone} onChange={(e) => setNewClient({ ...newClient, telephone: e.target.value })} /></div>
                <div className="space-y-1.5 col-span-2"><Label>Adresse *</Label>
                  <Input disabled={isLocked} value={newClient.address} onChange={(e) => setNewClient({ ...newClient, address: e.target.value })} /></div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Projet</Label>
                <Input disabled={isLocked} value={form.project_name} onChange={(e) => setForm({ ...form, project_name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Adresse du projet</Label>
                <Input disabled={isLocked} value={form.project_address} onChange={(e) => setForm({ ...form, project_address: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5"><Label>Notes internes</Label>
              <Textarea disabled={isLocked} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            {kind === "quotation" && (
              <div className="space-y-1.5"><Label>Conditions générales</Label>
                <Textarea disabled={isLocked} rows={2} value={form.conditions_generales} onChange={(e) => setForm({ ...form, conditions_generales: e.target.value })} /></div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Paramètres</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>TVA %</Label>
                <Input disabled={isLocked} type="number" step="0.01" value={form.vat_rate} onChange={(e) => setForm({ ...form, vat_rate: Number(e.target.value) })} /></div>
              <div className="space-y-1.5"><Label>Timbre fiscal</Label>
                <Input disabled={isLocked} type="number" step="0.001" value={form.fiscal_stamp} onChange={(e) => setForm({ ...form, fiscal_stamp: Number(e.target.value) })} /></div>
            </div>
            <div className="border-t border-border pt-3 space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Total HT</span><span className="font-medium">{formatTND(totals.subtotal_ht)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">TVA</span><span className="font-medium">{formatTND(totals.vat_amount)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Timbre</span><span className="font-medium">{formatTND(form.fiscal_stamp)}</span></div>
              <div className="flex justify-between border-t border-border pt-2 text-base"><span className="font-semibold">Total TTC</span><span className="font-bold">{formatTND(totals.total_ttc)}</span></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="no-print">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Lignes</CardTitle>
          <Button variant="outline" size="sm" onClick={addItem} disabled={isLocked}><Plus className="w-4 h-4 mr-1" /> Ajouter</Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b border-border">
                <tr>
                  <th className="text-left p-2">Description</th>
                  <th className="text-left p-2 w-24">Unité</th>
                  <th className="text-right p-2 w-24">Qté</th>
                  <th className="text-right p-2 w-32">P.U. HT</th>
                  <th className="text-right p-2 w-32">Total HT</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {form.items.map((it, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="p-2">
                      <Textarea
                        disabled={isLocked}
                        rows={2}
                        className="min-h-9 resize-y"
                        value={it.description}
                        onChange={(e) => updateItem(i, { description: e.target.value })}
                        placeholder="Description (Entrée = nouvelle ligne )"
                      />
                    </td>
                    <td className="p-2"><Input disabled={isLocked} value={it.unit ?? ""} onChange={(e) => updateItem(i, { unit: e.target.value })} /></td>
                    <td className="p-2"><Input disabled={isLocked} type="number" step="0.001" className="text-right" value={it.quantity} onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })} /></td>
                    <td className="p-2"><Input disabled={isLocked} type="number" step="0.001" className="text-right" value={it.unit_price_ht} onChange={(e) => updateItem(i, { unit_price_ht: Number(e.target.value) })} /></td>
                    <td className="p-2 text-right font-medium">{formatTND(it.total_ht)}</td>
                    <td className="p-2"><Button variant="ghost" size="icon" disabled={isLocked} onClick={() => removeItem(i)}><Trash2 className="w-4 h-4 text-destructive" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {renderPreview && savedDoc && settingsQ.data && !client && (
        <div className="mt-4 p-4 border-2 border-amber-500 bg-amber-50 text-amber-700 rounded-md no-print">
          Impossible de charger le client associé à ce document (client_id: {form.client_id || "vide"}).
          Vérifiez que le client existe toujours et que vous avez les droits pour le lire.
        </div>
      )}

      {/* Printable preview - only renders in browser after hydration */}
      {renderPreview && savedDoc && settingsQ.data && client && (
        <Suspense fallback={
          <div className="mt-6 p-8 text-center border rounded-md">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">Chargement de l'aperçu...</p>
          </div>
        }>
          <div className="mt-6 shadow-elev-2 rounded-md overflow-hidden border border-border print:mt-0 print:shadow-none print:border-0 print:rounded-none print:overflow-visible">
            <PaginatedInvoiceTemplate
              ref={printRef}
              kind={kind === "invoice" ? "FACTURE" : "DEVIS"}
              doc={{
                number: savedDoc.number, year: savedDoc.year,
                document_date: form.document_date,
                project_name: form.project_name || null, project_address: form.project_address || null,
                subtotal_ht: totals.subtotal_ht, vat_amount: totals.vat_amount,
                vat_rate: form.vat_rate, fiscal_stamp: form.fiscal_stamp, total_ttc: totals.total_ttc,
                conditions_generales: kind === "quotation" ? (form.conditions_generales || null) : null,
              }}
              client={{ company_name: client.company_name, address: client.address, telephone: client.telephone, matricule_fiscal: client.matricule_fiscal }}
              items={form.items}
              settings={settingsQ.data}
            />
          </div>
        </Suspense>
      )}
    </div>
  );
}

function round3(n: number) { return Math.round(n * 1000) / 1000; }