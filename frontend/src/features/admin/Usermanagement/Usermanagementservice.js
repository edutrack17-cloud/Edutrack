import axios from "axios";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

const userApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

userApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

userApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || fallback;
}

function normalizeWhitespace(str) {
  return (str || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function splitFullName(fullName) {
  const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", middleName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], middleName: "", lastName: "" };
  return {
    firstName: parts[0],
    lastName: parts[parts.length - 1],
    middleName: parts.slice(1, -1).join(" "),
  };
}

function mapTeacherResponse(teacher) {
  const { firstName, middleName, lastName } = splitFullName(teacher.fullName);
  return {
    id: teacher.userId,
    username: teacher.username,
    fullName: teacher.fullName,
    firstName,
    middleName,
    lastName,

    role: teacher.userRole === "admin" ? "Admin" : "Teacher",
    status: teacher.accountStatus === "active" ? "Active" : "Disabled",

    // Filled in (if a match is found) by the TEMPORARY STOPGAP in
    // getUsers() below - left undefined here as the "no match" default.
    assignedGradeLevel: undefined,
    assignedSectionName: undefined,
  };
}

// TEMPORARY STOPGAP - remove once the backend adds real section-assignment
// data to GET /api/teachers.
//
// sections.adviser_id is a one-way FK (Section -> User, confirmed via the
// ERD and Section.java) - there is no reverse lookup from a teacher back to
// their section, so GET /api/teachers has nothing to tell us who's
// assigned where.
//
// v1 of this stopgap used GET /api/section/dropdown, but that endpoint
// filters to sections where BOTH sectionStatus = active AND the section's
// schoolYear is the single system-wide "active" one (see
// SectionSpecification.hasSchoolYearStatus()). In practice that meant a
// section that's genuinely active (e.g. "Narra", status: Active on the
// Section Level table) still didn't show up here just because its school
// year (2026-2027) wasn't the one currently flagged active (2027-2028) -
// which reads as "not assigned" even though the adviser clearly IS
// currently teaching that section.
//
// v2 (this version) uses plain GET /api/section instead, filtered ONLY by
// sectionStatus=active - no school-year restriction - which is what
// Sectiontable.jsx's own list is built from, so "active" here means the
// same thing it means on the Section Level page.
//
// KNOWN RISKS - still a stopgap, not the real fix:
//   - Name collisions: adviser has no userId attached (plain string match).
//   - Whitespace/casing: depends on fullName being built identically on
//     both sides (NameUtil.buildFullName).
//   - A teacher can now match MORE THAN ONE active section (e.g. still
//     marked active in both 2026-2027 and 2027-2028) - see the tie-break
//     in getUsers() below, which picks the latest schoolYear label. This
//     is a heuristic, not a guarantee - if that's wrong for your data,
//     the real fix (backend join) is the only reliable answer.
//   - Unpaginated fetch (size: 1000) - fine for a normal school's section
//     count, but not infinitely scalable.
async function getActiveSectionsByAdviserName() {
  try {
    const { data } = await userApi.get("/section", {
      params: { sectionStatus: "active", page: 0, size: 1000 },
    });
    return data.content || []; // [{ sectionId, sectionName, schoolYear, gradeLevel, sectionStatus, adviser }]
  } catch (error) {
    console.warn(
      "getActiveSectionsByAdviserName(): failed to load sections for the assigned-section stopgap -",
      getErrorMessage(error, "unknown error")
    );
    return [];
  }
}

// CONNECT: GET /api/teachers
// Only list endpoint that exists - it only returns ACTIVE teacher
// accounts (no disabled accounts, no admins), so status/search filtering
// and pagination are done client-side here instead of via query params.
// Also calls GET /api/section (filtered to sectionStatus=active only, NOT
// restricted to the currently-active school year) once, as a TEMPORARY
// STOPGAP to fill in assignedGradeLevel/assignedSectionName by matching
// adviser NAME strings - see getActiveSectionsByAdviserName() below for
// why, and its known risks. Delete that call once the backend adds real
// section-assignment data to the teacher response.
export async function getUsers({ status, search, page = 1, size = 10 } = {}) {
  try {
    const { data } = await userApi.get("user/teachers");
    let mapped = data.map(mapTeacherResponse);

    // TEMPORARY STOPGAP - see getActiveSectionsByAdviserName() above.
    // Skipped gracefully (mapped stays as-is, "Not yet assigned") if this
    // fails - a broken section lookup shouldn't take down the whole
    // teacher list.
    const activeSections = await getActiveSectionsByAdviserName();
    if (activeSections.length > 0) {
      mapped = mapped.map((teacher) => {
        const matches = activeSections.filter(
          (section) => normalizeWhitespace(section.adviser) === normalizeWhitespace(teacher.fullName)
        );

        if (matches.length === 0) {
          // DEBUG (stopgap-only) - helps tell apart "this teacher really
          // has no active section" from "the name strings don't match
          // byte-for-byte". Safe to delete alongside the rest of the
          // stopgap once the backend adds real assignment data.
          console.debug(
            `[assigned-section stopgap] no match for "${teacher.fullName}". ` +
              `Active section advisers: [${activeSections.map((s) => `"${s.adviser}"`).join(", ")}]`
          );
          return teacher;
        }

        // A teacher can match more than one active section across
        // different school years (see the note on
        // getActiveSectionsByAdviserName above) - pick whichever has the
        // latest schoolYear label ("2027-2028" > "2026-2027" as a plain
        // string comparison, since both sides use the same "YYYY-YYYY"
        // format). This is a heuristic, not a guarantee.
        const match = matches.reduce((latest, current) =>
          current.schoolYear > latest.schoolYear ? current : latest
        );

        if (matches.length > 1) {
          console.debug(
            `[assigned-section stopgap] "${teacher.fullName}" matched ${matches.length} active sections ` +
              `(${matches.map((s) => `${s.sectionName} - ${s.schoolYear}`).join(", ")}) - using "${match.sectionName} - ${match.schoolYear}".`
          );
        }

        return { ...teacher, assignedGradeLevel: match.gradeLevel, assignedSectionName: match.sectionName };
      });
    } else {
      // DEBUG (stopgap-only): an EMPTY sections list here means every
      // teacher will show "Not yet assigned" regardless of real data -
      // check that GET /api/section is returning anything with
      // sectionStatus=active at all.
      console.debug(
        "[assigned-section stopgap] GET /api/section returned no active sections."
      );
    }

    if (search) {
      const term = normalizeWhitespace(search);
      mapped = mapped.filter((u) => {
        // Prefer the backend's own `fullName` - it's already a single
        // correctly-spaced string. Fall back to rebuilding from parts
        // only if `fullName` wasn't provided, filtering out the empty
        // middle name instead of always inserting a space for it -
        // otherwise a user with no middle name gets "Juan  Cruz"
        // (double space) here, which silently fails to match a
        // normally-typed "Juan Cruz" search term.
        const searchableName = normalizeWhitespace(
          u.fullName || [u.firstName, u.middleName, u.lastName].filter(Boolean).join(" ")
        );

        return searchableName.includes(term) || u.username.toLowerCase().includes(term);
      });
    }

    if (status) {
      mapped = mapped.filter((u) => u.status.toLowerCase() === status.toLowerCase());
    }

    const totalPages = Math.max(1, Math.ceil(mapped.length / size));
    const start = (page - 1) * size;
    const content = mapped.slice(start, start + size);

    return { content, totalPages };
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to load users"));
  }
}

export async function createUser(formData) {
  try {
    const { data } = await userApi.post("/createTeacher", {
      username: formData.username,
      password: formData.password,
      firstName: formData.firstName,
      middleName: formData.middleName,
      lastName: formData.lastName,
    });
    return mapTeacherResponse(data);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to create user"));
  }
}

// NOT AVAILABLE YET - throws until the backend adds an update endpoint.
export async function updateUser(userId, formData) {
  throw new Error("Editing users isn't available yet - the backend has no update endpoint.");
}

// NOT AVAILABLE YET - throws until the backend adds a status endpoint.
export async function toggleUserStatus(userId, status) {
  throw new Error("Activating/deactivating users isn't available yet - the backend has no status endpoint.");
}

export default userApi;