import { supabase } from "../lib/supabase";

export async function getFixedEvents() {
  const { data, error } = await supabase
    .from("fixed_events")
    .select("*")
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}

export async function createFixedEvent(values) {
  const userId = await getUserId();

  const { data, error } = await supabase
    .from("fixed_events")
    .insert([{ ...values, user_id: userId }])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteFixedEvent(eventId) {
  const { error } = await supabase.from("fixed_events").delete().eq("id", eventId);

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
