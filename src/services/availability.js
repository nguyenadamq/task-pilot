import { supabase } from "../lib/supabase";

export async function getAvailabilityRules() {
  const { data, error } = await supabase
    .from("availability_rules")
    .select("*")
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}

export async function createAvailabilityRule(values) {
  const userId = await getUserId();

  const { data, error } = await supabase
    .from("availability_rules")
    .insert([{ ...values, user_id: userId }])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteAvailabilityRule(ruleId) {
  const { error } = await supabase.from("availability_rules").delete().eq("id", ruleId);

  if (error) {
    throw error;
  }
}

async function getUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!user) {
    throw new Error("You must be logged in.");
  }

  return user.id;
}
