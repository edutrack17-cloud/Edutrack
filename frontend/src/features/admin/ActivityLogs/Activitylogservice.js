import axios from "axios";
import { createApiClient } from "../../../services/apiClient"; // TODO: adjust to wherever apiClient.js actually lives relative to this file

// IMPORTANT: GlobalExceptionHandler.handleAuthorizationDenied() maps a
// failed @PreAuthorize("hasRole('ADMIN')") check (AuthorizationDeniedException,
// the default exception thrown by @EnableMethodSecurity in Spring Security 6)
// to 401 - NOT 403 - with message "You're not allowed to access this
// feature". That means a fully logged-in, non-admin user (e.g. a Teacher)
// gets the exact same status code as an expired/invalid/missing token.
// A blanket "401 -> refresh/logout" would either try a pointless refresh
// or force-logout that valid session over a permissions issue, not an
// auth one. Excluding this specific message is a stopgap based on the
// one response shape we've actually confirmed (GlobalExceptionHandler) -
// JwtAuthenticationEntryPoint, which is what actually fires for a real
// expired/invalid token, is a separate filter-level component we haven't
// seen, so its response shape isn't confirmed to differ from this.
// Worth asking backend to either share that file, or better, add a
// distinct field (e.g. an error code) so this doesn't have to rely on
// matching an exact message string.
const AUTHZ_DENIED_MESSAGE = "You're not allowed to access this feature";

// Rate-limit throttle, Authorization header, 401-refresh-retry, and
// 429-retry all now live in apiClient.js - this file used to hand-roll
// all of that itself, on the OLD capacity 10 / 6s numbers, with no
// refresh-on-401 retry for REAL 401s (only the AUTHZ_DENIED_MESSAGE
// carve-out existed). isAuthBypass here preserves that carve-out: a 401
// carrying this exact message is passed straight through to the caller
// instead of triggering a refresh attempt or a logout.
const activityLogApi = createApiClient({
  isAuthBypass: (error) => error.response?.data?.message === AUTHZ_DENIED_MESSAGE,
});

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || fallback;
}

// Reshapes the raw ActivityLogResponse coming back from
// GET /api/activity-log (logId, logHeader, logDescription, createdAt,
// userFullName) into what Activitylogtable.jsx reads (logId, logHeader,
// logDescription, performedBy, createdAt). Note: unlike the old mock shape,
// the real response has a flat `userFullName` string - there's no nested
// `user` object, since ActivityLogMapper builds the full name server-side.
function mapLogEntry(entry) {
  return {
    logId: entry.logId,
    logHeader: entry.logHeader,
    logDescription: entry.logDescription,
    performedBy: entry.userFullName || null,
    createdAt: entry.createdAt,
  };
}

// GET /api/activity-log?page&size&sort&logHeader
// - path is singular "activity-log" to match @RequestMapping("api/activity-log")
//   on ActivityLogController - NOT "activity-logs".
// - `logHeader` (not `search`) is the only filter param the backend accepts;
//   ActivityLogSpecification.hasHeader() does an exact match against it, so
//   this is meant to be fed exact values (see Activitylogheaderfilter.jsx),
//   not arbitrary free text.
// - `sort=createdAt,desc` is passed explicitly because Pageable has no
//   default ordering - without it, "newest first" isn't guaranteed.
// - Requires an ADMIN-role session (@PreAuthorize("hasRole('ADMIN')") on the
//   controller), so this must be called from an authenticated admin route.
export async function getActivityLogs({ logHeader, page = 0, size = 10, signal } = {}) {
  const params = { page, size, sort: "createdAt,desc" };
  if (logHeader) params.logHeader = logHeader;

  try {
    const { data } = await activityLogApi.get("/activity-log", { params, signal });
    return {
      content: (data.content || []).map(mapLogEntry),
      totalPages: data.totalPages ?? 1,
    };
  } catch (error) {
    if (axios.isCancel(error) || error.code === "ERR_CANCELED") throw error;
    throw new Error(getErrorMessage(error, "Failed to load activity logs."));
  }
}

// POST /api/activity-log  body: { logHeader, logDescription }
// HEADS UP FOR BACKEND: ActivityLogController.java only exposes a
// @GetMapping right now - there's no @PostMapping wired to
// activityLogService.createLogRecord(logHeader, logDescription) yet, so
// this call will 404 until that's added on their end. Left as
// fire-and-forget (same as before) so a failed log write can never break
// the action that triggered it.
export async function logActivity(logHeader, logDescription) {
  try {
    await activityLogApi.post("/activity-log", {
      logHeader,
      logDescription,
    });
  } catch (error) {
    console.warn("logActivity(): failed to record activity log -", getErrorMessage(error, "unknown error"));
  }
}

export default activityLogApi;