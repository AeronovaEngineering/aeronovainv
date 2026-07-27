import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { formatDate, formatTND, formatDocNumber } from "@/lib/format";
import { StatusBadge, type Status } from "@/components/StatusBadge";

type DocKind = "quotation" | "invoice";
type Row = { id: string; number: number; year: number; document_date: string; total_ttc: number; status: Status; client: { company_name: string } | null };

export const Route = createFileRoute("/_authenticated/devis/")({
  head: () => ({ meta: [{ title: "Devis — AeroNova" }] }),
  component: () => <DocList kind="quotation" />,
});

export function DocList({ kind }: { kind: DocKind }) {
  const table = kind === "quotation" ? "quotations" : "invoices";
  const [q, setQ] = useState("");
  const query = useQuery({
    queryKey: [table],
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase.from(table)
        .select("id,number,year,document_date,total_ttc,status,client:clients(company_name)")
        .order("year", { ascending: false }).order("number", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });
  const rows = useMemo(() => {
    const list = query.data ?? [];
    if (!q.trim()) return list;
    const needle = q.toLowerCase();
    return list.filter((r) =>
      `${r.number}-${r.year}`.includes(needle) ||
      (r.client?.company_name ?? "").toLowerCase().includes(needle),
    );
  }, [query.data, q]);
  const title = kind === "quotation" ? "Devis" : "Factures";
  const path = kind === "quotation" ? "/devis" : "/factures";
  return (
    <>
      <PageHeader
        title={title}
        description={kind === "quotation" ? "Devis émis, en attente ou convertis." : "Factures et suivi de règlement."}
        actions={<Link to={`${path}/nouveau` as string}><Button><Plus className="w-4 h-4 mr-2" /> Nouveau {kind === "quotation" ? "devis" : "facture"}</Button></Link>}
      />
      <Card>
        <CardContent className="p-0">
          <div className="p-3 border-b border-border">
            <div className="relative max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" className="pl-9" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground bg-surface-muted">
                <tr>
                  <th className="text-left p-3">N°</th>
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">Client</th>
                  <th className="text-right p-3">Total TTC</th>
                  <th className="text-left p-3">Statut</th>
                </tr>
              </thead>
              <tbody>
                {query.isLoading && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Chargement…</td></tr>}
                {!query.isLoading && rows.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Aucun document.</td></tr>}
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border hover:bg-surface-muted/50">
                    <td className="p-3 font-medium">
                      <Link to={kind === "quotation" ? "/devis/$id" : "/factures/$id"} params={{ id: r.id }} className="hover:underline">
                        {formatDocNumber(r.number, r.year)}
                      </Link>
                    </td>
                    <td className="p-3">{formatDate(r.document_date)}</td>
                    <td className="p-3">{r.client?.company_name ?? "—"}</td>
                    <td className="p-3 text-right font-medium">{formatTND(r.total_ttc)}</td>
                    <td className="p-3"><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
