import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api";

// GUARD ATTENDANCE SERVICE
// Separate from the teacher account's Attendanceservice.js on purpose
// - guard and teacher are different accounts/features, and this file
// only needs the ONE call the gate kiosk makes. If the guard account
// ever needs more attendance calls later, add them here rather than
// reaching into features/teacher/.

const guardAttendanceApi = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// --- Client-side rate-limit throttle ------------------------------------
// Mirrors RateLimitConfig.java exactly: capacity 10, refillGreedy(10,
// 1 minute) = 1 token added every 6s. Same idiom as every other *Api
// instance in this app.
//
// FIX: this file previously called fetch() directly with NO
// Authorization header at all - so every gate tap almost certainly fell
// through RateLimitFilter.resolveKey() to the "ip:" + request.getRemoteAddr()
// branch instead of "user:" + userId (that branch only fires when
// authentication.isAuthenticated() is false). That means the 10 req/6s
// bucket was shared by EVERY device hitting the backend from the same
// network - the whole campus, if behind one router/NAT - not just this
// one guard kiosk. Attaching the token below puts the guard account on
// the same per-user bucket as every other account, matching how the
// backend's own resolveKey() actually branches.
const RATE_LIMIT_CAPACITY = 10;
const RATE_LIMIT_REFILL_MS = 6000;

let availableTokens = RATE_LIMIT_CAPACITY;
let lastRefillAt = Date.now();
const throttleQueue = [];

function refillTokens() {
  const elapsed = Date.now() - lastRefillAt;
  if (elapsed <= 0) return;
  const tokensToAdd = Math.floor(elapsed / RATE_LIMIT_REFILL_MS);
  if (tokensToAdd > 0) {
    availableTokens = Math.min(RATE_LIMIT_CAPACITY, availableTokens + tokensToAdd);
    lastRefillAt += tokensToAdd * RATE_LIMIT_REFILL_MS;
  }
}

function processThrottleQueue() {
  refillTokens();
  while (availableTokens > 0 && throttleQueue.length > 0) {
    availableTokens -= 1;
    throttleQueue.shift()();
  }
  if (throttleQueue.length > 0) {
    setTimeout(processThrottleQueue, RATE_LIMIT_REFILL_MS);
  }
}

// Awaited before every call - under the limit, resolves immediately;
// over it, queues (in call order) and resolves as tokens refill, so a
// burst of taps at the gate gets spaced out instead of racing the
// backend's bucket and losing.
function acquireRequestSlot() {
  refillTokens();
  if (availableTokens > 0 && throttleQueue.length === 0) {
    availableTokens -= 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    throttleQueue.push(resolve);
    if (throttleQueue.length === 1) {
      setTimeout(processThrottleQueue, RATE_LIMIT_REFILL_MS);
    }
  });
}

guardAttendanceApi.interceptors.request.use(async (config) => {
  await acquireRequestSlot();

  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

guardAttendanceApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      window.location.href = "/login";
      return Promise.reject(error);
    }

    // Our local bucket should keep this kiosk under the backend's limit
    // on its own, so reaching a real 429 means something else is also
    // spending from this same bucket right now (another gate kiosk
    // logged in as the same guard account, or - before the fix above -
    // another device on the same network). Resync the local bucket to
    // empty and retry this one request once after a full refill
    // interval, instead of surfacing a raw 429 straight to the kiosk UI
    // mid-tap.
    if (error.response?.status === 429 && !error.config?._rateLimitRetried) {
      availableTokens = 0;
      lastRefillAt = Date.now();
      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_REFILL_MS));
      error.config._rateLimitRetried = true;
      return guardAttendanceApi(error.config);
    }

    return Promise.reject(error);
  }
);

// CONFIRMED via AttendanceResponse.java / AttendanceMapper.java - flat
// record: attendanceId, studentName, gradeAndSection, dateTimeIn,
// dateTimeOut, attendanceStatus, confirmed. No "rfid" field, and
// gradeAndSection is one pre-combined string, not separate
// gradeLevel/section.
function mapAttendanceRecord(record) {
  const timeIn = record.dateTimeIn ? record.dateTimeIn.split("T")[1] : "";
  return {
    id: record.attendanceId,
    name: record.studentName ?? "",
    gradeAndSection: record.gradeAndSection ?? "",
    timeIn: timeIn ? timeIn.slice(0, 5) : "", // "07:00:00" -> "07:00"
  };
}

// error is an axios error - error.response.data is already-parsed JSON
// (no response.json() dance needed like the old fetch version). Attaches
// the HTTP status (and the backend's own error message, when it sends a
// JSON body - see ApplicationException subclasses like
// AlreadyHasARecord/AssignmentNotFound) to the thrown Error, so callers
// can branch on specific failures instead of only ever getting a
// generic "request failed".
function buildAttendanceError(error) {
  const status = error.response?.status;
  const data = error.response?.data;
  const message = (data && typeof data === "object" && data.message) || `POST /api/attendance failed (${status})`;
  const err = new Error(message);
  err.status = status;
  return err;
}

// POST /api/attendance - the RFID "time in" tap (GUARD side). Body:
// { rfid }. Creates a new row (dateTimeIn = server "now", status =
// on_school) if this assignment has no record yet today, or throws
// 409 (AlreadyHasARecord) if one already exists - a normal, expected
// outcome here (one gate tap per day is all that's needed), not an
// error state for the guard. Also throws 404 (AssignmentNotFound) if
// the rfid doesn't match an active assignment.
export async function timeInAttendance(rfid) {
  try {
    const { data } = await guardAttendanceApi.post("/attendance", { rfid });
    return mapAttendanceRecord(data);
  } catch (error) {
    throw buildAttendanceError(error);
  }
}

export default guardAttendanceApi;