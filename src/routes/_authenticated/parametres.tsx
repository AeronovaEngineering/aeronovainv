import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useIsAdmin } from "@/hooks/use-role";
import { toast } from "sonner";
import { logActivity } from "@/lib/activity";
import { Loader2, Lock } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Settings = Database["public"]["Tables"]["company_settings"]["Row"];

export const Route = createFileRoute("/_authenticated/parametres")({
  head: () => ({ meta: [{ title: "Paramètres société — AeroNova" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { isAdmin, isLoading: roleLoading } = useIsAdmin();
  const [form, setForm] = useState<Partial<Settings>>({});
  const [busy, setBusy] = useState(false);
  const q = useQuery({
    queryKey: ["company_settings"],
    queryFn: async () => (await supabase.from("company_settings").select("*").eq("id", 1).single()).data,
  });
  useEffect(() => { if (q.data) setForm(q.data); }, [q.data]);

  if (roleLoading || q.isLoading) return <div className="p-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>;
  if (!isAdmin) return (
    <>
      <PageHeader title="Paramètres société" />
      <Card><CardContent className="p-10 text-center">
        <Lock className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">Réservé aux administrateurs.</p>
      </CardContent></Card>
    </>
  );

  async function save() {
    setBusy(true);
    const { error } = await supabase.from("company_settings").update({
      company_name: form.company_name, address: form.address, phone: form.phone, email: form.email,
      matricule_fiscal: form.matricule_fiscal, rc: form.rc, ccb: form.ccb, footer_address: form.footer_address,
      default_vat_rate: form.default_vat_rate, fiscal_stamp: form.fiscal_stamp, logo_url: form.logo_url,
    }).eq("id", 1);
    setBusy(false);
    if (error) return toast.error(error.message);
    await logActivity("update", "settings", null);
    toast.success("Paramètres enregistrés");
  }
  const bind = (k: keyof Settings) => ({ value: (form[k] as string | number | null | undefined) ?? "", onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value }) });

  return (
    <>
      <PageHeader title="Paramètres société" description="Informations affichées sur les documents." actions={<Button onClick={save} disabled={busy}>{busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Enregistrer</Button>} />
      <Card><CardContent className="p-6 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5"><Label>Nom société</Label><Input {...bind("company_name")} /></div>
          <div className="space-y-1.5"><Label>Matricule fiscal</Label><Input {...bind("matricule_fiscal")} /></div>
          <div className="space-y-1.5"><Label>Adresse (en-tête)</Label><Input {...bind("address")} /></div>
          <div className="space-y-1.5"><Label>Téléphone</Label><Input {...bind("phone")} /></div>
          <div className="space-y-1.5"><Label>Email</Label><Input {...bind("email")} /></div>
          <div className="space-y-1.5"><Label>R.C</Label><Input {...bind("rc")} /></div>
          <div className="space-y-1.5 md:col-span-2"><Label>C.C.B (compte bancaire)</Label><Textarea rows={2} {...bind("ccb")} /></div>
          <div className="space-y-1.5 md:col-span-2"><Label>Adresse pied de page</Label><Textarea rows={2} {...bind("footer_address")} /></div>
          <div className="space-y-1.5"><Label>TVA par défaut (%)</Label><Input type="number" step="0.01" {...bind("default_vat_rate")} /></div>
          <div className="space-y-1.5"><Label>Timbre fiscal (DT)</Label><Input type="number" step="0.001" {...bind("fiscal_stamp")} /></div>
          <div className="space-y-1.5 md:col-span-2"><Label>URL du logo (optionnel)</Label><Input {...bind("logo_url")} placeholder="https://…" /></div>
        </div>
      </CardContent></Card>
    </>
  );
}
