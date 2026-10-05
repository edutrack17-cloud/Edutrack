// features/auth/pages/Profileinformationpage.jsx

import { useEffect, useMemo, useState } from "react";
import { useFormik } from "formik";
import { Loader2, RotateCcw } from "lucide-react";
// Reusable confirm-before-you-save dialog, not tied to this page.
import ConfirmStatusModal from "../profilemanagement/components/ConfirmStatusModal";
import Input from "../../../components/ui/Input";
import { useToasts, ToastContainer } from "../../../components/ui/Toast";
// Reused, not duplicated: same validation rules an admin's edit runs through.
// NOTE: profileinformationschema.js is now dead code - delete it so the two
// schemas can't drift (it says username min 4, editUserSchema says min 3).
import { editUserSchema } from "../../admin/Usermanagement/UsermanagementSchema";
// Reuses the admin Usermanagement service - see getUser()'s comment there.
import { getUser, updateUser } from "../../admin/Usermanagement/Usermanagementservice";
import { useAuth } from "../../../Context/AuthContext";

const EDITABLE_FIELDS = ["firstName", "middleName", "lastName", "username", "contactNumber"];

const FIELD_LABELS = {
  firstName: "first name",
  middleName: "middle name",
  lastName: "last name",
  username: "username",
  contactNumber: "contact number",
};

const EMPTY_FORM = { firstName: "", middleName: "", lastName: "", username: "", contactNumber: "" };

// Same digit-only-while-typing behavior as Createusermodal.jsx, so a contact
// number can never hold letters/symbols or exceed 11 chars before Yup's
// MOBILE_REGEX (in editUserSchema) even runs.
function sanitizeDigits(value, maxDigits) {
  return value.replace(/\D/g, "").slice(0, maxDigits);
}

// Same read-only treatment as Viewusermodal.jsx's InfoField.
function InfoField({ label, value }) {
  return (
    <div>
      <p className="mb-1 text-sm font-semibold text-primary">{label}</p>
      <p className="text-sm text-gray-500">{value || "—"}</p>
    </div>
  );
}

function toFormValues(profile) {
  if (!profile) return EMPTY_FORM;
  return {
    firstName: profile.firstName ?? "",
    middleName: profile.middleName ?? "",
    lastName: profile.lastName ?? "",
    username: profile.username ?? "",
    contactNumber: profile.contactNumber ?? "",
  };
}

// Trailing spaces are invisible in the input but very visible in the database,
// and they make an unchanged field look changed. Everything is compared and
// submitted trimmed.
function trimFormValues(values) {
  return EDITABLE_FIELDS.reduce((trimmed, field) => {
    trimmed[field] = (values?.[field] ?? "").trim();
    return trimmed;
  }, {});
}

// Drives the dirty state and the wording of the confirm dialog - deliberately
// NOT the request body. UserService.updateUser() reads an absent middleName as
// "clear it" (null or blank -> setMiddleName(null)), so a partial body would
// delete an unchanged middle name. The PATCH therefore always carries all four
// name fields; re-sending an unchanged username is safe because the backend
// only runs existsByUsername() when the incoming username differs from the
// stored one.
function getChangedFields(values, profile) {
  const next = trimFormValues(values);
  const current = trimFormValues(toFormValues(profile));

  return EDITABLE_FIELDS.reduce((changes, field) => {
    if (next[field] !== current[field]) changes[field] = next[field];
    return changes;
  }, {});
}

function ProfileInformationPage() {
  const auth = useAuth() ?? {};
  const authUser = auth.user ?? null;
  // Tolerates either shape - AuthContext stores "id", the backend DTO says "userId".
  const userId = authUser?.id ?? authUser?.userId ?? null;

  const { toasts, showToast, dismissToast } = useToasts();

  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  // Bumped by "Try again" so a failed load is retryable without a full refresh.
  const [reloadToken, setReloadToken] = useState(0);

  // Save changes opens this confirm dialog instead of saving right away.
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pending, setPending] = useState(null); // { values, changes }
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Guards against a slow response landing after navigating away.
    let ignore = false;

    async function loadProfile() {
      if (!userId) {
        setLoadError("Your account information is unavailable. Log in again to continue.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setLoadError("");

      try {
        // CONNECTED: GET /api/user/{userId} - see getUser() in Usermanagementservice.js
        const data = await getUser(userId);
        if (!ignore) setProfile(data);
      } catch (error) {
        if (!ignore) {
          setLoadError(error.message);
          setProfile(null);
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    loadProfile();

    return () => {
      ignore = true;
    };
  }, [userId, reloadToken]);

  const initialValues = useMemo(() => toFormValues(profile), [profile]);

  const formik = useFormik({
    initialValues,
    // Picks up the fetched values once they land, since profile arrives after first render.
    enableReinitialize: true,
    validationSchema: editUserSchema,
    onSubmit: (values, formikHelpers) => {
      const changes = getChangedFields(values, profile);

      // Reachable via the Enter key even while Save is disabled, so it's a real
      // branch and not just belt-and-braces.
      if (Object.keys(changes).length === 0) {
        showToast("Nothing to save - your profile is unchanged.", "info");
        formikHelpers.setSubmitting(false);
        return;
      }

      // Validated values just get parked here - actual save happens on Confirm.
      setPending({ values: trimFormValues(values), changes });
      setIsConfirmOpen(true);
      formikHelpers.setSubmitting(false);
    },
  });

  const changedFields = useMemo(
    () => Object.keys(getChangedFields(formik.values, profile)),
    [formik.values, profile]
  );
  const hasChanges = changedFields.length > 0;

  // A half-finished edit shouldn't disappear silently on refresh or tab close.
  // NOTE: this covers the browser only - an in-app route change still leaves
  // without asking until a router blocker/prompt is wired up.
  useEffect(() => {
    if (!hasChanges) return;

    function handleBeforeUnload(event) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasChanges]);

  // Keeps the signed-in identity from going stale after a rename: the sidebar
  // greeting and anything else reading AuthContext / localStorage "user" would
  // otherwise keep the old name until the next login.
  function syncSignedInUser(savedValues, savedProfile) {
    const patch = {
      username: savedValues.username,
      firstName: savedValues.firstName,
      middleName: savedValues.middleName,
      lastName: savedValues.lastName,
      contactNumber: savedValues.contactNumber,
      fullName: savedProfile?.fullName,
    };
    Object.keys(patch).forEach((key) => patch[key] === undefined && delete patch[key]);

    // AuthContext has no setter yet - call one only if it ever shows up.
    const setAuthUser = auth.setUser ?? auth.updateUser ?? null;
    if (typeof setAuthUser === "function") {
      setAuthUser({ ...(authUser ?? {}), ...patch });
    }

    try {
      const raw = localStorage.getItem("user");
      if (raw) localStorage.setItem("user", JSON.stringify({ ...JSON.parse(raw), ...patch }));
    } catch (error) {
      console.warn("Could not sync the cached user:", error);
    }
  }

  function handleContactNumberChange(event) {
    formik.setFieldValue("contactNumber", sanitizeDigits(event.target.value, 11));
  }

  function handleReset() {
    formik.resetForm({ values: toFormValues(profile) });
  }

  function handleRetryLoad() {
    setReloadToken((token) => token + 1);
  }

  function handleCloseConfirm() {
    if (isSaving) return; // don't let a click dismiss mid-request
    setIsConfirmOpen(false);
    setPending(null);
  }

  async function handleConfirmSave() {
    if (!pending || isSaving) return;

    const { values, changes } = pending;

    setIsSaving(true);
    try {
      // CONNECTED: PATCH /api/user/update/{userId} - see updateUser() in Usermanagementservice.js
      // Full trimmed payload, not just `changes` - see getChangedFields().
      const saved = await updateUser(userId, values);

      // mapTeacherResponse() rebuilds first/middle/last by splitting fullName,
      // which scrambles multi-word names ("Dela Cruz" -> middle "Dela", last
      // "Cruz"). The values just submitted are the accurate ones, so server
      // fields win for fullName/role/status and local values win for the form.
      const nextProfile = { ...(profile ?? {}), ...saved, ...values };

      setProfile(nextProfile);
      // Clears dirty + touched so the form starts clean from the saved state.
      formik.resetForm({ values: toFormValues(nextProfile) });
      syncSignedInUser(values, saved);

      showToast(
        changes.username !== undefined
          ? "Profile saved. Use your new username the next time you log in."
          : "Profile saved.",
        "success"
      );

      setIsConfirmOpen(false);
      setPending(null);
    } catch (error) {
      // Stays open on failure so the person can see the toast and retry or cancel.
      showToast(error.message, "error");
    } finally {
      setIsSaving(false);
    }
  }

  const confirmMessage = useMemo(() => {
    if (!pending) return "";
    const labels = Object.keys(pending.changes).map((field) => FIELD_LABELS[field] ?? field);
    const list =
      labels.length === 1
        ? labels[0]
        : `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
    const loginNote =
      pending.changes.username !== undefined
        ? " You'll log in with the new username from now on."
        : "";
    return `This updates your ${list}.${loginNote}`;
  }, [pending]);

  return (
    <div className="w-full p-4 sm:p-6">
      <div className="flex w-full flex-col rounded-lg border border-gray-300 bg-white font-primary shadow-md">
        {isLoading && (
          <div className="flex flex-1 items-center justify-center gap-2 py-10 text-sm text-gray">
            <Loader2 size={18} className="animate-spin" />
            Loading your profile
          </div>
        )}

        {!isLoading && loadError && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-10 text-center">
            <p className="text-sm text-red-600">{loadError}</p>
            <button
              type="button"
              onClick={handleRetryLoad}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-gray-50"
            >
              <RotateCcw size={16} />
              Try again
            </button>
          </div>
        )}

        {!isLoading && !loadError && (
          // A real <form> so Enter inside any field submits, instead of doing nothing.
          <form onSubmit={formik.handleSubmit} noValidate className="flex flex-col">
            <div className="px-4 py-6 sm:px-8">
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input
                    label="First Name"
                    id="firstName"
                    name="firstName"
                    type="text"
                    placeholder="Enter your first name"
                    value={formik.values.firstName}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.errors.firstName}
                    touched={formik.touched.firstName}
                    disabled={isSaving}
                  />

                  <Input
                    label="Middle Name"
                    id="middleName"
                    name="middleName"
                    type="text"
                    placeholder="Optional"
                    value={formik.values.middleName}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.errors.middleName}
                    touched={formik.touched.middleName}
                    disabled={isSaving}
                  />

                  <Input
                    label="Last Name"
                    id="lastName"
                    name="lastName"
                    type="text"
                    placeholder="Enter your last name"
                    value={formik.values.lastName}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.errors.lastName}
                    touched={formik.touched.lastName}
                    disabled={isSaving}
                  />

                  <Input
                    label="Username"
                    id="username"
                    name="username"
                    type="text"
                    placeholder="Enter your username"
                    value={formik.values.username}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.errors.username}
                    touched={formik.touched.username}
                    disabled={isSaving}
                  />

                  <div className="sm:col-span-2">
                    <Input
                      label="Contact Number"
                      id="contactNumber"
                      name="contactNumber"
                      type="text"
                      placeholder="09xxxxxxxxx"
                      value={formik.values.contactNumber}
                      onChange={handleContactNumberChange}
                      onBlur={formik.handleBlur}
                      error={formik.errors.contactNumber}
                      touched={formik.touched.contactNumber}
                      disabled={isSaving}
                      maxLength={11}
                      inputMode="numeric"
                    />
                  </div>

                  <InfoField label="Role" value={profile?.role} />
                  <InfoField label="Account Status" value={profile?.status} />
                </div>

                <p className="text-sm text-gray">
                  Changing your username also changes what you type when you log in.
                </p>

                <p className="text-sm text-warning" aria-live="polite">
                  {hasChanges ? "You have unsaved changes." : ""}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 gap-3 border-t border-gray-200 px-4 py-3 sm:px-8">
              {/* Both stay disabled until something is actually edited, so
                  there's nothing to click when there's nothing to save or undo. */}
              <button
                type="submit"
                disabled={isSaving || !hasChanges}
                className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Save Changes
              </button>

              <button
                type="button"
                onClick={handleReset}
                disabled={isSaving || !hasChanges}
                className="flex-1 cursor-pointer rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Discard Changes
              </button>
            </div>
          </form>
        )}
      </div>

      <ConfirmStatusModal
        isOpen={isConfirmOpen}
        onClose={handleCloseConfirm}
        onConfirm={handleConfirmSave}
        title="Save profile changes?"
        message={confirmMessage}
        confirmLabel="Save Changes"
        isSubmitting={isSaving}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default ProfileInformationPage;