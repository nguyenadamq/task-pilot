import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

export function assertSupabaseConfig() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing SUPABASE_URL/SUPABASE_ANON_KEY or VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY.");
  }
}

export function createServerClient(accessToken) {
  assertSupabaseConfig();

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

export async function requireUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    if (!accessToken) {
      return res.status(401).json({ error: "Missing authorization token." });
    }

    const supabase = createServerClient(accessToken);
    const { data, error } = await supabase.auth.getUser(accessToken);

    if (error || !data.user) {
      return res.status(401).json({ error: "Invalid or expired session." });
    }

    req.supabase = supabase;
    req.user = data.user;
    next();
  } catch (error) {
    next(error);
  }
}

export async function getOrCreatePreferences(supabase, userId) {
  const { data, error } = await supabase
    .from("schedule_preferences")
    .upsert([{ user_id: userId }], {
      onConflict: "user_id",
      ignoreDuplicates: true,
    })
    .select()
    .single();

  if (error) {
    if (error.code !== "PGRST116") {
      throw error;
    }
  }

  if (data) {
    return data;
  }

  const { data: existing, error: selectError } = await supabase
    .from("schedule_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (selectError) {
    throw selectError;
  }

  return existing;
}
