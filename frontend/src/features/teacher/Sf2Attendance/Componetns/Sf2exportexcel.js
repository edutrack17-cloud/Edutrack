// features/teacher/sf2Attendance/components/Sf2exportexcel.js
//
// UPDATED: the backend now renders the actual SF2 workbook server-side
// from the official DepEd template (SF2ReportService + SF2ReportController,
// GET /api/schoolform/sf2/{sectionId}?period=yyyy-MM). It returns the
// finished .xlsx file directly, so this module no longer builds the
// workbook itself - ExcelJS is no longer needed here at all.
//
// This now just:
//   1. calls the endpoint for a specific section + month
//   2. reads the filename the server sent back (Content-Disposition)
//   3. triggers the browser download
//
// AUTH: now goes through the shared apiClient (createApiClient) instead
// of a raw fetch() + a locally-rolled getAccessToken(). That resolves
// the earlier TODO: apiClient.js already attaches the Bearer header,
// retries once on 401 via authService's refreshAccessToken(), redirects
// to /login if that retry also fails, and shares its rate-limit bucket
// with every other *Service.js file - all of which this file no longer
// needs to duplicate.

import createApiClient from "../../../../services/apiClient"; // 

const apiClient = createApiClient();

export async function exportSf2Report({ sectionId, year, monthIndex }) {
  if (!sectionId) {
    throw new Error("Select a section before exporting.");
  }

  
  const period = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;

  let response;
  try {
   
    response = await apiClient.get(`/schoolform/sf2/${sectionId}`, {
      params: { period },
      responseType: "blob",
    });
  } catch (error) {
    throw new Error(await resolveErrorMessage(error));
  }

  const filename =
    filenameFromContentDisposition(response.headers["content-disposition"]) ||
    `SF2_${period}.xlsx`;

  downloadBlob(response.data, filename);
}


async function resolveErrorMessage(error) {
  const response = error.response;
  if (!response) {
    return "Failed to export SF2 report. Please try again.";
  }

  const body = await parseBlobErrorBody(response.data);
  if (body?.message) return body.message;

  switch (response.status) {
    case 401:
      return "Your session has expired. Please log in again.";
    case 403:
      return "You're not authorized to export this section's SF2 report.";
    case 404:
      return "That section could not be found.";
    case 422:
      return "This section has too many students or school days to fit the SF2 template.";
    default:
      return "Failed to export SF2 report. Please try again.";
  }
}

async function parseBlobErrorBody(data) {
  if (!(data instanceof Blob)) return null;
  try {
    return JSON.parse(await data.text());
  } catch {
    return null;
  }
}

function filenameFromContentDisposition(headerValue) {
  if (!headerValue) return null;
  const match = headerValue.match(/filename="?([^"; ]+)"?/i);
  return match ? match[1] : null;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}