import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated")({
  ssr: false, // 🔹 Important : désactiver SSR pour les routes protégées
  // Required alongside ssr:false: without a pendingComponent, the server sends
  // an empty slot and the client mounts a full subtree into it, which React
  // can't reconcile and throws hydration error #418.
  pendingComponent: () => (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
    </div>
  ),
  beforeLoad: async ({ location }) => {
    try {
      // 🔹 Vérifier la session avec getSession (plus fiable que getUser pour la redirection)
      const { data, error } = await supabase.auth.getSession();
      
      if (error || !data.session) {
        console.log("No session, redirecting to auth");
        throw redirect({ 
          to: "/auth",
          search: { 
            redirect: location.pathname 
          }
        });
      }

      // 🔹 Vérifier l'expiration
      const expiresAt = data.session.expires_at;
      if (expiresAt) {
        const now = Math.floor(Date.now() / 1000);
        if (now >= expiresAt) {
          console.log("Session expired, redirecting to auth");
          await supabase.auth.signOut();
          throw redirect({ to: "/auth" });
        }
      }

      // 🔹 Récupérer l'utilisateur pour le contexte
      const { data: userData } = await supabase.auth.getUser();
      
      return { user: userData.user };

    } catch (error) {
      // 🔹 Si c'est déjà une redirection, la propager
      if (error && typeof error === 'object' && 'to' in error) {
        throw error;
      }
      console.error("Auth error:", error);
      throw redirect({ to: "/auth" });
    }
  },
  component: LayoutComponent,
  errorComponent: ({ error }) => {
    console.error("Auth error:", error);
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive">Erreur d'authentification</h1>
          <p className="mt-2 text-muted-foreground">
            Veuillez vous reconnecter
          </p>
          <button 
            onClick={() => window.location.href = "/auth"}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md"
          >
            Se reconnecter
          </button>
        </div>
      </div>
    );
  }
});

function LayoutComponent() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}