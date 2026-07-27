import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { exportReportToPdf } from "@/lib/exporttopdf";
import { ListPrintTemplate } from "@/components/ListPrintTemplate";
import { formatDate, formatTND } from "@/lib/format";
import type { Database } from "@/integrations/supabase/types";

type Settings = Database["public"]["Tables"]["company_settings"]["Row"];

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

type PurchaseReportData = {
  settings: Settings;
  periodLabel: string;
  rows: {
    date: string;
    num: string;
    supplier: string;
    ht: string;
    vat: string;
    ttc: string;
    wh: string;
    net: string;
    status: string;
  }[];
  totalNet: string;
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

const STATUS_LABEL: Record<string, string> = {
  draft: "Brouillon",
  validated: "Validé",
  partially_paid: "Payé partiellement",
  paid: "Payé",
  cancelled: "Annulé",
};

export function PurchaseReportDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const defaults = monthBounds();
  const [from, setFrom] = useState(defaults.start);
  const [to, setTo] = useState(defaults.end);
  const [reportData, setReportData] = useState<PurchaseReportData | null>(null);
  const settingsQ = useCompanySettings();
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!reportData || !reportRef.current) return;

    let cancelled = false;
    setExporting(true);

    const timer = window.setTimeout(async () => {
      if (cancelled || !reportRef.current) return;
      try {
        await exportReportToPdf(reportRef.current, `rapport-achats-${reportData.periodLabel}.pdf`);
        toast.success("PDF généré avec succès");
      } catch (e) {
        console.error(e);
        toast.error("Erreur lors de l'export du PDF.");
      } finally {
        if (!cancelled) {
          setExporting(false);
          setReportData(null);
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
      toast.error("Paramètres de l'entreprise introuvables.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("purchase_invoices")
        .select("*,suppliers(company_name)")
        .gte("invoice_date", from)
        .lte("invoice_date", to)
        .neq("status", "cancelled")
        .order("invoice_date", { ascending: true });

      if (error) throw error;

      const rows = (data ?? []).map((p) => ({
        date: formatDate(p.invoice_date),
        num: p.supplier_invoice_number ?? "—",
        supplier: p.suppliers?.company_name ?? "—",
        ht: formatTND(p.subtotal_ht),
        vat: formatTND(p.vat_amount),
        ttc: formatTND(p.total_ttc),
        wh: Number(p.withholding_amount) > 0 ? formatTND(p.withholding_amount) : "—",
        net: formatTND(p.net_payable),
        status: STATUS_LABEL[p.status] || p.status,
      }));

      const totalNet = formatTND(
        (data ?? []).reduce((sum, p) => sum + Number(p.net_payable), 0)
      );

      setReportData({
        settings: settingsQ.data,
        periodLabel: formatPeriodLabel(from, to),
        rows,
        totalNet,
      });
      setOpen(false);
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la génération du rapport.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" /> Rapport d'achats
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rapport d'achats</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="purchase-from">Du</Label>
              <Input id="purchase-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="purchase-to">Au</Label>
              <Input id="purchase-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={handleGenerate} disabled={loading || exporting} className="gap-2">
              {(loading || exporting) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {loading ? "Génération..." : exporting ? "Export..." : "Générer le PDF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {reportData && (
        <div ref={reportRef} style={{ position: "fixed", top: -99999, left: -99999, zIndex: -1 }}>
          <ListPrintTemplate
            title="FACTURES D'ACHAT"
            subtitle={`Période du ${formatDate(from)} au ${formatDate(to)}`}
            settings={reportData.settings}
            columns={[
              { key: "date", label: "Date", width: "10%" },
              { key: "num", label: "N° facture", width: "12%" },
              { key: "supplier", label: "Fournisseur", width: "18%" },
              { key: "ht", label: "HT", align: "right", width: "11%" },
              { key: "vat", label: "TVA", align: "right", width: "11%" },
              { key: "ttc", label: "TTC", align: "right", width: "12%" },
              { key: "wh", label: "Retenue", align: "right", width: "10%" },
              { key: "net", label: "Net à payer", align: "right", width: "12%" },
              { key: "status", label: "Statut", width: "10%" },
            ]}
            rows={reportData.rows}
            totalLabel="Total net à payer"
            totalValue={reportData.totalNet}
          />
        </div>
      )}
    </>
  );
}