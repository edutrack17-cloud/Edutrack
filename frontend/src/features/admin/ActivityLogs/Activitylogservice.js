import axios from "axios";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

const activityLogApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || fallback;
}

// TODO - BACKEND NOT BUILT YET: ActivityLog.java (entity) exists, but
// there's no repository/service/controller for it yet, so there is no
// real endpoint to hit. Everything below is wired up and ready to go the
// moment one exists - just confirm the path and response shape match once
// the controller lands, and delete this TODO block.
//
// CONNECT: GET /api/activity-logs?page&size&search  (expected: paginated,
// newest first - a Spring Data Page<ActivityLogResponse> shape, matching
// how /section and /school-year already respond elsewhere in this app)
//
// Each raw item is expected to come back shaped like the ActivityLog
// entity itself: { logId, logHeader, logDescription, createdAt, user: {...} }.
// mapLogEntry() below reshapes that into what Activitylogtable.jsx reads
// (logId, logHeader, logDescription, performedBy, createdAt) - adjust the
// `user.fullName` lookup if the nested user object's field name differs
// (see getTeachers() in Sectionlevelservice.js, which assumes the same
// `fullName` field on User).
function mapLogEntry(entry) {
  return {
    logId: entry.logId,
    logHeader: entry.logHeader,
    logDescription: entry.logDescription,
    performedBy: entry.user?.fullName || entry.user?.username || null,
    createdAt: entry.createdAt,
  };
}

// MOCK DATA - remove this block once GET /api/activity-logs is live.
// Shaped the same way the real endpoint is expected to respond (see the
// TODO above mapLogEntry), so getActivityLogs() below can treat mock and
// real data identically and nothing else in this feature has to change
// when the backend catches up.
const MOCK_LOGS = [
  { logId: 1, logHeader: "Section Created", logDescription: "Section 4-Rizal was added.", user: { fullName: "Juan Dela Cruz" }, createdAt: "2026-08-22T09:14:00" },
  { logId: 2, logHeader: "Section Updated", logDescription: "Section 5-Bonifacio was updated.", user: { fullName: "Maria Santos" }, createdAt: "2026-08-21T15:32:00" },
  { logId: 3, logHeader: "Section Archived", logDescription: "Section 6-Mabini was archived.", user: { fullName: "Juan Dela Cruz" }, createdAt: "2026-08-21T10:05:00" },
  { logId: 4, logHeader: "Section Activated", logDescription: "Section 4-Aguinaldo was activated.", user: { fullName: "Ana Reyes" }, createdAt: "2026-08-20T14:48:00" },
  { logId: 5, logHeader: "New School Year Started", logDescription: "12 section(s) carried over from the current school year.", user: { fullName: "Maria Santos" }, createdAt: "2026-08-19T08:00:00" },
  { logId: 6, logHeader: "Section Created", logDescription: "Section 5-Luna was added.", user: { fullName: "Ana Reyes" }, createdAt: "2026-08-18T11:22:00" },
  { logId: 7, logHeader: "Section Updated", logDescription: "Section 6-Del Pilar's adviser was changed.", user: { fullName: "Juan Dela Cruz" }, createdAt: "2026-08-17T16:40:00" },
  { logId: 8, logHeader: "Section Archived", logDescription: "Section 4-Silang was archived.", user: { fullName: "Ana Reyes" }, createdAt: "2026-08-16T13:15:00" },
  { logId: 9, logHeader: "Section Created", logDescription: "Section 6-Jacinto was added.", user: { fullName: "Maria Santos" }, createdAt: "2026-08-15T09:50:00" },
  { logId: 10, logHeader: "Section Activated", logDescription: "Section 5-Rizal was activated.", user: { fullName: "Juan Dela Cruz" }, createdAt: "2026-08-14T10:30:00" },
  { logId: 11, logHeader: "Section Created", logDescription: "Section 4-Recto was added.", user: { fullName: "Ana Reyes" }, createdAt: "2026-08-13T09:00:00" },
];

function getMockActivityLogs({ search, page, size }) {
  const query = (search || "").trim().toLowerCase();

  const filtered = query
    ? MOCK_LOGS.filter(
        (log) =>
          log.logHeader.toLowerCase().includes(query) ||
          log.logDescription.toLowerCase().includes(query) ||
          (log.user?.fullName || "").toLowerCase().includes(query)
      )
    : MOCK_LOGS;

  const sorted = [...filtered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const totalPages = Math.max(1, Math.ceil(sorted.length / size));
  const start = page * size;
  const content = sorted.slice(start, start + size).map(mapLogEntry);

  return { content, totalPages };
}

export async function getActivityLogs({ search, page = 0, size = 10, signal } = {}) {
  const params = {};
  if (search) params.search = search;
  params.page = page;
  params.size = size;

  try {
    const { data } = await activityLogApi.get("/activity-logs", { params, signal });
    return {
      content: (data.content || []).map(mapLogEntry),
      totalPages: data.totalPages || 1,
    };
  } catch (error) {
    if (axios.isCancel(error) || error.code === "ERR_CANCELED") throw error;
    // MOCK FALLBACK: the endpoint doesn't exist yet (404/network error),
    // so serve mock data instead of surfacing an error banner on the page.
    // Once the real endpoint is live this catch block should go back to
    // just throwing - delete this fallback along with MOCK_LOGS above.
    console.warn("getActivityLogs(): endpoint not available yet, using mock data -", getErrorMessage(error, "unknown error"));
    return getMockActivityLogs({ search, page, size });
  }
}

// TODO - BACKEND NOT BUILT YET: same as above, no controller to POST to yet.
//
// CONNECT: POST /api/activity-logs  body: { logHeader, logDescription }
// userId is NOT sent from the client - ActivityLog.java's `user` field
// should be set server-side from the authenticated session, the same way
// createdAt already defaults itself on the entity.
//
// Deliberately fire-and-forget: logging an action should never be able to
// break the action itself, so until the endpoint exists (and even after,
// if it ever errors) this just warns to the console instead of throwing -
// same pattern as getTeachers() in Sectionlevelservice.js. Every call site
// in Sectionlevelpage.jsx already calls this without awaiting it, so no
// caller needs to change once the endpoint is live.
export async function logActivity(logHeader, logDescription) {
  try {
    await activityLogApi.post("/activity-logs", {
      logHeader,
      logDescription,
    });
  } catch (error) {
    console.warn("logActivity(): failed to record activity log -", getErrorMessage(error, "unknown error"));
  }
}

export default activityLogApi;