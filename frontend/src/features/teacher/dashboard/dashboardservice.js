
import createApiClient from "../../api/../../services/apiClient";

const api = createApiClient();

// DashboardPeriod.java only accepts these four exact strings (its enum
// constants are lowercase: daily/weekly/monthly/yearly) - anything else
// 400s. Kept here as the one place that has to know that.
export const DASHBOARD_PERIODS = ["daily", "weekly", "monthly", "yearly"];

/**
 * GET /api/dashboard/admin
 *
 * @param {Object} [params]
 * @param {"daily"|"weekly"|"monthly"|"yearly"} [params.period="daily"]
 * @param {string} [params.date] - ISO "YYYY-MM-DD". Omit to let the backend
 *   default to today (DashboardDateRangeResolver falls back to
 *   LocalDate.now() when the controller passes it `null`).
 * @returns {Promise<{
 *   summary: {
 *     enrolledStudents:number, activeTeachers:number, activeSections:number,
 *     presentToday:number, onSchoolToday:number, absentToday:number,
 *     incompleteAttendance:number, attendanceRate:number
 *   },
 *   attendanceOverview: Array<{ label:string, present:number, absent:number, onSchool:number }>,
 *   recentAttendance: Array<{
 *     lrn:string, studentName:string, sectionName:string,
 *     timeIn:string, timeOut:string|null, status:"present"|"absent"|"on_school"
 *   }>
 * }>}
 *
 * Throws (via axios) a 409 with { message } if there's no active school
 * year - see NoActiveSchoolYearException.java.
 */
export async function getAdminDashboard({ period = "daily", date } = {}) {
  const response = await api.get("/dashboard/admin", { params: { period, date } });
  return response.data;
}

/**
 * GET /api/dashboard/teacher
 * Same overall shape as getAdminDashboard, except:
 *   - summary is TeacherDashboardSummaryResponse (myStudents instead of
 *     enrolledStudents/activeTeachers/activeSections)
 *   - the log list key is `todayAttendance`, not `recentAttendance`
 *
 * Throws (via axios) a 409 with { message } if there's no active school
 * year (NoActiveSchoolYearException.java), or if the logged-in teacher
 * has no active section assignment for the current school year
 * (NoSectionAssignedException.java) - both worth showing to the user
 * directly rather than a generic "something went wrong."
 */
export async function getTeacherDashboard({ period = "daily", date } = {}) {
  const response = await api.get("/dashboard/teacher", { params: { period, date } });
  return response.data;
}