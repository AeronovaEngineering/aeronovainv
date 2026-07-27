import { supabase } from "@/integrations/supabase/client";

export type ActivityAction =
  | "login" | "logout" | "signup"
  | "create" | "update" | "delete"
  | "validate" | "cancel" | "convert" | "payment"
  | "login_failed" | "login_error" | "session_expired" | "inactivity_logout";

export type ActivityEntity =
  | "client" | "supplier" | "quotation" | "invoice"
  | "settings" | "user" | "role" | "auth";

export async function logActivity(
  action: ActivityAction,
  entity_type: ActivityEntity | null,
  entity_id: string | null,
  details?: Record<string, unknown>,
) {
  try {
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    
    if (!user) {
      // Pour les actions auth sans utilisateur
      if (action === 'login_failed' || action === 'login_error') {
        await supabase.from("activity_logs").insert({
          user_id: null,
          user_email: (details?.email as string) || null, // ✅ Correction de type
          action,
          entity_type,
          entity_id,
          details: (details ?? null) as never,
        });
      }
      return;
    }
    
    await supabase.from("activity_logs").insert({
      user_id: user.id,
      user_email: user.email ?? null,
      action,
      entity_type,
      entity_id,
      details: (details ?? null) as never,
    });
  } catch {
    // silencieux
  }
}