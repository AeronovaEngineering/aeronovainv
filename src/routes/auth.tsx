import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/lib/activity";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Shield, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false, // 🔹 Important : désactiver SSR pour cette page
  head: () => ({
    meta: [
      { title: "Connexion — AeroNova Engineering" },
      { name: "description", content: "Accédez à votre espace de gestion AeroNova." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);
  const [redirecting, setRedirecting] = useState(false);
  const lockTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 🔹 Vérifier la session au chargement - avec gestion d'erreur
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          const expiresAt = data.session.expires_at;
          if (expiresAt) {
            const now = Math.floor(Date.now() / 1000);
            if (now < expiresAt) {
              setRedirecting(true);
              await navigate({ to: "/dashboard", replace: true });
              return;
            }
          }
        }
      } catch (error) {
        console.error("Session check error:", error);
      }
    };
    checkSession();
  }, [navigate]);

  // 🔹 Timer pour le lock
  useEffect(() => {
    if (isLocked && lockTimer > 0) {
      const timer = setInterval(() => {
        setLockTimer(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
    if (lockTimer === 0 && isLocked) {
      setIsLocked(false);
      setLoginAttempts(0);
    }
  }, [isLocked, lockTimer]);

  // 🔹 Nettoyer le timeout
  useEffect(() => {
    return () => {
      if (lockTimeoutRef.current) {
        clearTimeout(lockTimeoutRef.current);
      }
    };
  }, []);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();

    if (isLocked) {
      toast.error(`Compte verrouillé pour ${lockTimer} secondes`);
      return;
    }

    setBusy(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email: email.trim(), 
        password 
      });

      if (error) {
        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);
        
        if (newAttempts >= 5) {
          setIsLocked(true);
          setLockTimer(60);
          toast.error("Trop de tentatives. Compte verrouillé pour 60 secondes.");
          await logActivity("login_failed", "auth", null, { 
            email, 
            attempts: newAttempts,
            locked: true 
          });
        } else {
          toast.error(`Identifiants invalides (${newAttempts}/5)`);
          await logActivity("login_failed", "auth", null, { 
            email, 
            attempts: newAttempts 
          });
        }
        setBusy(false);
        return;
      }

      // ✅ Connexion réussie
      if (data.session) {
        const expiresAt = data.session.expires_at;
        if (expiresAt) {
          const now = Math.floor(Date.now() / 1000);
          if (now >= expiresAt) {
            await supabase.auth.signOut();
            toast.error("Session expirée");
            setBusy(false);
            return;
          }
        }

        await logActivity("login", "auth", data.user?.id || null, { 
          email,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        });

        setLoginAttempts(0);
        toast.success("Connexion réussie");
        
        // 🔹 Forcer la redirection avec un petit délai pour s'assurer que la session est bien établie
        setRedirecting(true);
        setTimeout(async () => {
          await navigate({ to: "/dashboard", replace: true });
          setRedirecting(false);
        }, 300);
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Erreur de connexion");
      await logActivity("login_error", "auth", null, { 
        email, 
        error: String(error) 
      });
    } finally {
      setBusy(false);
    }
  }

  // 🔹 Afficher un état de redirection
  if (redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-gold" />
          <p className="mt-4 text-muted-foreground">Redirection en cours...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-gold flex items-center justify-center font-bold text-gold-foreground">A</div>
          <div>
            <div className="font-semibold text-lg tracking-tight">AeroNova</div>
            <div className="text-xs opacity-70 -mt-0.5">Engineering</div>
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2 text-gold mb-2">
            <Shield className="w-5 h-5" />
            <span className="text-sm font-medium">Connexion sécurisée</span>
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-white">
            Gestion financière<br />claire et professionnelle.
          </h1>
          <p className="mt-4 text-sm opacity-70 max-w-md">
            Clients, fournisseurs, devis, factures et tableau de bord — dans une plateforme unifiée conçue pour AeroNova Engineering.
          </p>
        </div>
        <div className="text-xs opacity-60">
          © {new Date().getFullYear()} AeroNova Engineering
        </div>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-12">
        <Card className="w-full max-w-md border-border shadow-elev-2">
          <CardHeader>
            <CardTitle className="text-2xl">Connexion</CardTitle>
            <CardDescription>Accédez à votre espace de gestion.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="si-email">Email</Label>
                <Input 
                  id="si-email" 
                  type="email" 
                  required 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  autoComplete="email"
                  disabled={isLocked}
                  className={isLocked ? "opacity-50" : ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="si-pwd">Mot de passe</Label>
                <Input 
                  id="si-pwd" 
                  type="password" 
                  required 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  autoComplete="current-password"
                  disabled={isLocked}
                  className={isLocked ? "opacity-50" : ""}
                />
              </div>

              {isLocked && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Compte verrouillé. Réessayez dans {lockTimer}s</span>
                </div>
              )}

              <Button 
                type="submit" 
                disabled={busy || isLocked} 
                className="w-full"
              >
                {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} 
                {isLocked ? `Verrouillé (${lockTimer}s)` : "Se connecter"}
              </Button>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>🔒 Connexion sécurisée</span>
                {loginAttempts > 0 && (
                  <span className="text-destructive">
                    Tentatives: {loginAttempts}/5
                  </span>
                )}
              </div>

              <p className="text-xs text-muted-foreground pt-2">
                Les comptes sont créés par un administrateur. Contactez-le si vous n'avez pas encore d'accès.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}