import { supabase } from "./supabase";

const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function apiRequest(path, options = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("You need to be signed in.");
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      ...(options.headers || {}),
    },
  });

  if (response.status === 204) {
    return null;
  }

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || "The server could not complete that action.");
  }

  return payload;
}

export function getBootstrap() {
  return apiRequest("/api/bootstrap");
}

export function createTask(values) {
  return apiRequest("/api/tasks", {
    method: "POST",
    body: JSON.stringify(values),
  });
}

export function updateTask(id, values) {
  return apiRequest(`/api/tasks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(values),
  });
}

export function deleteTask(id) {
  return apiRequest(`/api/tasks/${id}`, { method: "DELETE" });
}

export function completeTask(id) {
  return apiRequest(`/api/tasks/${id}/complete`, { method: "POST" });
}

export function createAvailabilityRule(values) {
  return apiRequest("/api/availability", {
    method: "POST",
    body: JSON.stringify(values),
  });
}

export function deleteAvailabilityRule(id) {
  return apiRequest(`/api/availability/${id}`, { method: "DELETE" });
}

export function updatePreferences(values) {
  return apiRequest("/api/preferences", {
    method: "PUT",
    body: JSON.stringify(values),
  });
}

export function generateSchedule() {
  return apiRequest("/api/schedule/generate", { method: "POST" });
}

export function extendScheduleBlock(id, minutes) {
  return apiRequest(`/api/schedule/blocks/${id}/extend`, {
    method: "POST",
    body: JSON.stringify({ minutes }),
  });
}
