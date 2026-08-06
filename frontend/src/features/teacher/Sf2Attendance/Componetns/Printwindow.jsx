// Printwindow.jsx
//
// Builds and opens the browser's native print/PDF window for the SF2
// report. Pulled out of Sf2attendancepage.jsx into its own file since
// this HTML-string-building logic doesn't really belong mixed in with
// the page's own state/JSX — it's a self-contained "given this data,
// open a print window" helper, so it's exported as a plain function
// rather than a component (nothing here ever gets rendered by React
// itself; it writes directly into a separate browser window).

// This print window is a completely separate document - it can't
// reach into index.css or use Tailwind classes, so the day-cell colors
// are hardcoded here as plain hex values.
const STATUS_PRINT_COLORS = {
  present: { bg: "#008C34", text: "#ffffff" },
  absent: { bg: "#dc2626", text: "#ffffff" },
};

export function openSf2PrintWindow({
  gradeLevel,
  section,
  monthName,
  year,
  dayNumbers,
  filteredRecords,
  statusStyles,
}) {
  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    alert("Please allow pop-ups for this site to export as PDF.");
    return;
  }

  const headerCells = ["No", "Name", "LRN", ...dayNumbers.map(String)]
    .map((heading) => `<th>${heading}</th>`)
    .join("");

  const bodyRows = filteredRecords
    .map((record, index) => {
      const dayCells = dayNumbers
        .map((day) => {
          const dayKey = record.days[day];
          const colors = STATUS_PRINT_COLORS[dayKey] || {
            bg: "#f3f4f6",
            text: "#374151",
          };

          const label = statusStyles[dayKey]?.label ?? "";

          return `
            <td style="
              background:${colors.bg};
              color:${colors.text};
              font-weight:bold;
            ">
              ${label}
            </td>
          `;
        })
        .join("");

      return `
        <tr>
          <td>${index + 1}</td>
          <td class="name-cell">${record.name}</td>
          <td>${record.lrn}</td>
          ${dayCells}
        </tr>
      `;
    })
    .join("");

  printWindow.document.write(`
    <html>
      <head>
        <title>SF2 Attendance - ${monthName} ${year}</title>

        <style>
          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            color-adjust: exact;
          }

          body {
            font-family: Arial, Helvetica, sans-serif;
            padding: 24px;
            color: #374151;
          }

          h1 {
            font-size: 16px;
            margin: 0 0 4px;
            text-align: center;
          }

          p {
            font-size: 12px;
            margin: 0 0 16px;
            text-align: center;
          }

          table {
            border-collapse: collapse;
            width: 100%;
            font-size: 10px;
          }

          th,
          td {
            border: 1px solid #9ca3af;
            padding: 4px 6px;
            text-align: center;
          }

          th {
            background: #01379A;
            color: #ffffff;
          }

          td.name-cell {
            text-align: left;
            white-space: nowrap;
          }

          .legend {
            display: flex;
            justify-content: center;
            gap: 16px;
            margin: 0 0 12px;
            font-size: 11px;
          }

          .legend span {
            display: inline-flex;
            align-items: center;
            gap: 4px;
          }

          .legend i {
            display: inline-block;
            width: 10px;
            height: 10px;
            border-radius: 2px;
          }

          @media print {
            body {
              padding: 0;
            }
          }
        </style>
      </head>

      <body>
        <h1>SF2 Attendance Report</h1>

        <p>
          ${gradeLevel || "All Levels"} -
          ${section || "All Sections"} -
          ${monthName} ${year}
        </p>

        <div class="legend">
          <span>
            <i style="background:${STATUS_PRINT_COLORS.present.bg}"></i>
            Present
          </span>

          <span>
            <i style="background:${STATUS_PRINT_COLORS.absent.bg}"></i>
            Absent
          </span>
        </div>

        <table>
          <thead>
            <tr>${headerCells}</tr>
          </thead>

          <tbody>
            ${bodyRows}
          </tbody>
        </table>
      </body>
    </html>
  `);

  printWindow.document.close();

  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 250);
}