import { supabase } from "../lib/supabase";

export async function getTasks() {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

export async function createTask(taskValues) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error("You must be logged in to create a task.");
  }

  const { data, error } = await supabase
    .from("tasks")
    .insert([{ ...taskValues, user_id: user.id }])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateTask(taskId, taskValues) {
  const { data, error } = await supabase
    .from("tasks")
    .update(taskValues)
    .eq("id", taskId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteTask(taskId) {
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);

  if (error) {
    throw error;
  }
}
