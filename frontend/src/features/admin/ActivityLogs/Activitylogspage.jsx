import React, { useEffect, useRef, useState } from "react";
import Activitylogtable from "./components/Activitylogtable";
import Activitylogheaderfilter from "./components/Activitylogheaderfilter";
import Activitylogpagination from "./components/Activitylogpagination";
import { getActivityLogs } from "./Activitylogservice";

const PAGE_SIZE = 10;

function Activitylogspage() {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Exact value from Activitylogheaderfilter.jsx, sent as-is to the
  // backend's `logHeader` param - no debounce needed since this is a
  // dropdown pick, not free-typed text.
  const [logHeader, setLogHeader] = useState("");

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

  function handleFilterChange(event) {
    setLogHeader(event.target.value);
    setCurrentPage(1);
  }

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6 -mt-4">
      <div className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-md sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <Activitylogheaderfilter value={logHeader} onChange={handleFilterChange} />
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