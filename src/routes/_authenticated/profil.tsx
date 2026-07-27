import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { logActivity } from "@/lib/activity";

export const Route = createFileRoute("/_authenticated/profil")({
  head: () => ({ meta: [{ title: "Mon profil — AeroNova" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [pwd, setPwd] = useState({ next: "", confirm: "" });
  const [savingPwd, setSavingPwd] = useState(false);

  const profileQ = useQuery({
    queryKey: ["my_profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => (await supabase.from("profiles").select("full_name,email").eq("id", user!.id).maybeSingle()).data,
  });

  useEffect(() => { if (profileQ.data?.full_name) setFullName(profileQ.data.full_name); }, [profileQ.data]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) return toast.error("Le nom est requis");
    setSavingProfile(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName.trim() }).eq("id", user!.id);
    setSavingProfile(false);
    if (error) return toast.error(error.message);
    await logActivity("update", "user", user!.id, { full_name: fullName });
    qc.invalidateQueries({ queryKey: ["my_profile"] });
    qc.invalidateQueries({ queryKey: ["users_list"] });
    toast.success("Profil mis à jour");
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pwd.next.length < 6) return toast.error("Le mot de passe doit contenir au moins 6 caractères");
    if (pwd.next !== pwd.confirm) return toast.error("Les mots de passe ne correspondent pas");
    setSavingPwd(true);
    const { error } = await supabase.auth.updateUser({ password: pwd.next });
    setSavingPwd(false);
    if (error) return toast.error(error.message);
    setPwd({ next: "", confirm: "" });
    toast.success("Mot de passe modifié");
  }

  return (
    <>
      <PageHeader title="Mon profil" description="Gérez vos informations personnelles et votre mot de passe." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Informations</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={saveProfile} className="space-y-4">
              <div className="space-y-1.5"><Label>Email</Label><Input value={profileQ.data?.email ?? user?.email ?? ""} disabled /></div>
              <div className="space-y-1.5"><Label>Nom complet</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
              <Button type="submit" disabled={savingProfile}>{savingProfile && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Enregistrer</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Changer le mot de passe</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={changePassword} className="space-y-4">
              <div className="space-y-1.5"><Label>Nouveau mot de passe</Label><Input type="password" minLength={6} value={pwd.next} onChange={(e) => setPwd((p) => ({ ...p, next: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Confirmer</Label><Input type="password" minLength={6} value={pwd.confirm} onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))} /></div>
              <Button type="submit" disabled={savingPwd}>{savingPwd && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Modifier le mot de passe</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
