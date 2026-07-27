import { Link, useLocation, useNavigate, useRouter } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-role";
import { useQueryClient } from "@tanstack/react-query";
import { logActivity } from "@/lib/activity";
import { toast } from "sonner";
import {
  LayoutDashboard, Users, Truck, FileText, ReceiptText,
  Wallet, CreditCard, Percent, ShoppingCart, Settings, ScrollText,
  UserCog, LogOut, Menu, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }>; adminOnly?: boolean; section?: string };

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard, section: "Vue" },
  { to: "/clients", label: "Clients", icon: Users, section: "Répertoires" },
  { to: "/fournisseurs", label: "Fournisseurs", icon: Truck, section: "Répertoires" },
  { to: "/devis", label: "Devis", icon: FileText, section: "Ventes" },
  { to: "/factures", label: "Factures", icon: ReceiptText, section: "Ventes" },
  { to: "/achats", label: "Factures d'achat", icon: ShoppingCart, section: "Achats" },
  { to: "/depenses", label: "Dépenses", icon: Wallet, section: "Achats" },
  { to: "/paiements", label: "Paiements", icon: CreditCard, section: "Trésorerie" },
  { to: "/retenues", label: "Retenue à la source", icon: Percent, section: "Trésorerie" },
  { to: "/utilisateurs", label: "Utilisateurs", icon: UserCog, section: "Administration", adminOnly: true },
  { to: "/parametres", label: "Paramètres société", icon: Settings, section: "Administration", adminOnly: true },
  { to: "/journal", label: "Journal d'activité", icon: ScrollText, section: "Administration", adminOnly: true },
  { to: "/profil", label: "Mon profil", icon: UserCog, section: "Mon compte" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const location = useLocation();
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  const visible = NAV.filter((n) => !n.adminOnly || isAdmin);
  const grouped = visible.reduce<Record<string, NavItem[]>>((acc, n) => {
    const s = n.section ?? "";
    (acc[s] ||= []).push(n);
    return acc;
  }, {});

  async function handleSignOut() {
    await logActivity("logout", "auth", null);
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("Déconnecté");
    navigate({ to: "/auth", replace: true });
    router.invalidate();
  }

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
        <div className="w-9 h-9 rounded-md bg-gold flex items-center justify-center font-bold text-gold-foreground shrink-0">A</div>
        <div className="min-w-0">
          <div className="font-semibold text-sm tracking-tight text-white truncate">AeroNova</div>
          <div className="text-[11px] opacity-60 -mt-0.5">Engineering</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {Object.entries(grouped).map(([section, items]) => (
          <div key={section}>
            <div className="px-2 mb-2 text-[10px] uppercase tracking-wider text-sidebar-foreground/50 font-medium">{section}</div>
            <div className="space-y-0.5">
              {items.map((item) => {
                const active = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors ${
                      active ? "bg-sidebar-accent text-white" : "text-sidebar-foreground/80 hover:text-white hover:bg-sidebar-accent/60"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <div className="px-2 py-2 mb-2">
          <div className="text-xs text-white truncate">{user?.email}</div>
          <div className="text-[11px] opacity-60 mt-0.5">{isAdmin ? "Administrateur" : "Assistant"}</div>
        </div>
        <Button
          variant="ghost"
          onClick={handleSignOut}
          className="w-full justify-start text-sidebar-foreground/80 hover:text-white hover:bg-sidebar-accent"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Se déconnecter
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background" data-app-chrome>
      {/* Desktop sidebar */}
      <aside data-app-sidebar className="hidden lg:flex fixed inset-y-0 left-0 w-60 bg-sidebar text-sidebar-foreground border-r border-sidebar-border z-30">
        {sidebarContent}
      </aside>

      {/* Mobile top bar */}
      <header data-app-header className="lg:hidden sticky top-0 z-20 flex items-center justify-between px-4 h-14 bg-surface border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-gold flex items-center justify-center font-bold text-gold-foreground text-xs">A</div>
          <span className="font-semibold text-sm">AeroNova</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setMobileOpen((v) => !v)}>
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </header>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setMobileOpen(false)}>
          <aside className="absolute inset-y-0 left-0 w-72 bg-sidebar text-sidebar-foreground" onClick={(e) => e.stopPropagation()}>
            {sidebarContent}
          </aside>
        </div>
      )}

      <main className="lg:pl-60">
        <div className="max-w-[1400px] mx-auto p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
