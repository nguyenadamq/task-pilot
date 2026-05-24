import { supabase } from "../lib/supabase";

export async function getSleepRules() {
  const { data, error } = await supabase
    .from("sleep_rules")
    .select("*")
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}

export async function createSleepRule(values) {
  const userId = await getUserId();
  const days = getDaysForGroup(values.sleep_group);

  const { error: deleteError } = await supabase
    .from("sleep_rules")
    .delete()
    .eq("user_id", userId)
    .in("day_of_week", days);

  if (deleteError) {
    throw deleteError;
  }

  const { data, error } = await supabase
    .from("sleep_rules")
    .insert(
      days.map((dayOfWeek) => ({
        user_id: userId,
        day_of_week: dayOfWeek,
        start_time: values.start_time,
        end_time: values.end_time,
      }))
    )
    .select();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteSleepRule(ruleIds) {
  const ids = Array.isArray(ruleIds) ? ruleIds : [ruleIds];
  const { error } = await supabase.from("sleep_rules").delete().in("id", ids);

  if (error) {
    throw error;
  }
}

function getDaysForGroup(group) {
  if (group === "weekends") {
    return [5, 6];
  }

  return [0, 1, 2, 3, 4];
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
