import axios from "axios";
import { createApiClient } from "../../../services/apiClient"; // TODO: adjust to wherever apiClient.js actually lives relative to this file

// Rate-limit throttle, Authorization header, 401-refresh-retry, and
// 429-retry are all handled inside createApiClient() now - see
// apiClient.js. This used to be its own hand-rolled axios.create() with a
// copy-pasted throttle (still on the OLD capacity 10 / 6s numbers) and no
// refresh-on-401 at all; both are fixed by switching to the shared client.
const sectionApi = createApiClient();

export const GRADE_LEVEL_OPTIONS = [
  { value: "Grade_4", label: "Grade 4" },
  { value: "Grade_5", label: "Grade 5" },
  { value: "Grade_6", label: "Grade 6" },
];

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || fallback;
}


// BUG FIX: SectionSpecification.hasAdviserName (backend) splits `fullName`
// on whitespace only ("\\s+") and requires every resulting token to
// independently LIKE-match a name column - it never strips punctuation
// first. The Teacher filter (Sectionlevelpage.jsx's selectedTeacherName)
// passes a "LastName, First Middle" display name through `search`, and the
// comma survives as part of the "LastName," token, which then never
// matches a plain "LastName" column value - so picking a teacher from the
// dropdown silently returned zero results even though typing the same
// name as free text (no punctuation) worked fine. Stripping punctuation
// once, here at the API boundary, fixes every current and future caller
// of `search` - not just the Teacher filter - without touching the
// backend.
function sanitizeNameSearch(value) {
  return value
    .replace(/[.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// CONNECT: GET /api/section
// UPDATE: backend now accepts a real schoolYearId param (SectionController
// / SectionSpecification.hasSchoolYearId), so the School Year filter no
// longer needs the fetch-a-batch-and-match-by-label workaround that used
// to live in Sectionlevelpage.jsx / Newschoolyearmodal.jsx - pass the id
// straight through like gradeLevel/status below.
export async function getSections({ search, sectionSearch, gradeLevel, status, schoolYearId, page = 0, size = 10, signal } = {}) {
  const params = {};
  if (search) params.fullName = sanitizeNameSearch(search);
  if (sectionSearch) params.sectionName = sectionSearch;
  if (gradeLevel) params.gradeLevel = gradeLevel;
  if (status) params.sectionStatus = status;
  if (schoolYearId) params.schoolYearId = schoolYearId;
  params.page = page;
  params.size = size;

  try {
    const { data } = await sectionApi.get("/section", { params, signal });
    return {
      content: data.content || [],
      totalPages: data.totalPages || 1,
    };
  } catch (error) {
    if (axios.isCancel(error) || error.code === "ERR_CANCELED") throw error;
    throw new Error(getErrorMessage(error, "Failed to load sections"));
  }
}


// CONNECT: POST /api/section
// Manual create - the backend enforces "adviser required" here.
export async function createSection(data) {
  try {
    const response = await sectionApi.post("/section", data);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to create section"));
  }
}


// CONNECT: POST /api/section/clone
// Clone-specific create: adviser is OPTIONAL. Kept for any single-section
// clone caller; the bulk path below (cloneSectionBatch) is what
// cloneSectionsAcrossSchoolYears() now uses.
export async function cloneSection(data) {
  try {
    const response = await sectionApi.post("/section/clone", data);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to clone section"));
  }
}


// CONNECT: POST /api/section/clone/batch
// Bulk clone: ONE request for N sections, all inside a single backend
// transaction. Replaces the old per-section loop in
// cloneSectionsAcrossSchoolYears(), which did N sequential POSTs through
// the rate limiter and was the main cause of the "clone feels slow"
// complaint.
//
// Body: { targetSchoolYearId, sections: [{ sectionName, gradeLevel, userId? }, ...] }
// Returns: SectionResponse[] (one per successfully created section, in order).
//
// Failure semantics: the batch is all-or-nothing at the transaction level.
// If any single section violates a constraint (duplicate name, bad
// adviser id, etc.), the whole batch rolls back and the promise rejects
// with the backend's error message. Callers that need per-section failure
// reporting should still pre-filter what they can (duplicate names,
// unresolvable adviser names) client-side before calling this.
export async function cloneSectionBatch(targetSchoolYearId, sections) {
  try {
    const response = await sectionApi.post("/section/clone/batch", {
      targetSchoolYearId,
      sections,
    });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to clone sections"));
  }
}


// CONNECT: PATCH /api/section/{sectionId}
export async function updateSection(sectionId, data) {
  try {
    const response = await sectionApi.patch(`/section/${sectionId}`, data);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to update section"));
  }
}


// CONNECT: PATCH /api/section/{sectionId}/section-status/archive
export async function archiveSection(sectionId) {
  try {
    const response = await sectionApi.patch(`/section/${sectionId}/section-status/archive`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to archive section"));
  }
}


// CONNECT: PATCH /api/section/{sectionId}/section-status/active
export async function restoreSection(sectionId) {
  try {
    const response = await sectionApi.patch(`/section/${sectionId}/section-status/active`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to restore section"));
  }
}


// CONNECT: GET /api/teachers
export async function getTeachers() {
  try {
    const { data } = await sectionApi.get("user/teachers");
    return data.map((teacher) => ({
      id: teacher.userId,
      name: teacher.fullName,
    }));
  } catch (error) {
    console.warn("getTeachers(): failed to load teacher list -", getErrorMessage(error, "unknown error"));
    return [];
  }
}

// status now takes a param ("active" | "planning" | ...) instead of being
// hardcoded, since the New School Year flow needs both: "active" for the
// source dropdown, "planning" for the target dropdown (matches the
// SchoolYearNotPlanning check on the backend). Existing callers that don't
// pass anything keep getting "active", same as before.
// NOTE: params/response shape here are assumed from how the section service
// already calls this endpoint - adjust once the SchoolYear controller is
// shared.
// CONNECT: GET /api/school-year
// WARNING: paginated, and the backend caps page size at 10 (size:100 below is
// silently ignored), so this only ever returns the FIRST 10 years of a status.
// Fine for "active"/"planning" (a handful at most). For anything that needs
// every year of a status - e.g. all Closed/Archived years for the New School
// Year source dropdown - use getSchoolYearDropdown() and filter by status.
export async function getSchoolYears(status = "active") {
  try {
    const { data } = await sectionApi.get("/school-year", {
      params: { schoolYearStatus: status, size: 100 },
    });

    return (data.content || []).map((sy) => ({ id: sy.schoolYearId, label: sy.schoolYearName }));
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to load school years"));
  }
}

// CONNECT: GET /api/school-year/dropdown
// Same dedicated, unpaginated endpoint the School Year feature's own
// filter uses (see getSchoolYearDropdown() in Schoolyearservice.js) -
// SchoolYearService.schoolYearDropdown() is just repository.findAll(),
// so it returns every school year regardless of status, no page-size
// ceiling. Replaces getSchoolYears(null) for loadAllSchoolYears(), which
// was hitting GET /school-year with a hardcoded size:100 - fine for the
// active/planning/closed pulls above, wrong for "give me literally
// every year to filter by."
export async function getSchoolYearDropdown() {
  try {
    const { data } = await sectionApi.get("/school-year/dropdown");
    return (data || []).map((sy) => ({
      id: sy.schoolYearId,
      label: sy.schoolYearName,
      status: sy.schoolYearStatus,
    }));
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to load school year options"));
  }
}

// CONNECT: PATCH /school-year/{id}/school-year-status/active
// BUG FIX: cloneSectionsAcrossSchoolYears() (the Closed/Archived-source
// "Copy Sections Into" flow) never touches school year status - only
// startNewSchoolYear() above does that, and only for an Active source.
// So copying sections into a Planning target from a Closed source left
// that target stuck on "Planning" forever, with no year ever becoming
// Active again. This lets handleStartNewSchoolYear() (Sectionlevelpage.jsx)
// activate the target itself right after a successful copy - same PATCH
// the School Year page's own "Mark Active" row action already uses. The
// backend's "only one Active school year" rule (SchoolYearService -
// ActiveSchoolYearAlreadyExists / pessimistic lock) still applies: if
// another year is already Active, this call fails and the caller should
// treat it as "sections copied, but activation failed" rather than a
// hard error.
export async function activateSchoolYear(schoolYearId) {
  try {
    const response = await sectionApi.patch(`/school-year/${schoolYearId}/school-year-status/active`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to mark school year as active"));
  }
}

// CONNECT: GET /api/section/dropdown
// Returns active sections belonging to the currently-active school year
// (unpaginated). Used as a live preview of which sections would be carried
// over by Start New School Year - it doesn't take a schoolYearId, so the
// preview reflects "the" active year rather than whatever's picked in the
// Source School Year field. That's fine for the normal case (one active
// year at a time, which is also what gets pre-selected as the source) but
// worth knowing if that assumption ever changes.
export async function getSectionDropdown(gradeLevel) {
  try {
    const params = {};
    if (gradeLevel) params.gradeLevel = gradeLevel;

    const { data } = await sectionApi.get("/section/dropdown", { params });
    return data || [];
  } catch (error) {
    console.warn("getSectionDropdown(): failed to load section preview -", getErrorMessage(error, "unknown error"));
    return [];
  }
}

// CONNECT: POST /api/section/school-year/new-school-year
// Clones the source's sections (optionally filtered by gradeLevel) into
// the target, closes the source IF it was Active, and activates the
// target IF it was Planning. Returns the newly created SectionResponse
// list.
//
// CORRECTED: this reads/writes the exact sourceSchoolYearId/
// targetSchoolYearId sent in the request (SectionService.newSchoolYear
// on the backend) - it does NOT look up "the" active year separately, so
// it's safe to call with a Closed source too. The real reason
// cloneSectionsAcrossSchoolYears() exists as a separate path is a
// different backend rule: this endpoint rejects the whole call
// (SchoolYearAlreadyHasSections) the moment the target already has ANY
// active section, so it can only ever be used ONCE per target - it can't
// support copying one grade level in now and another later. Use
// cloneSectionsAcrossSchoolYears() whenever the clone-into-target needs
// to be repeatable (duplicates skipped instead of the whole call
// failing), which is why the Closed/Archived-source ("Copy Sections
// Into") flow uses it even though this endpoint would also technically
// accept a Closed source.
export async function startNewSchoolYear(data) {
  try {
    const response = await sectionApi.post("/section/school-year/new-school-year", data);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to start new school year"));
  }
}

// The backend caps page size at 10 - asking for size:100 is silently ignored
// and only the first 10 rows come back, with no error. Every lookup below
// that needs "all sections of a school year" therefore has to walk the
// pages via getAllSections() instead of trusting a single big request.
// Both lookups are scoped with schoolYearId (see getSections() above), so
// this is at most a handful of requests per school year.
const SECTION_PAGE_SIZE = 10;
const MAX_SECTION_PAGES = 50; // safety net against a runaway loop (500 sections)

// Walks every page of GET /section for the given filters and returns all
// rows as one flat array (NOT the { content, totalPages } shape that
// getSections() returns).
async function getAllSections(filters = {}) {
  const all = [];
  let page = 0;
  let totalPages = 1;

  do {
    const batch = await getSections({ ...filters, page, size: SECTION_PAGE_SIZE });
    all.push(...batch.content);
    totalPages = batch.totalPages;
    page += 1;
  } while (page < totalPages && page < MAX_SECTION_PAGES);

  return all;
}

// Client-side stand-in for the backend's newSchoolYear() clone step, used
// specifically when the source is a Closed (past) school year rather than
// the currently-active one. startNewSchoolYear() can't be reused for this
// case (see the note on it above) since it always closes "the" active
// year and activates the target, and neither of those should happen when
// someone is just pulling sections forward from an old year as a
// template.
//
// PERF: this now does exactly TWO network reads (target lookup, source
// lookup) plus ONE bulk POST to /section/clone/batch. It used to do the
// same two reads plus N sequential POSTs to /section/clone - one per
// section - each of which had to squeeze through the rate limiter, which
// is what made cloning 10 sections take seconds.
//
// ADVISER HANDLING: a section with no adviser is a valid state and must
// stay valid after cloning. Only sections that actually HAD an adviser on
// the source need that adviser resolved back to a userId (SectionResponse
// exposes the adviser as a display-name string only). If a source section
// has an adviser name that can't be matched to anyone in the `advisers`
// list (renamed, removed, etc.), that section is reported as a failure
// instead of being silently skipped or given to the wrong person. If the
// source section had NO adviser, we clone it with no adviser - no lookup,
// no failure.
//
// Duplicate-name collisions against the target are resolved client-side
// (we skip those sections and report them in `failed`) before the batch
// is sent, because the batch endpoint is all-or-nothing: a single
// duplicate would roll back every section in the request.
//
// Returns { created, failed } - `created` is the list of successfully
// cloned SectionResponses (mirrors startNewSchoolYear()'s return shape),
// `failed` is `{ sectionName, reason }` entries for anything that
// couldn't be copied.
export async function cloneSectionsAcrossSchoolYears({
  sourceSchoolYearId,
  targetSchoolYearId,
  targetLabel,
  gradeLevel,
  advisers = [],
}) {
  // Used to mirror the backend's SchoolYearAlreadyHasSections guard and
  // block the WHOLE clone the moment the target had any section at all.
  // That made sense when the target could only ever be a freshly-created
  // "Planning" year with nothing in it yet. Now that the target can also
  // be the current ACTIVE school year (which normally already has its
  // own sections), a blanket "already has sections" block would make
  // that case impossible. Instead, only skip the individual sections
  // that would collide BY NAME with something already under the target -
  // everything else still gets cloned in alongside what's already there.
  const targetSections = await getAllSections({ schoolYearId: targetSchoolYearId });
  const existingTargetNames = new Set(
    targetSections.map((section) => section.sectionName.trim().toLowerCase())
  );

  // No sectionStatus filter here on purpose - the backend's own clone
  // queries (findAllBySchoolYear_SchoolYearId[AndGradeLevel]) don't filter
  // by section status either, so both active AND archived sections under
  // the source year get copied, matching that behavior exactly.
  //
  // Always every section matched by sourceSchoolYearId/gradeLevel - no
  // per-section narrowing. This mirrors the backend's own newSchoolYear()
  // rule for the active-source path (all sections, or all sections in one
  // grade level, never a hand-picked subset), so both clone paths behave
  // identically instead of this one allowing something the other can't.
  const sectionsToClone = await getAllSections({ schoolYearId: sourceSchoolYearId, gradeLevel });

  if (sectionsToClone.length === 0) {
    throw new Error("This school year doesn't have sections yet");
  }

  // Build the batch payload locally first. Everything we can validate
  // without a network call is validated here, so a single bad row can't
  // take the whole batch down with it.
  const failed = [];
  const payload = [];

  for (const section of sectionsToClone) {
    if (existingTargetNames.has(section.sectionName.trim().toLowerCase())) {
      failed.push({
        sectionName: section.sectionName,
        reason: `"${targetLabel}" already has a section with this name.`,
      });
      continue;
    }

    let adviserId;

    if (section.adviser) {
      const adviser = advisers.find((candidate) => candidate.name === section.adviser);
      if (!adviser) {
        failed.push({
          sectionName: section.sectionName,
          reason: `Adviser "${section.adviser}" couldn't be matched to a current teacher.`,
        });
        continue;
      }
      adviserId = adviser.id;
    }

    payload.push({
      sectionName: section.sectionName,
      gradeLevel: section.gradeLevel,
      // Required by the backend's CloneSectionRequest (@NotNull) on every item,
      // even though cloneSectionBatch() itself uses batch-level targetSchoolYearId.
      schoolYear: targetSchoolYearId,
      userId: adviserId, // undefined when the source section had no adviser
    });
  }

  if (payload.length === 0) {
    return { created: [], failed };
  }

  // ONE request for the whole batch. The backend wraps this in a single
  // transaction, so if it succeeds every section is created, and if it
  // fails nothing is created.
  try {
    const created = await cloneSectionBatch(targetSchoolYearId, payload);
    return { created, failed };
  } catch (error) {
    // Batch is all-or-nothing: attribute the failure to every section
    // that was in the payload, since the backend rolled them all back.
    payload.forEach((s) =>
      failed.push({ sectionName: s.sectionName, reason: error.message })
    );
    return { created: [], failed };
  }
}

// WORKAROUND for a backend side effect: SectionService.newSchoolYear() (what
// startNewSchoolYear() above calls) closes the source school year whenever
// it was active, and its clearAdvisers() step then wipes the adviser off
// EVERY section under that school year - not just the ones matching the
// gradeLevel actually being cloned. So cloning just Grade 4, say, silently
// strips the adviser from every Grade 5/6 section left behind too, even
// though they were never touched by this clone.
//
// This wraps startNewSchoolYear() to snapshot every section under the
// source year right before the call (while advisers are still intact), then
// re-checks the same school year right after. Anything that had an adviser
// before but doesn't anymore gets it put back via updateSection() - from
// the caller's point of view, the collateral wipe never happened.
//
// LIMITATIONS (same reasoning as cloneSectionsAcrossSchoolYears() above):
// - SectionResponse only exposes the adviser as a display name, not a
//   userId, so a section can only be restored if that name still matches
//   someone in the `advisers` list passed in. A renamed/removed teacher
//   can't be resolved back to an id and is reported in `restoreFailed`
//   instead of silently left broken.
// - This can't do anything about advisers a PAST call already wiped - once
//   the name is gone there's no record left of who it used to be. It only
//   prevents new collateral damage from this call forward.
//
// PERF: the restore loop below still does one PATCH per section that lost
// its adviser - that's a much smaller set than "every section in the
// source year", usually zero after a normal clone. Left as-is on purpose;
// convert to a batch endpoint only if it ever becomes hot.
export async function startNewSchoolYearPreservingAdvisers({
  sourceSchoolYearId,
  targetSchoolYearId,
  gradeLevel,
  advisers = [],
}) {
  const before = await getAllSections({ schoolYearId: sourceSchoolYearId });
  const adviserBySectionId = new Map(
    before
      .filter((section) => section.adviser)
      .map((section) => [section.sectionId, section.adviser])
  );

  const clonedSections = await startNewSchoolYear({
    sourceSchoolYearId,
    targetSchoolYearId,
    gradeLevel,
  });

  const after = await getAllSections({ schoolYearId: sourceSchoolYearId });

  const restored = [];
  const restoreFailed = [];

  for (const section of after) {
    const previousAdviserName = adviserBySectionId.get(section.sectionId);
    // Nothing to do if it had no adviser before, or if it still has one now
    // (i.e. it was never touched by clearAdvisers() in the first place).
    if (!previousAdviserName || section.adviser) continue;

    const adviser = advisers.find((candidate) => candidate.name === previousAdviserName);
    if (!adviser) {
      restoreFailed.push({ sectionName: section.sectionName, adviserName: previousAdviserName });
      continue;
    }

    try {
      await updateSection(section.sectionId, { userId: adviser.id });
      restored.push(section.sectionName);
    } catch (error) {
      restoreFailed.push({
        sectionName: section.sectionName,
        adviserName: previousAdviserName,
        reason: error.message,
      });
    }
  }

  return { clonedSections, restored, restoreFailed };
}

export default sectionApi;