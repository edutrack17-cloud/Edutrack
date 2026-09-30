import React, { useEffect, useRef, useState } from "react";
import Activitylogtable from "./components/Activitylogtable";
import Activitylogheaderfilter from "./components/Activitylogheaderfilter";
import Activitylogpagination from "./components/Activitylogpagination";
import { getActivityLogs, getActivityLogHeaders } from "./Activitylogservice";

const PAGE_SIZE = 10;

function Activitylogspage() {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Exact value from the /headers list, sent as-is to the
  // backend's `logHeader` param - no debounce needed since this is a
  // dropdown pick, not free-typed text.
  const [logHeader, setLogHeader] = useState("");

  // Filter dropdown options, fetched once per page mount from
  // GET /api/activity-log/headers. A failure here only degrades the
  // dropdown to "All Activities"; the log list itself still works.
  const [headers, setHeaders] = useState([]);
  const [isHeadersLoading, setIsHeadersLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Same cancel-in-flight-request pattern as Sectionlevelpage.jsx, so a
  // stale response from an older filter/page can't overwrite a newer one.
  const abortControllerRef = useRef(null);

  async function loadLogs() {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setIsLoading(true);
      setErrorMessage("");

      const response = await getActivityLogs({
        logHeader,
        page: currentPage - 1,
        size: PAGE_SIZE,
        signal: controller.signal,
      });

      const newTotalPages = response.totalPages || 1;
      setTotalPages(newTotalPages);

      if (currentPage > newTotalPages) {
        setCurrentPage(newTotalPages);
        return;
      }

      setLogs(response.content);
    } catch (error) {
      if (error.code === "ERR_CANCELED") return;
      setErrorMessage(error.message);
    } finally {
      if (abortControllerRef.current === controller) setIsLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, [logHeader, currentPage]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadHeaders() {
      try {
        setHeaders(await getActivityLogHeaders({ signal: controller.signal }));
      } catch (error) {
        if (error.code === "ERR_CANCELED") return;
        console.warn("Activity log filters unavailable:", error.message);
      } finally {
        if (!controller.signal.aborted) setIsHeadersLoading(false);
      }
    }

    loadHeaders();
    return () => controller.abort();
  }, []);

  function handleFilterChange(event) {
    setLogHeader(event.target.value);
    setCurrentPage(1);
  }

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6 -mt-4">
      <div className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-md sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <Activitylogheaderfilter
            value={logHeader}
            onChange={handleFilterChange}
            headers={headers}
            isLoading={isHeadersLoading}
          />
        </div>

        {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}

        {isLoading ? (
          <p className="py-6 text-center text-sm text-gray-500">Loading activity...</p>
        ) : (
          <div className="flex flex-col gap-3">
            <Activitylogtable logs={logs} />
            <Activitylogpagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default Activitylogspage;