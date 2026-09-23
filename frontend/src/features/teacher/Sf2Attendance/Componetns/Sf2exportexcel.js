// features/teacher/sf2Attendance/components/Sf2exportexcel.js
//
// UPDATED: the backend now renders the actual SF2 workbook server-side
// from the official DepEd template (SF2ReportService + SF2ReportController,
// GET /api/schoolform/sf2/{sectionId}?period=yyyy-MM). It returns the
// finished .xlsx file directly, so this module no longer builds the
// workbook itself.
//
// This now:
//   1. calls the endpoint for a specific section + month
//   2. reads the filename the server sent back (Content-Disposition)
//   3. patches known-broken formulas in the returned workbook (see
//      fixTotalsForTheMonth below) before the file ever touches disk
//   4. triggers the browser download
//
// AUTH: goes through the shared apiClient (createApiClient) instead
// of a raw fetch() + a locally-rolled getAccessToken(). apiClient.js
// already attaches the Bearer header, retries once on 401 via
// authService's refreshAccessToken(), redirects to /login if that
// retry also fails, and shares its rate-limit bucket with every other
// *Service.js file.
//
// PATCH (added after we caught this in a downloaded file): the backend's
// master template (templates/sf2-template.xlsx, loaded by
// SF2ReportService) has broken "Total for the Month" formulas. This is a
// template defect, not something SF2ReportService.java writes - the Java
// code only sets student name/attendance-mark/remarks cells and blanks
// unused rows; it never touches these formula cells. Until the template
// itself gets fixed on the backend, we re-open the downloaded workbook
// here with ExcelJS and rewrite the broken cells before saving:
//
//   - PRESENT column (AO): almost every roster row's COUNTIF is anchored
//     to the first row of its block (AO9..AO32 all read F8:AL8; AO35..AO60
//     all read F34:AL34) instead of its own row, so every student below
//     row 8 or row 34 showed the same PRESENT count as whoever's in that
//     first row - including blank rows, which is why an empty row showed
//     "1" instead of nothing.
//   - PRESENT subtotal/grand-total rows (33, 61, 62): same broken
//     single-row COUNTIF instead of a SUM over their block.
//   - ABSENT female-subtotal row (61): this one *is* a SUM, but its range
//     only covers AM34:AN58 instead of the full female block AM34:AN60 -
//     students landing in the last 2 female rows never make it into the
//     subtotal. Same fix, same column pair.
//
// The per-row ABSENT formulas (AM8..AM32, AM34..AM60) and the male
// subtotal (AM33) were already correct in the template and are left
// untouched.
//
// Requires "exceljs" as a dependency (npm install exceljs) - it's the
// same package this file used before the backend took over building the
// workbook, just reintroduced for read/patch/rewrite instead of building
// from scratch.

import ExcelJS from "exceljs";
import createApiClient from "../../../../services/apiClient";
import { buildPeriod } from "../Sf2attendanceservice";

const apiClient = createApiClient();

// Mirrors SF2ReportService.java's MALE_FIRST_ROW / MALE_LAST_ROW /
// FEMALE_FIRST_ROW / FEMALE_LAST_ROW and the F:AL day-mark column range
// its COUNTIF formulas use. Keep these in sync if the backend template's
// layout ever changes.
const MALE_FIRST_ROW = 8;
const MALE_LAST_ROW = 32;
const MALE_SUBTOTAL_ROW = 33;
const FEMALE_FIRST_ROW = 34;
const FEMALE_LAST_ROW = 60;
const FEMALE_SUBTOTAL_ROW = 61;
const GRAND_TOTAL_ROW = 62;

const FIRST_MARK_COL = "F";
const LAST_MARK_COL = "AL";
const ABSENT_COL = "AM";
const ABSENT_COL_WIDE = "AN"; // the template's ABSENT subtotal cells are a 2-col merge (AM:AN)
const PRESENT_COL = "AO";
const PRESENT_COL_WIDE = "AP"; // same, shifted two columns over for PRESENT (AO:AP)

export async function exportSf2Report({ sectionId, year, monthIndex }) {
  if (!sectionId) {
    throw new Error("Select a section before exporting.");
  }

  const period = buildPeriod(year, monthIndex);

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

  const patchedBlob = await fixTotalsForTheMonth(response.data);
  downloadBlob(patchedBlob, filename);
}

// Rewrites the broken "Total for the Month" cells described above. Falls
// back to the original, unpatched file on any error (corrupt blob, sheet
// shape we don't recognize, etc.) so a problem here never blocks the
// teacher's download outright - it just means they'd see the old bug
// instead of a failed export.
async function fixTotalsForTheMonth(blob) {
  try {
    const buffer = await blob.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) return blob;

    // PRESENT: every roster row counts its own day-mark cells.
    for (const [firstRow, lastRow] of [
      [MALE_FIRST_ROW, MALE_LAST_ROW],
      [FEMALE_FIRST_ROW, FEMALE_LAST_ROW],
    ]) {
      for (let row = firstRow; row <= lastRow; row++) {
        sheet.getCell(`${PRESENT_COL}${row}`).value = {
          formula: `COUNTIF(${FIRST_MARK_COL}${row}:${LAST_MARK_COL}${row},"P")`,
        };
      }
    }

    // PRESENT subtotals/grand total: SUM over the full block, mirroring
    // how the ABSENT column's (correct) male subtotal is built.
    sheet.getCell(`${PRESENT_COL}${MALE_SUBTOTAL_ROW}`).value = {
      formula: `SUM(${PRESENT_COL}${MALE_FIRST_ROW}:${PRESENT_COL_WIDE}${MALE_LAST_ROW})`,
    };
    sheet.getCell(`${PRESENT_COL}${FEMALE_SUBTOTAL_ROW}`).value = {
      formula: `SUM(${PRESENT_COL}${FEMALE_FIRST_ROW}:${PRESENT_COL_WIDE}${FEMALE_LAST_ROW})`,
    };
    sheet.getCell(`${PRESENT_COL}${GRAND_TOTAL_ROW}`).value = {
      formula: `SUM(${PRESENT_COL}${FEMALE_SUBTOTAL_ROW},${PRESENT_COL}${MALE_SUBTOTAL_ROW})`,
    };

    // ABSENT: only the female subtotal is wrong (short by the last 2 rows
    // of that block) - widen it to match the male subtotal's pattern.
    sheet.getCell(`${ABSENT_COL}${FEMALE_SUBTOTAL_ROW}`).value = {
      formula: `SUM(${ABSENT_COL}${FEMALE_FIRST_ROW}:${ABSENT_COL_WIDE}${FEMALE_LAST_ROW})`,
    };

    const patchedBuffer = await workbook.xlsx.writeBuffer();
    return new Blob([patchedBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
  } catch (error) {
    console.error("Failed to patch SF2 totals, downloading the unpatched file instead:", error);
    return blob;
  }
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

  // RFC 5987 extended form (filename*=UTF-8''name.xlsx) - takes priority
  // when present, since it's the only one that can carry non-ASCII names
  // correctly and browsers/servers that send both put the real name here.
  const extendedMatch = headerValue.match(/filename\*=(?:UTF-8''|utf-8'')?([^;]+)/i);
  if (extendedMatch) {
    const raw = extendedMatch[1].trim().replace(/^"|"$/g, "");
    try {
      return decodeURIComponent(raw);
    } catch {
      // Malformed percent-encoding - fall through and try the plain form.
    }
  }

  // Quoted filename="..." - capture everything between the quotes so a
  // filename containing a space (e.g. "SF2 Report.xlsx") isn't truncated
  // at the first one.
  const quotedMatch = headerValue.match(/filename="([^"]+)"/i);
  if (quotedMatch) return quotedMatch[1];

  // Unquoted filename=... - runs to the next ";" or the end of the header.
  const plainMatch = headerValue.match(/filename=([^;]+)/i);
  return plainMatch ? plainMatch[1].trim() : null;
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