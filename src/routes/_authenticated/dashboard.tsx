import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { formatTND, formatDate } from "@/lib/format";
import { Users, Truck, FileText, ReceiptText, TrendingUp, TrendingDown, Wallet, CircleDollarSign, ShoppingCart } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Link } from "@tanstack/react-router";
import { MonthlyReportDialog } from "@/components/MonthlyReportDialog";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Tableau de bord — AeroNova" }] }),
  component: Dashboard,
});

function Dashboard() {
  const q = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [invs, clients, suppliers, quotes, recent, expenses, purchaseInvs] = await Promise.all([
        supabase.from("invoices").select("total_ttc,paid_amount,status,year,document_date"),
        supabase.from("clients").select("id", { count: "exact", head: true }),
        supabase.from("suppliers").select("id", { count: "exact", head: true }),
        supabase.from("quotations").select("id", { count: "exact", head: true }),
        supabase.from("invoices").select("id,number,year,total_ttc,status,paid_amount,document_date,client:clients(company_name)").order("created_at", { ascending: false }).limit(6),
        supabase.from("expenses").select("amount_ttc"),
        supabase.from("purchase_invoices").select("total_ttc,status"),
      ]);
      
      const rows = invs.data ?? [];
      
      // Chiffre d'affaires = total des factures (non annulées)
      const revenue = rows
        .filter(r => r.status !== "cancelled")
        .reduce((s, r) => s + Number(r.total_ttc), 0);
      
      // Encaissé = somme des paid_amount (ce qui a vraiment été payé)
      const paid = rows
        .filter(r => r.status !== "cancelled")
        .reduce((s, r) => s + Number(r.paid_amount), 0);
      
      // Outstanding = factures impayées (total - paid)
      const outstanding = revenue - paid;
      
      // Dépenses
      const totalExpenses = (expenses.data ?? [])
        .reduce((s, e) => s + Number(e.amount_ttc), 0);
      
      // Factures d'achat (non annulées)
      const purchasesTotal = (purchaseInvs.data ?? [])
        .filter((r) => r.status !== "cancelled")
        .reduce((s, r) => s + Number(r.total_ttc), 0);
      
      // Trésorerie nette = encaissé - dépenses - achats
      const netCash = paid - totalExpenses - purchasesTotal;
      
      return {
        revenue, 
        paid, 
        outstanding, 
        totalExpenses, 
        purchasesTotal, 
        netCash,
        clientsCount: clients.count ?? 0,
        suppliersCount: suppliers.count ?? 0,
        quotesCount: quotes.count ?? 0,
        invoicesCount: rows.length,
        recent: recent.data ?? [],
      };
    },
  });

  const d = q.data;
  
  return (
    <>
      <PageHeader title="Tableau de bord" description="Vue d'ensemble de l'activité financière." />
      
      {/* Row 1: Revenue indicators */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi 
          icon={CircleDollarSign} 
          label="Chiffre d'affaires" 
          value={formatTND(d?.revenue)} 
          tone="info" 
          subtitle={`${d?.invoicesCount || 0} factures`}
        />
        <Kpi 
          icon={TrendingUp} 
          label="Encaissé" 
          value={formatTND(d?.paid)} 
          tone="success" 
          subtitle={`${d?.revenue ? ((d.paid / d.revenue) * 100).toFixed(1) : 0}% de recouvrement`}
        />
        <Kpi 
          icon={ReceiptText} 
          label="Impayé" 
          value={formatTND(d?.outstanding)} 
          tone="warning"
        />
        <Kpi 
          icon={TrendingDown} 
          label="Charges totales" 
          value={formatTND((d?.totalExpenses || 0) + (d?.purchasesTotal || 0))} 
          tone="warning"
          subtitle={`Achats: ${formatTND(d?.purchasesTotal || 0)} · Dépenses: ${formatTND(d?.totalExpenses || 0)}`}
        />
      </div>

      {/* Row 2: Operational metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-4">
        <Kpi 
          icon={Wallet} 
          label="Trésorerie nette" 
          value={formatTND(d?.netCash)} 
          tone={d?.netCash && d.netCash >= 0 ? "success" : "warning"}
        />
        <Kpi 
          icon={Users} 
          label="Clients" 
          value={String(d?.clientsCount ?? 0)} 
        />
        <Kpi 
          icon={Truck} 
          label="Fournisseurs" 
          value={String(d?.suppliersCount ?? 0)} 
        />
        <Kpi 
          icon={FileText} 
          label="Devis" 
          value={String(d?.quotesCount ?? 0)} 
        />
      </div>

      {/* Recent Invoices */}
      <Card className="mt-8">
        <CardContent className="p-0">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <span className="font-medium">Factures récentes</span>
            <MonthlyReportDialog />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground bg-surface-muted">
                <tr>
                  <th className="text-left p-3">N°</th>
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">Client</th>
                  <th className="text-right p-3">Montant TTC</th>
                  <th className="text-right p-3">Payé</th>
                  <th className="text-left p-3">Statut</th>
                </tr>
              </thead>
              <tbody>
                {(d?.recent ?? []).map((r: {
                  id: string; 
                  number: number; 
                  year: number; 
                  document_date: string; 
                  total_ttc: number;
                  paid_amount: number;
                  status: import("@/components/StatusBadge").Status; 
                  client: { company_name: string } | null
                }) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="p-3 font-medium">
                      <Link to="/factures/$id" params={{ id: r.id }} className="hover:underline">
                        {r.number}-{r.year}
                      </Link>
                    </td>
                    <td className="p-3">{formatDate(r.document_date)}</td>
                    <td className="p-3">{r.client?.company_name ?? "—"}</td>
                    <td className="p-3 text-right font-medium">{formatTND(r.total_ttc)}</td>
                    <td className="p-3 text-right">{formatTND(r.paid_amount || 0)}</td>
                    <td className="p-3"><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
                {d?.recent.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      Aucune facture pour le moment.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

// Enhanced KPI component with optional subtitle
function Kpi({ 
  icon: Icon, 
  label, 
  value, 
  tone, 
  subtitle 
}: { 
  icon: React.ComponentType<{ className?: string }>; 
  label: string; 
  value: string; 
  tone?: "success" | "warning" | "info";
  subtitle?: string;
}) {
  const toneClass = 
    tone === "success" ? "bg-success/10 text-success" : 
    tone === "warning" ? "bg-warning/15 text-warning-foreground" : 
    tone === "info" ? "bg-info/10 text-info" : 
    "bg-muted text-muted-foreground";
    
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              {label}
            </div>
            {subtitle && (
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {subtitle}
              </div>
            )}
          </div>
          <div className={`w-9 h-9 rounded-md flex items-center justify-center ${toneClass}`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
      </CardContent>
    </Card>
  );
}