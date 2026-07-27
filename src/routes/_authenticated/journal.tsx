import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";

const ACTION_LABELS: Record<string, string> = {
  login: "Connexion", logout: "Déconnexion", signup: "Inscription",
  create: "Création", update: "Modification", delete: "Suppression",
  validate: "Validation", cancel: "Annulation", convert: "Conversion", payment: "Paiement",
};

export const Route = createFileRoute("/_authenticated/journal")({
  head: () => ({ meta: [{ title: "Journal d'activité — AeroNova" }] }),
  component: LogsPage,
});

function LogsPage() {
  const q = useQuery({
    queryKey: ["activity_logs"],
    queryFn: async () => (await supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(200)).data ?? [],
  });
  return (
    <>
      <PageHeader title="Journal d'activité" description="Historique des actions (200 dernières)." />
      <Card><CardContent className="p-0">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground bg-surface-muted">
            <tr><th className="text-left p-3">Date</th><th className="text-left p-3">Utilisateur</th><th className="text-left p-3">Action</th><th className="text-left p-3">Entité</th><th className="text-left p-3">Détails</th></tr>
          </thead>
          <tbody>
            {(q.data ?? []).map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="p-3 whitespace-nowrap text-muted-foreground">{formatDateTime(r.created_at)}</td>
                <td className="p-3">{r.user_email ?? "—"}</td>
                <td className="p-3"><Badge variant="outline">{ACTION_LABELS[r.action] ?? r.action}</Badge></td>
                <td className="p-3 text-muted-foreground">{r.entity_type ?? "—"}</td>
                <td className="p-3 text-muted-foreground">{r.details ? JSON.stringify(r.details) : "—"}</td>
              </tr>
            ))}
            {q.data?.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Aucun événement.</td></tr>}
          </tbody>
        </table>
      </CardContent></Card>
    </>
  );
}
