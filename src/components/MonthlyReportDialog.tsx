import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Download, Loader2 } from "lucide-react";
import { MonthlyReportTemplate, type ReportRow } from "@/components/MonthlyReportTemplate"
import { exportReportToPdf } from "@/lib/exporttopdf";

function monthBounds(d = new Date()) {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const iso = (x: Date) => x.toISOString().slice(0, 10);
  return { start: iso(start), end: iso(end) };
}

function formatPeriodLabel(from: string, to: string) {
  const fmt = (s: string) => new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const sameMonth = from.slice(0, 7) === to.slice(0, 7);
  if (sameMonth) {
    return new Date(from).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  }
  return `${fmt(from)} — ${fmt(to)}`;
}

type ReportData = {
  settings: NonNullable<ReturnType<typeof useCompanySettings>["data"]>;
  periodLabel: string;
  sales: ReportRow[];
  purchases: ReportRow[];
  expenses: ReportRow[];
  totalEncaisse: number;
};

function useCompanySettings() {
  return useQuery({
    queryKey: ["company_settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("company_settings").select("*").single();
      if (error) throw error;
      return data;
    },
  });
}

export function MonthlyReportDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const defaults = monthBounds();
  const [from, setFrom] = useState(defaults.start);
  const [to, setTo] = useState(defaults.end);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const settingsQ = useCompanySettings();
  const reportRef = useRef<HTMLDivElement>(null);

  // Once the off-screen report is mounted with fresh data, capture it to a
  // PDF and trigger a download — no browser print dialog, no page bleed-in.
  useEffect(() => {
    if (!reportData) return;

    let cancelled = false;
    setExporting(true);

    const timer = window.setTimeout(async () => {
      if (cancelled || !reportRef.current) return;
      try {
        await exportReportToPdf(reportRef.current, `rapport-${reportData.periodLabel}.pdf`);
      } catch (e) {
        console.error(e);
        alert("Erreur lors de l'export du PDF.");
      } finally {
        if (!cancelled) {
          setExporting(false);
          setReportData(null); // unmount the off-screen report, we're done with it
        }
      }
    }, 150);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [reportData]);

  async function handleGenerate() {
    if (!settingsQ.data) {
      alert("Paramètres de l'entreprise introuvables.");
      return;
    }
    setLoading(true);
    try {
      const [salesRes, purchasesRes, expensesRes] = await Promise.all([
        supabase
          .from("invoices")
          .select("id,number,year,document_date,total_ttc,paid_amount,status,client:clients(company_name)")
          .gte("document_date", from).lte("document_date", to).neq("status", "cancelled"),
        supabase
          .from("purchase_invoices")
          .select("id,supplier_invoice_number,invoice_date,total_ttc,status,suppliers(company_name)")
          .gte("invoice_date", from).lte("invoice_date", to).neq("status", "cancelled"),
        supabase
          .from("expenses")
          .select("id,description,category,expense_date,amount_ttc")
          .gte("expense_date", from).lte("expense_date", to),
      ]);
      if (salesRes.error) throw salesRes.error;
      if (purchasesRes.error) throw purchasesRes.error;
      if (expensesRes.error) throw expensesRes.error;

      const salesRows = salesRes.data ?? [];
      const sales: ReportRow[] = salesRows.map((r) => ({
        id: r.id,
        date: r.document_date,
        label: r.client?.company_name ?? "—",
        reference: `${r.number}-${r.year}`,
        amount: Number(r.total_ttc),
      }));
      const totalEncaisse = salesRows.reduce((s, r) => s + Number(r.paid_amount), 0);

      const purchases: ReportRow[] = (purchasesRes.data ?? []).map((r) => ({
        id: r.id,
        date: r.invoice_date,
        label: r.suppliers?.company_name ?? "—",
        reference: r.supplier_invoice_number ?? "—",
        amount: Number(r.total_ttc),
      }));

      const expenses: ReportRow[] = (expensesRes.data ?? []).map((r) => ({
        id: r.id,
        date: r.expense_date,
        label: r.description ?? "—",
        reference: r.category ?? "—",
        amount: Number(r.amount_ttc),
      }));

      setReportData({
        settings: settingsQ.data,
        periodLabel: formatPeriodLabel(from, to),
        sales, purchases, expenses, totalEncaisse,
      });
      setOpen(false);
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la génération du rapport.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" /> Exporter le rapport
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rapport financier</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="report-from">Du</Label>
              <Input id="report-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="report-to">Au</Label>
              <Input id="report-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={handleGenerate} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {loading ? "Génération..." : "Générer le PDF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Off-screen report — never visible, only used as a source for the
          canvas capture in exportReportToPdf. Not printed, not shown. */}
      {reportData && (
        <div style={{ position: "fixed", top: -99999, left: -99999, zIndex: -1 }}>
          <MonthlyReportTemplate ref={reportRef} {...reportData} />
        </div>
      )}
    </>
  );
}