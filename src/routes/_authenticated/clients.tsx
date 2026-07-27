import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { PartyDialog, type PartyRow } from "@/components/PartyDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { logActivity } from "@/lib/activity";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/clients")({
  head: () => ({ meta: [{ title: "Clients — AeroNova" }] }),
  component: () => <PartyList entity="client" />,
});

export function PartyList({ entity }: { entity: "client" | "supplier" }) {
  const qc = useQueryClient();
  const table = entity === "client" ? "clients" : "suppliers";
  const [q, setQ] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PartyRow | null>(null);
  const [toDelete, setToDelete] = useState<PartyRow | null>(null);

  const query = useQuery({
    queryKey: [table],
    queryFn: async (): Promise<PartyRow[]> => {
      const { data, error } = await supabase.from(table).select("*").order("company_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = useMemo(() => {
    const list = query.data ?? [];
    if (!q.trim()) return list;
    const needle = q.toLowerCase();
    return list.filter((r) =>
      r.company_name.toLowerCase().includes(needle) ||
      (r.matricule_fiscal ?? "").toLowerCase().includes(needle) ||
      (r.email ?? "").toLowerCase().includes(needle),
    );
  }, [query.data, q]);

  async function confirmDelete() {
    if (!toDelete) return;
    const { error } = await supabase.from(table).delete().eq("id", toDelete.id);
    if (error) return toast.error(error.message);
    await logActivity("delete", entity, toDelete.id, { company_name: toDelete.company_name });
    toast.success("Supprimé");
    setToDelete(null);
    qc.invalidateQueries({ queryKey: [table] });
  }

  const title = entity === "client" ? "Clients" : "Fournisseurs";
  const singular = entity === "client" ? "client" : "fournisseur";

  return (
    <>
      <PageHeader
        title={title}
        description={`Gérez vos ${entity === "client" ? "clients" : "fournisseurs"}.`}
        actions={
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Nouveau {singular}
          </Button>
        }
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
                  <th className="text-left p-3">Société</th>
                  <th className="text-left p-3">Matricule fiscal</th>
                  <th className="text-left p-3">Téléphone</th>
                  <th className="text-left p-3">Email</th>
                  <th className="text-right p-3 w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {query.isLoading && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Chargement…</td></tr>}
                {!query.isLoading && rows.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Aucun résultat.</td></tr>}
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border hover:bg-surface-muted/50">
                    <td className="p-3 font-medium">{r.company_name}</td>
                    <td className="p-3 text-muted-foreground">{r.matricule_fiscal ?? "—"}</td>
                    <td className="p-3 text-muted-foreground">{r.telephone ?? "—"}</td>
                    <td className="p-3 text-muted-foreground">{r.email ?? "—"}</td>
                    <td className="p-3 text-right">
                      <Button variant="ghost" size="icon" onClick={() => { setEditing(r); setDialogOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setToDelete(r)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <PartyDialog entity={entity} open={dialogOpen} onOpenChange={setDialogOpen} initial={editing ?? undefined} onSaved={() => qc.invalidateQueries({ queryKey: [table] })} />

      <AlertDialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action supprime définitivement « {toDelete?.company_name} ». Seuls les administrateurs peuvent supprimer.</AlertDialogDescription>
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
