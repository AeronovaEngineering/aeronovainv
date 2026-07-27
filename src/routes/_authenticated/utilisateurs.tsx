import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { useIsAdmin } from "@/hooks/use-role";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Lock, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createUser, setUserRole, deleteUser } from "@/lib/users.functions";
import { logActivity } from "@/lib/activity";
import type { AppRole } from "@/hooks/use-role";

export const Route = createFileRoute("/_authenticated/utilisateurs")({
  head: () => ({ meta: [{ title: "Utilisateurs — AeroNova" }] }),
  component: UsersPage,
});

type UserRow = { id: string; email: string | null; full_name: string | null; created_at: string; roles: AppRole[] };

function UsersPage() {
  const { isAdmin, isLoading } = useIsAdmin();
  const { user } = useAuth();
  const qc = useQueryClient();
  const createFn = useServerFn(createUser);
  const setRoleFn = useServerFn(setUserRole);
  const deleteFn = useServerFn(deleteUser);

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", full_name: "", role: "assistant" as AppRole });
  const [toDelete, setToDelete] = useState<UserRow | null>(null);

  const q = useQuery({
    queryKey: ["users_list"],
    enabled: isAdmin,
    queryFn: async (): Promise<UserRow[]> => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id,email,full_name,created_at").order("created_at"),
        supabase.from("user_roles").select("user_id,role"),
      ]);
      const roleMap = new Map<string, AppRole[]>();
      (roles ?? []).forEach((r) => { const arr = roleMap.get(r.user_id) ?? []; arr.push(r.role as AppRole); roleMap.set(r.user_id, arr); });
      return (profiles ?? []).map((p) => ({ ...p, roles: roleMap.get(p.id) ?? [] }));
    },
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await createFn({ data: form });
      await logActivity("create", "user", null, { email: form.email, role: form.role });
      toast.success("Utilisateur créé");
      setOpen(false);
      setForm({ email: "", password: "", full_name: "", role: "assistant" });
      qc.invalidateQueries({ queryKey: ["users_list"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(u: UserRow, role: AppRole) {
    try {
      await setRoleFn({ data: { user_id: u.id, role } });
      await logActivity("update", "role", u.id, { email: u.email, role });
      toast.success("Rôle mis à jour");
      qc.invalidateQueries({ queryKey: ["users_list"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    try {
      await deleteFn({ data: { user_id: toDelete.id } });
      await logActivity("delete", "user", toDelete.id, { email: toDelete.email });
      toast.success("Utilisateur supprimé");
      setToDelete(null);
      qc.invalidateQueries({ queryKey: ["users_list"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  if (isLoading) return <div className="p-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>;
  if (!isAdmin) return (<>
    <PageHeader title="Utilisateurs" />
    <Card><CardContent className="p-10 text-center">
      <Lock className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
      <p className="text-sm text-muted-foreground">Réservé aux administrateurs.</p>
    </CardContent></Card>
  </>);

  return (
    <>
      <PageHeader
        title="Utilisateurs"
        description="Créez et gérez les comptes ayant accès à la plateforme."
        actions={<Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" /> Nouvel utilisateur</Button>}
      />
      <Card><CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground bg-surface-muted">
              <tr><th className="text-left p-3">Nom</th><th className="text-left p-3">Email</th><th className="text-left p-3 w-48">Rôle</th><th className="text-right p-3 w-16">Actions</th></tr>
            </thead>
            <tbody>
              {q.isLoading && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Chargement…</td></tr>}
              {(q.data ?? []).map((u) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="p-3 font-medium">{u.full_name ?? "—"}{u.id === user?.id && <Badge variant="outline" className="ml-2">Vous</Badge>}</td>
                  <td className="p-3 text-muted-foreground">{u.email}</td>
                  <td className="p-3">
                    <Select value={u.roles[0] ?? "assistant"} onValueChange={(v) => changeRole(u, v as AppRole)} disabled={u.id === user?.id}>
                      <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="administrator">Administrateur</SelectItem>
                        <SelectItem value="assistant">Assistant</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-3 text-right">
                    <Button variant="ghost" size="icon" disabled={u.id === user?.id} onClick={() => setToDelete(u)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </td>
                </tr>
              ))}
              {q.data?.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Aucun utilisateur.</td></tr>}
            </tbody>
          </table>
        </div>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvel utilisateur</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2"><Label>Nom complet</Label><Input required value={form.full_name} onChange={(e)=>setForm(f=>({...f, full_name:e.target.value}))} /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" required value={form.email} onChange={(e)=>setForm(f=>({...f, email:e.target.value}))} /></div>
            <div className="space-y-2"><Label>Mot de passe (min. 6)</Label><Input type="password" minLength={6} required value={form.password} onChange={(e)=>setForm(f=>({...f, password:e.target.value}))} /></div>
            <div className="space-y-2"><Label>Rôle</Label>
              <Select value={form.role} onValueChange={(v)=>setForm(f=>({...f, role:v as AppRole}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="administrator">Administrateur</SelectItem>
                  <SelectItem value="assistant">Assistant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={()=>setOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={busy}>{busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Créer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(v)=>!v && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet utilisateur ?</AlertDialogTitle>
            <AlertDialogDescription>Le compte « {toDelete?.email} » sera supprimé définitivement.</AlertDialogDescription>
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
