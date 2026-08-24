// features/teacher/sf2Attendance/components/Sf2exportexcel.js
//
// Builds and downloads the SF2 report as an actual .xlsx workbook.
//
// IMPORTANT: imports "exceljs/dist/exceljs.min.js" instead of plain
// "exceljs". The plain package resolves to ExcelJS's Node build, which
// references Node core modules (fs, etc.) that don't exist in the
// browser - bundlers like Vite can pull that in silently, and the
// workbook.xlsx.writeBuffer() call then fails at runtime with no
// visible error if the caller doesn't catch it. The .min.js build is
// the browser-safe bundle and avoids that entirely.
//
//   npm install exceljs

import ExcelJS from "exceljs/dist/exceljs.min.js";

// ExcelJS fills use 8-digit ARGB. Same present/absent colors as
// Sf2attendancetable.jsx's STATUS_STYLES (bg-success / bg-danger).
const STATUS_EXCEL_COLORS = {
  present: "FF008C34",
  absent: "FFDC2626",
};

const HEADER_FILL = "FF01379A"; // matches th background (bg-primary)
const HEADER_FONT = { bold: true, color: { argb: "FFFFFFFF" } };
const CENTER = { horizontal: "center", vertical: "middle" };

export async function exportSf2ToExcel({
  gradeLevel,
  section,
  monthName,
  year,
  dayNumbers,
  filteredRecords,
  statusStyles,
}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SF2 Attendance";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(`SF2 ${monthName} ${year}`.slice(0, 31)); // Excel sheet-name limit

  const totalColumns = 3 + dayNumbers.length; // No, Name, LRN + one per day

  // Title
  sheet.mergeCells(1, 1, 1, totalColumns);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = "SF2 Attendance Report";
  titleCell.font = { bold: true, size: 14 };
  titleCell.alignment = CENTER;

  // Subtitle (grade level / section / month)
  sheet.mergeCells(2, 1, 2, totalColumns);
  const subtitleCell = sheet.getCell(2, 1);
  subtitleCell.value = `${gradeLevel || "All Levels"} - ${section || "All Sections"} - ${monthName} ${year}`;
  subtitleCell.font = { italic: true, color: { argb: "FF6B7280" } };
  subtitleCell.alignment = CENTER;

  // Header row
  const HEADER_ROW = 4;
  const headers = ["No", "Name", "LRN", ...dayNumbers.map(String)];
  headers.forEach((heading, index) => {
    const cell = sheet.getRow(HEADER_ROW).getCell(index + 1);
    cell.value = heading;
    cell.font = HEADER_FONT;
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    cell.alignment = CENTER;
  });
  sheet.getRow(HEADER_ROW).height = 20;

  // Data rows
  filteredRecords.forEach((record, rowOffset) => {
    const row = sheet.getRow(HEADER_ROW + 1 + rowOffset);

    row.getCell(1).value = rowOffset + 1;
    row.getCell(1).alignment = CENTER;

    row.getCell(2).value = record.name;
    row.getCell(2).alignment = { horizontal: "left", vertical: "middle" };

    row.getCell(3).value = record.lrn;
    row.getCell(3).alignment = CENTER;

    dayNumbers.forEach((day, dayIndex) => {
      const dayKey = record.days[day];
      const cell = row.getCell(4 + dayIndex);
      cell.value = statusStyles[dayKey]?.label ?? "";
      cell.alignment = CENTER;
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: STATUS_EXCEL_COLORS[dayKey] || "FFF3F4F6" },
      };
    });
  });

  // Column widths
  sheet.getColumn(1).width = 6;
  sheet.getColumn(2).width = 26;
  sheet.getColumn(3).width = 16;
  dayNumbers.forEach((_, index) => {
    sheet.getColumn(4 + index).width = 4;
  });

  // Thin borders on the whole table (title/subtitle excluded)
  for (let rowIndex = HEADER_ROW; rowIndex <= HEADER_ROW + filteredRecords.length; rowIndex++) {
    for (let colIndex = 1; colIndex <= totalColumns; colIndex++) {
      sheet.getRow(rowIndex).getCell(colIndex).border = {
        top: { style: "thin", color: { argb: "FF9CA3AF" } },
        left: { style: "thin", color: { argb: "FF9CA3AF" } },
        bottom: { style: "thin", color: { argb: "FF9CA3AF" } },
        right: { style: "thin", color: { argb: "FF9CA3AF" } },
      };
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `SF2_Attendance_${monthName}_${year}.xlsx`;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}