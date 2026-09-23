import axios from "axios";
import { createApiClient } from "../../../services/apiClient"; // TODO: adjust to wherever apiClient.js actually lives relative to this file

// Rate-limit throttle, Authorization header, 401-refresh-retry, and
// 429-retry all now live in apiClient.js. This file's studentApi used to
// be its own axios.create() stuck on the OLD rate-limit numbers (capacity
// 10, refill every 6s) with no refresh-on-401 at all - both are fixed by
// building it from the shared client instead. Note this is a SEPARATE
// studentApi instance from enrollmentService.js's (same shared backend
// bucket, different local JS bucket) - see apiClient.js's comment on why
// that's an acceptable, existing trade-off.
const studentApi = createApiClient();

// forbiddenMessage is optional: pass it from a call site when a 403 there
// specifically means "you're not this student's adviser" (promote/
// graduate), so the person sees that instead of a generic failure. This
// is a frontend-only mitigation - it does NOT grant teachers the ability
// to promote/graduate; that still needs a backend fix to
// StudentController's promoteStudents() @PreAuthorize (it currently
// references a nonexistent #studentId, so TEACHER can never pass it -
// see the message drafted for the backend dev). Once that's fixed
// server-side, a teacher who really is the adviser just won't hit this
// branch anymore.
function getErrorMessage(error, fallback, forbiddenMessage) {
  if (forbiddenMessage && error?.response?.status === 403) return forbiddenMessage;
  const data = error?.response?.data;
  if (typeof data === "string" && data.trim()) return data;
  if (data?.message) return data.message;
  if (data?.error) return data.error;
  return fallback;
}

function mapSections(data) {
  return data
    .filter((section) => section.sectionStatus !== "archived")
    .map((section) => ({
      id: section.sectionId,
      name: section.sectionName,
      gradeLevel: section.gradeLevel,
    }));
}

// `signal` added (same as Sectionlevelservice.getSections) so
// PromoteStudentPage can cancel an in-flight request when the
// gradeLevel/section/search/page changes again before it resolves,
// instead of letting a slower, older response arrive after a newer one
// and overwrite the table with stale data. NOTE: if a request is still
// queued behind the local rate-limit throttle above when it gets
// aborted, it still consumes a slot from the local bucket once its
// turn comes around (axios rejects the actual network call at that
// point via the signal, same as always) - a minor, pre-existing
// characteristic of this throttle shape, not something new here.
//
// UPDATE: `search` is now actually sent as the `search` query param -
// it used to be accepted as `studentName` here and never forwarded at
// all, so typing in the search box did nothing. Confirmed against
// StudentController.getStudents()/StudentService.getStudents(), which
// runs this through StudentSectionAssignmentSpecification.matchesSearch()
// - matches student name (first/middle/last) OR lrn, across the full
// dataset, not just the current page.
//
// FIX: leftover students from a CLOSED/ARCHIVED school year kept showing
// up here after a school-year rollover, unlike the Enrollment page.
// Cause: this never sent `schoolYearStatuses`, and per StudentService.
// getStudents()'s own comment, omitting it means "every school year" -
// it only SORTS active-year students first within a page, it doesn't
// exclude old ones. So a student whose latest assignment was still
// `enrolled` in a year that has since closed (i.e. nobody promoted/
// graduated them before the rollover) kept appearing indefinitely.
// enrollmentService.js's getStudents() already avoids this by sending
// `schoolYearStatuses: "active"` whenever its School Year filter is on
// the default "" (current year) option.
//
// FOLLOW-UP FIX: sending ONLY "active" overcorrected - it made the
// still-un-promoted students disappear completely, with no way to
// select and promote them anymore. Cause: Sectionlevelservice.js's
// startNewSchoolYear() closes the SOURCE school year the moment a new
// one goes active ("closes the source IF it was Active" - see its own
// comment). That only flips the YEAR's status; it does NOT touch each
// student's current assignment (leftAt IS NULL), which still points at
// their old section. So right after "Start New School Year," every
// not-yet-promoted student's current section sits in a year that's now
// "closed," not "active" - and they'd silently fall out of this list
// with no way back in, even though these are exactly the students this
// page exists to handle (e.g. last year's Grade 4 -> this year's
// Grade 5). Now sending both "active" and "closed" keeps ARCHIVED years
// excluded (the original fix above still holds - those are fully done,
// nobody's left to promote) while still surfacing students stuck in a
// year that just closed. "planning" stays excluded too - a planning
// year has no student assignments yet. Sent as one comma-separated
// string rather than an array, since StudentSectionAssignmentSpecification.
// hasSchoolYearStatusIn() (what schoolYearStatuses is built on) takes a
// Collection, and axios's default array serialization adds `[]` to the
// key, which Spring won't bind back to the same param name - a plain
// comma-separated value avoids that mismatch. promoteStudents()/
// graduateStudent() still only ever WRITE into the current active
// year's sections (they reject an inactive-year target server-side) -
// this only widens which students can be picked as the SOURCE of a
// promotion, not where they can be promoted TO. Backend note (didn't
// touch it, just flagging): haven't seen StudentController.java in this
// conversation, so double check it actually binds schoolYearStatuses as
// a comma-splittable List<SchoolYearStatus> the way the Specification
// layer implies - if it expects something else, this is a one-line fix.
export async function getPromotableStudents({ gradeLevel, section, search, page = 0, size = 10, signal } = {}) {
  const params = { studentStatus: "enrolled", schoolYearStatuses: "active,closed", page, size };
  if (gradeLevel) params.gradeLevel = gradeLevel;
  if (section) params.sectionName = section;
  if (search) params.search = search;

  try {
    const { data } = await studentApi.get("/student", { params, signal });
    return data;
  } catch (error) {
    if (axios.isCancel(error) || error.code === "ERR_CANCELED") throw error;
    throw new Error(getErrorMessage(error, "Failed to load students"));
  }
}

// getCurrentSections() and getTargetSections() below both hit
// GET /section/dropdown with the same optional gradeLevel param and
// return the same shape - today they're genuinely the same underlying
// data (see getTargetSections' comment on why), so they share one
// cache keyed by gradeLevel. Neither used to cache at all: the
// page-level filter refetches on every window focus/visibilitychange
// (sectionsRefreshKey) AND every gradeLevel change, and the Promote
// modal refetches on every target-level change - all against the same
// shared per-user rate-limit bucket used by GET /api/student and every
// promote/graduate PATCH. 30s TTL + in-flight dedupe removes the
// redundant part of that.
const sectionsDropdownCache = new Map(); // key: gradeLevel ("" = all) -> { data, expiresAt }
const sectionsDropdownInFlight = new Map();
const sectionsByAdviserCache = new Map(); // key: userId -> { data, expiresAt }
const sectionsByAdviserInFlight = new Map();
const SECTIONS_CACHE_TTL_MS = 30_000;

export function invalidatePromoteSectionsCache() {
  sectionsDropdownCache.clear();
  sectionsByAdviserCache.clear();
}

async function fetchSectionsDropdown(gradeLevel) {
  const cacheKey = gradeLevel || "";

  const cached = sectionsDropdownCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  if (sectionsDropdownInFlight.has(cacheKey)) return sectionsDropdownInFlight.get(cacheKey);

  const request = (async () => {
    const params = {};
    if (gradeLevel) params.gradeLevel = gradeLevel;

    const { data } = await studentApi.get("/section/dropdown", { params });
    const mapped = mapSections(data);
    sectionsDropdownCache.set(cacheKey, { data: mapped, expiresAt: Date.now() + SECTIONS_CACHE_TTL_MS });
    return mapped;
  })();

  sectionsDropdownInFlight.set(cacheKey, request);
  try {
    return await request;
  } finally {
    sectionsDropdownInFlight.delete(cacheKey);
  }
}

// Sections for the page-level filter row - filters the STUDENT TABLE by
// the student's CURRENT section. Always the active school year, since
// /section/dropdown only ever returns active-school-year sections (see
// SectionSpecification.hasSchoolYearStatus() - hardcoded to `active`,
// no param exists to request anything else).
export async function getCurrentSections(gradeLevel) {
  try {
    return await fetchSectionsDropdown(gradeLevel);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to load sections"));
  }
}

// CONNECTED: GET /api/section/adviser/{userId} (SectionController.readSectionByAdviser)
//
// FIX: this used to call GET /api/section/{userId}. After the backend's
// section endpoint split, that path now means GET /api/section/{sectionId}
// (ONE section by its own id) - so the teacher's user id was being treated
// as a section id and the request failed/returned the wrong shape, which
// is why a teacher's Grade Level / Section filters on this page came up
// empty with "Failed to load your assigned sections". Same fix
// enrollmentService.js's getSectionsByAdviser() already got.
//
// The adviser route also returns 200 with [] (not a 404) for a teacher
// with no assigned section yet, so an empty array is a normal result.
//
// Use this instead of getCurrentSections() when the logged-in user is a
// TEACHER - it only returns the section(s) where that user is the
// adviser, so the Promote Student page's Section filter (and "Select
// All" gating) doesn't list every section in the school - which is what
// getCurrentSections() would otherwise show, since that endpoint has no
// adviser scoping at all. ADMIN keeps using getCurrentSections().
//
// NOTE: unlike getCurrentSections()/getTargetSections(), this endpoint
// (readSectionByAdviser(userId)) takes NO gradeLevel query param - the
// Grade Level filter is applied client-side on the result in
// PromoteStudentPage.jsx instead.
export async function getSectionsByAdviser(userId) {
  const cached = sectionsByAdviserCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  if (sectionsByAdviserInFlight.has(userId)) return sectionsByAdviserInFlight.get(userId);

  const request = (async () => {
    try {
      const { data } = await studentApi.get(`/section/adviser/${userId}`);
      const mapped = mapSections(data);
      // Don't cache an empty list - otherwise a teacher who has no
      // section yet would keep seeing "none" for up to 30s (including
      // across the window-focus refresh) after an admin assigns one.
      if (mapped.length > 0) {
        sectionsByAdviserCache.set(userId, { data: mapped, expiresAt: Date.now() + SECTIONS_CACHE_TTL_MS });
      }
      return mapped;
    } catch (error) {
      throw new Error(getErrorMessage(error, "Failed to load your assigned sections"));
    }
  })();

  sectionsByAdviserInFlight.set(userId, request);
  try {
    return await request;
  } finally {
    sectionsByAdviserInFlight.delete(userId);
  }
}

// PLACEHOLDER - target sections for the Promote modal.
//
// The intended design was to promote a student into a section
// belonging to the school's NEXT (planning) school year, so the
// current year's roster stays untouched until that year actually
// starts. That is NOT supported by the backend today (confirmed against
// SectionController.java):
//   - GET /section/dropdown only accepts `gradeLevel` - there is no
//     schoolYearId/schoolYearStatus param to send, and no other section
//     endpoint exposes one either.
//   - SectionSpecification.hasSchoolYearStatus() is hardcoded to
//     SchoolYearStatus.active, so even if a param existed, there's no
//     query path to `planning` sections through this endpoint.
//   - Even if a planning section's id reached the promote request
//     anyway, StudentService.promoteStudents() explicitly rejects any
//     target section whose school year isn't active (throws
//     InactiveSectionNotAllowed).
//
// So for now this hits the same current-active-school-year dropdown as
// getCurrentSections() above - meaning "Promote" moves a student to a
// next-grade-level section within the SAME (active) school year, not a
// future one. Kept as its own function (instead of just calling
// getCurrentSections/fetchSectionsDropdown directly from the modal) so
// that once the backend adds real planning-year support, only THIS
// function needs to change - nothing else in the modal or page needs
// to be touched.
//
// DELIBERATELY BYPASSES sectionsDropdownCache (unlike getCurrentSections,
// which shares it). This is what decides which real section id gets
// written to a student's record via promoteStudents(). Since GET
// /section/dropdown has no way to ask for a *specific* school year -
// only "whatever's active right now" - the only signal this function
// has for "which school year" is the moment it's called. A cached hit
// here would keep offering sections from whatever WAS active up to 30s
// ago even if an admin just changed the active school year in the
// meantime (e.g. SchoolyearmanagementPage marking a new year Active,
// closing the one this student's current section belongs to) - which
// lets a promotion land a student in a section tied to the wrong
// (no-longer-active) school year even though "Promote" is supposed to
// always move them into the CURRENT active year. Fetching fresh every
// time guarantees alignment with whichever year is active at the exact
// moment of promotion. This only costs a network call when the modal
// opens or the target level changes, not on every render, so skipping
// the cache here has no real performance downside.
export async function getTargetSections(gradeLevel) {
  const params = {};
  if (gradeLevel) params.gradeLevel = gradeLevel;

  try {
    const { data } = await studentApi.get("/section/dropdown", { params });
    return mapSections(data);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to load sections"));
  }
}

// FRONTEND-ONLY MITIGATION for the backend promoteStudents() bug
// (StudentController's @PreAuthorize checks a nonexistent #studentId,
// so TEACHER can never pass it - see PROMOTE_PERMISSION_MESSAGE below).
// This does not grant the permission; it just turns the resulting 403
// into a message that tells the adviser what's actually going on
// instead of a generic "Failed to promote students".
const PROMOTE_PERMISSION_MESSAGE =
  "You don't have permission to promote these students yet. Make sure you're their adviser, or ask an admin to do it.";
const GRADUATE_PERMISSION_MESSAGE =
  "You don't have permission to graduate this student yet. Make sure you're their adviser, or ask an admin to do it.";

export async function promoteStudents(studentIds, targetSectionId) {
  try {
    const { data } = await studentApi.patch("/student/grade-level/promote", {
      studentIds,
      targetSectionId: Number(targetSectionId),
    });
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to promote students", PROMOTE_PERMISSION_MESSAGE));
  }
}

// One PATCH per student, sent one after another. This used to need its
// own retry loop here (a separate RATE_LIMIT_RETRY_DELAY_MS/
// RATE_LIMIT_MAX_RETRIES) because studentApi had no throttle of its
// own, so a big enough batch (e.g. "Select All" then Graduate) would
// outrun the backend's bucket and the tail end would fail with 429
// instead of a real business error. Now that every studentApi call
// waits its turn at the shared local bucket (inside apiClient.js)
// BEFORE it's sent (not just retried after it fails), each iteration of
// this loop already paces itself to match the backend's per-minute
// limit - so this stays a plain call, same shape as promoteStudents()
// above. The interceptor's own single 429 resync-and-retry (for
// cross-tab/cross-device contention on the same account) is the
// remaining safety net, same as every other call through studentApi.
async function graduateOneStudent(studentId, remarks, leftAt) {
  const { data } = await studentApi.patch(`/student/${studentId}/student-status/graduate`, { remarks, leftAt });
  return data;
}

export async function graduateStudents(studentIds, remarks = "", leftAt = new Date().toISOString().split("T")[0]) {
  const results = { succeeded: [], failed: [] };

  for (const studentId of studentIds) {
    try {
      const data = await graduateOneStudent(studentId, remarks, leftAt);
      results.succeeded.push(data);
    } catch (error) {
      results.failed.push({
        studentId,
        message: getErrorMessage(error, "Failed to graduate student", GRADUATE_PERMISSION_MESSAGE),
      });
    }
  }

  if (results.failed.length > 0) {
    const failedIds = results.failed.map((f) => f.studentId).join(", ");
    throw Object.assign(
      new Error(`Failed to graduate ${results.failed.length} student(s): ${failedIds}`),
      { partialResult: results }
    );
  }

  return results.succeeded;
}

export default studentApi;