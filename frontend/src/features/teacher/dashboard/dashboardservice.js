import createApiClient from "../../api/../../services/apiClient";

const api = createApiClient();

// DashboardPeriod.java only accepts these lowercase values.
export const DASHBOARD_PERIODS = ["daily", "weekly", "monthly", "yearly"];

// GET /api/dashboard/admin
export async function getAdminDashboard({ period = "daily", date } = {}) {
  const response = await api.get("/dashboard/admin", { params: { period, date } });
  return response.data;
}

// GET /api/dashboard/teacher - pass sectionId to scope to one of the
// teacher's mySections; omit to let the backend default to the first one.
export async function getTeacherDashboard({ period = "daily", date, sectionId } = {}) {
  const response = await api.get("/dashboard/teacher", { params: { period, date, sectionId } });
  return response.data;
}