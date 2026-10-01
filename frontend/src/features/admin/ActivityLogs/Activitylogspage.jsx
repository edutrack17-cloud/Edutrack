import React, { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import Activitylogtable from "./components/Activitylogtable";
import Activitylogheaderfilter from "./components/Activitylogheaderfilter";
import Activitylogpagination from "./components/Activitylogpagination";
import { getActivityLogs, getActivityLogHeaders } from "./Activitylogservice";

const PAGE_SIZE = 10;

// How often the list quietly re-fetches while the admin is on page 1 and the
// tab is visible. New entries are created by other users' actions (teachers,
// etc.) in their own sessions, so this page has no other way to know they
// exist - it used to fetch only on open / filter change / page change.
const AUTO_REFRESH_MS = 15000;

function Activitylogspage() {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Exact value from the /headers list, sent as-is to the
  // backend's `logHeader` param - no debounce needed since this is a
  // dropdown pick, not free-typed text.
  const [logHeader, setLogHeader] = useState("");

  // Filter dropdown options, fetched once per page mount from
  // GET /api/activity-log/headers (and again on manual Refresh). A failure
  // here only degrades the dropdown to "All Activities"; the log list itself
  // still works.
  const [headers, setHeaders] = useState([]);
  const [isHeadersLoading, setIsHeadersLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Same cancel-in-flight-request pattern as Sectionlevelpage.jsx, so a
  // stale response from an older filter/page can't overwrite a newer one.
  const abortControllerRef = useRef(null);

  // background: true    -> keep the current list on screen (no "Loading
  //                        activity..." swap) while the new data comes in.
  // reportErrors: false -> a failed silent auto-refresh keeps the old list
  //                        instead of flashing an error every few seconds.
  async function loadLogs({ background = false, reportErrors = true } = {}) {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      if (!background) {
        setIsLoading(true);
        setErrorMessage("");
      }

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
      setErrorMessage("");
    } catch (error) {
      if (error.code === "ERR_CANCELED") return;
      if (reportErrors) {
        setErrorMessage(error.message);
      } else {
        console.warn("Activity log auto-refresh failed:", error.message);
      }
    } finally {
      if (abortControllerRef.current === controller) setIsLoading(false);
    }
  }

  // Always points at the latest loadLogs (with the current filter/page), so
  // the auto-refresh timer below never fetches with stale values.
  const loadLogsRef = useRef(loadLogs);
  loadLogsRef.current = loadLogs;

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

  // Auto-refresh: only on page 1 (where new entries show up, since the list is
  // newest-first) so older pages don't shift under the admin while reading.
  // Skipped while the tab is hidden, and it refreshes right away when the
  // admin switches back to the tab.
  useEffect(() => {
    if (currentPage !== 1) return undefined;

    function refreshIfVisible() {
      if (document.visibilityState === "visible") {
        loadLogsRef.current({ background: true, reportErrors: false });
      }
    }

    const intervalId = setInterval(refreshIfVisible, AUTO_REFRESH_MS);
    document.addEventListener("visibilitychange", refreshIfVisible);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [currentPage]);

  // Also re-fetches the filter list, so a brand-new kind of activity shows
  // up in the dropdown too.
  async function refreshHeaders() {
    try {
      setHeaders(await getActivityLogHeaders());
    } catch (error) {
      if (error.code === "ERR_CANCELED") return;
      console.warn("Activity log filters unavailable:", error.message);
    }
  }

  async function handleManualRefresh() {
    setIsManualRefreshing(true);
    await Promise.all([loadLogs({ background: true }), refreshHeaders()]);
    setIsManualRefreshing(false);
  }

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

          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isLoading || isManualRefreshing}
            className="flex h-9 items-center justify-center gap-2 rounded-md border border-gray/50 bg-white px-3 text-xs font-medium text-primary shadow-sm transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={14} className={isManualRefreshing ? "animate-spin" : ""} />
            Refresh
          </button>
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