// This file is the ONE place all Enrollment-related API calls will
// live, once the Spring Boot backend is ready. Right now, every
// function below is a stub — it doesn't call a real endpoint yet,
// it just returns mock data so the rest of the app can be built and
// tested without waiting for the backend.
//
// When the backend IS ready, only this file needs to change — none
// of the components (EnrollStudentModal, StudentFilters, StudentTable)
// should need to change, since they already call these same function
// names/shapes.

// TODO: BACKEND CONNECTION
// GET /api/grade-levels
// Should return something like: ["Grade 7", "Grade 8", "Grade 9", "Grade 10"]
export async function getGradeLevels() {
  return Promise.resolve(["Grade 7", "Grade 8", "Grade 9", "Grade 10"]);
}

// TODO: BACKEND CONNECTION
// GET /api/sections?gradeLevel={gradeLevel}
// Should return sections belonging to the given grade level, e.g.
// [{ id: 1, name: "Apple" }, { id: 2, name: "Rose" }]
export async function getSections(gradeLevel) {
  const MOCK_SECTIONS = ["Apple", "Rose", "Jade"];
  return Promise.resolve(MOCK_SECTIONS);
}

// TODO: BACKEND CONNECTION
// GET /api/students?search={search}&level={level}&section={section}&status={status}&page={page}
// Should return { data: [...students], totalPages: number }
export async function getStudents({ search, level, section, status, page }) {
  return Promise.resolve({ data: [], totalPages: 1 });
}

// TODO: BACKEND CONNECTION
//   1. POST /api/students
//      Creates the student row (lrn, rfid, firstName, lastName,
//      middleInitial, birthdate, address, guardianName, guardianMobile).
//   2. POST /api/student-section-assignments
//      Assigns the newly created student to the chosen section.
export async function enrollStudent(values) {
  console.log("enrollStudent() called with:", values);
  return Promise.resolve({ success: true });
}

// TODO: BACKEND CONNECTION
// PATCH /api/students/{id}/status
// Updates a student's status (Enrolled/Dropped/Transferred).
export async function updateStudentStatus(studentId, newStatus) {
  console.log(`updateStudentStatus(${studentId}, "${newStatus}") called`);
  return Promise.resolve({ success: true });
}