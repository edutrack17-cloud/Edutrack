import axios from "axios";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

const sectionApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

export const GRADE_LEVEL_OPTIONS = [
  { value: "Grade_4", label: "Grade 4" },
  { value: "Grade_5", label: "Grade 5" },
  { value: "Grade_6", label: "Grade 6" },
];

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || fallback;
}


export async function getSections({ search, gradeLevel, status, page = 0, size = 10 } = {}) {
  const params = {};
  if (search) params.fullName = search; // searches adviser name, not section name
  if (gradeLevel) params.gradeLevel = gradeLevel;
  if (status) params.sectionStatus = status;
  params.page = page;
  params.size = size;

  try {
    const { data } = await sectionApi.get("/section", { params });
    return {
      content: data.content || [],
      totalPages: data.totalPages || 1,
    };
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to load sections"));
  }
}


export async function createSection(data) {
  try {
    const response = await sectionApi.post("/section", data);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to create section"));
  }
}


export async function updateSection(sectionId, data) {
  try {
    const response = await sectionApi.patch(`/section/${sectionId}`, data);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to update section"));
  }
}


export async function archiveSection(sectionId) {
  try {
    const response = await sectionApi.patch(`/section/${sectionId}/section-status/archive`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to archive section"));
  }
}


export async function restoreSection(sectionId) {
  try {
    const response = await sectionApi.patch(`/section/${sectionId}/section-status/active`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to restore section"));
  }
}


export async function getTeachers() {
  try {
    const { data } = await sectionApi.get("/user", { params: { role: "teacher" } });
    const list = data.content ?? data; // adjust once real response shape is confirmed
    return list.map((teacher) => ({
      id: teacher.userId ?? teacher.id,
      // AdminCreateUserResponse confirms this codebase serializes a
      // single "fullName" field (not firstName/lastName separately),
      // so prefer that; keep the split-name fallback just in case a
      // list endpoint ends up shaped differently.
      name: teacher.fullName ?? `${teacher.firstName ?? ""} ${teacher.lastName ?? ""}`.trim(),
    }));
  } catch (error) {
    // Endpoint doesn't exist yet (or failed) - fall back to empty list
    // instead of breaking the Add Section form.
    console.warn("getTeachers(): teacher list endpoint not available yet -", getErrorMessage(error, "unknown error"));
    return [];
  }
}


export async function getSchoolYears() {
  try {
    const { data } = await sectionApi.get("/school-year", {
      params: { size: 100 }, 
    });
    return (data.content || []).map((sy) => ({ id: sy.schoolYearId, label: sy.schoolYearName }));
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to load school years"));
  }
}

export default sectionApi;