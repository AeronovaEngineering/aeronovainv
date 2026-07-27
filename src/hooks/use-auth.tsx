import { useEffect, useState, useCallback, useRef } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const isMounted = useRef(true);
  const isLoggingOut = useRef(false);

  // 🔹 Vérifier si la session est expirée
  const checkSessionExpiry = useCallback((session: Session | null) => {
    if (!session) return true;
    const expiresAt = session.expires_at;
    if (!expiresAt) return false;
    const now = Math.floor(Date.now() / 1000);
    return now >= expiresAt;
  }, []);

  // 🔹 Déconnexion sécurisée
  const logout = useCallback(async (redirectTo = "/auth") => {
    if (isLoggingOut.current) return;
    isLoggingOut.current = true;
    
    try {
      if (typeof window !== 'undefined') {
        const keys = Object.keys(sessionStorage);
        keys.forEach(key => {
          if (key.startsWith('sb-')) {
            sessionStorage.removeItem(key);
          }
        });
      }

      await supabase.auth.signOut();
      
      if (isMounted.current) {
        setSession(null);
        setUser(null);
        navigate({ to: redirectTo, replace: true });
      }
    } catch (error) {
      console.error("Logout error:", error);
      if (isMounted.current) {
        navigate({ to: redirectTo, replace: true });
      }
    } finally {
      isLoggingOut.current = false;
    }
  }, [navigate]);

  useEffect(() => {
    isMounted.current = true;
    
    console.log('[useAuth] Initialisation');
    
    // 🔹 S'abonner aux changements d'auth
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, s) => {
      console.log('[useAuth] Event:', event);
      
      if (!isMounted.current) return;
      
      if (event === "SIGNED_OUT") {
        setSession(null);
        setUser(null);
        return;
      }

      if (s) {
        const expired = checkSessionExpiry(s);
        if (expired) {
          await logout();
          return;
        }
        setSession(s);
        setUser(s.user);
      } else {
        setSession(null);
        setUser(null);
      }
      setLoading(false);
    });

    // 🔹 Charger la session initiale
    const loadSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const s = data.session;
        
        if (s) {
          const expired = checkSessionExpiry(s);
          if (expired) {
            await logout();
          } else {
            setSession(s);
            setUser(s.user);
          }
        }
      } catch (error) {
        console.error('[useAuth] Session load error:', error);
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    };

    loadSession();

    return () => {
      isMounted.current = false;
      sub.subscription.unsubscribe();
    };
  }, [checkSessionExpiry, logout]);

  return { 
    session, 
    user, 
    loading,
    logout
  };
}