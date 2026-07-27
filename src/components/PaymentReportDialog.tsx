import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Download, Loader2 } from "lucide-react";
import { PaymentReportTemplate, type PaymentRow } from "@/components/PaymentReportTemplate";
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

function getMethodLabel(method: string): string {
  const map: Record<string, string> = {
    virement: "Virement",
    cheque: "Chèque",
    especes: "Espèces",
    carte: "Carte bancaire",
    traite: "Traite",
  };
  return map[method] || method;
}

type ReportData = {
  settings: NonNullable<ReturnType<typeof useCompanySettings>["data"]>;
  periodLabel: string;
  payments: PaymentRow[];
  totalEncaisse: number;
  totalDepenses: number;
  totalAchats: number;
  solde: number;
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

export function PaymentReportDialog() {
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
        await exportReportToPdf(reportRef.current, `rapport-paiements-${reportData.periodLabel}.pdf`);
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
      const [paymentsRes, expensesRes, purchasesRes] = await Promise.all([
        supabase
          .from("payments")
          .select(`
            id,
            payment_date,
            amount,
            method,
            invoices (
              number,
              year,
              document_date,
              clients (
                company_name
              )
            )
          `)
          .gte("payment_date", from)
          .lte("payment_date", to),
        supabase
          .from("expenses")
          .select("amount_ttc")
          .gte("expense_date", from)
          .lte("expense_date", to),
        supabase
          .from("purchase_invoices")
          .select("total_ttc")
          .gte("invoice_date", from)
          .lte("invoice_date", to)
          .neq("status", "cancelled"),
      ]);

      if (paymentsRes.error) throw paymentsRes.error;
      if (expensesRes.error) throw expensesRes.error;
      if (purchasesRes.error) throw purchasesRes.error;

      // Map payments
      const paymentRows: PaymentRow[] = (paymentsRes.data ?? []).map((p) => ({
        id: p.id,
        invoiceRef: p.invoices ? `${p.invoices.number}-${p.invoices.year}` : "—",
        invoiceDate: p.invoices?.document_date || "",
        clientName: p.invoices?.clients?.company_name || "—",
        paymentDate: p.payment_date,
        method: getMethodLabel(p.method),
        amount: Number(p.amount),
      }));

      // Sum totals
      const totalEncaisse = (paymentsRes.data ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
      const totalDepenses = (expensesRes.data ?? []).reduce((sum, e) => sum + Number(e.amount_ttc), 0);
      const totalAchats = (purchasesRes.data ?? []).reduce((sum, p) => sum + Number(p.total_ttc), 0);
      const solde = totalEncaisse - (totalDepenses + totalAchats);

      setReportData({
        settings: settingsQ.data,
        periodLabel: formatPeriodLabel(from, to),
        payments: paymentRows,
        totalEncaisse,
        totalDepenses,
        totalAchats,
        solde,
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
            <Button variant="outline" className="gap-2">
                <Download className="w-4 h-4" /> Rapport de paiements
            </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rapport de paiements</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="payment-from">Du</Label>
              <Input id="payment-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="payment-to">Au</Label>
              <Input id="payment-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
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
          <PaymentReportTemplate ref={reportRef} {...reportData} />
        </div>
      )}
    </>
  );
}