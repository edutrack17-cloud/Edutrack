// EditStudentModal.jsx  (NEW FILE)
//
// Reuses StudentForm.jsx (same fields as EnrollStudentModal) but with
// three differences: pre-filled initial values from the selected
// student, a different title/button text, and PATCH instead of POST on
// submit.

import { useEffect, useState } from "react";
import { useFormik } from "formik";
import RfidFormModal from "./RfidFormModal";
import StudentForm from "./StudentForm";
import enrollSchema from "../enrollmentSchema";
// TODO: RE-ENABLE once backend ships GET /api/student/rfid/{rfid} - see
// the commented-out pre-check block in onSubmit below for why this is
// unused for now.
// import { findStudentByRfid } from "../enrollmentService";

// Best-effort split of StudentResponse's combined "fullName" - see the
// BACKEND GAP note in initialValues below for why this exists at all.
//
// The backend (NameUtil.buildFullName) sends this as
// "LastName, FirstName MiddleName" - e.g. "Trafalgar, Water Law D".
// Split off lastName on the comma first, then read the last remaining
// word as middleName and everything before it as firstName (firstName
// can be more than one word, as in that example: "Water Law").
function splitFullName(fullName) {
  if (!fullName) return { firstName: "", middleName: "", lastName: "" };

  const commaIndex = fullName.indexOf(",");
  if (commaIndex === -1) {
    // No comma - shouldn't happen once the backend sends the new
    // format, but fall back to the old best-effort behavior just in
    // case an older record slips through.
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return { firstName: parts[0], middleName: "", lastName: "" };
    if (parts.length === 2) return { firstName: parts[0], middleName: "", lastName: parts[1] };
    return {
      firstName: parts[0],
      middleName: parts.slice(1, -1).join(" "),
      lastName: parts[parts.length - 1],
    };
  }

  const lastName = fullName.slice(0, commaIndex).trim();
  const restParts = fullName.slice(commaIndex + 1).trim().split(/\s+/).filter(Boolean);

  if (restParts.length === 0) return { firstName: "", middleName: "", lastName };
  if (restParts.length === 1) return { firstName: restParts[0], middleName: "", lastName };

  return {
    firstName: restParts.slice(0, -1).join(" "),
    middleName: restParts[restParts.length - 1],
    lastName,
  };
}

function EditStudentModal({ isOpen, onClose, onSubmit, student, sections = [], onRefreshSections }) {
  const [isRfidModalOpen, setIsRfidModalOpen] = useState(false);

  // Same reasoning as EnrollStudentModal: refresh the section list on
  // every open instead of trusting whatever "sections" happened to be
  // sitting in EnrollmentPage's state, so an archived/restored section
  // shows up here without needing a full page reload.
  useEffect(() => {
    if (isOpen) onRefreshSections?.();
  }, [isOpen, onRefreshSections]);

  const formik = useFormik({
    // "enableReinitialize" makes formik pick up a NEW "student" prop
    // each time this modal is opened for a different row. Without this,
    // formik only reads initialValues once on first mount, so editing
    // Student A and then Student B would keep showing Student A's data.
    enableReinitialize: true,
    initialValues: (() => {
      // BACKEND GAP: GET /api/student only returns StudentResponse,
      // which has a single combined "fullName" (not firstName/
      // middleName/lastName), and StudentController has no GET-by-id
      // endpoint to fetch the split fields either. Until the backend
      // adds one, we best-effort split fullName on whitespace: first
      // word -> firstName, last word -> lastName, anything in between
      // -> middleName. This is unreliable for names with more than 3
      // parts, so double-check/re-type the name fields before saving.
      // Split once (not once per field) since it's a pure function of
      // student.fullName and formik re-runs this on every reinitialize.
      const { firstName, middleName, lastName } = splitFullName(student?.fullName);
      return {
        level: student?.section?.gradeLevel ?? "",
        sectionId: student?.section?.sectionId ?? "",
        lrn: student?.lrn ?? "",
        rfid: student?.rfid ?? "",
        admissionType: student?.admissionType ?? "",
        // StudentResponse already returns sex directly (no split needed,
        // unlike fullName above) - was missing here, so editing a
        // student always reopened with the Sex field blank.
        sex: student?.sex ?? "",
        firstName,
        middleName,
        lastName,
        birthDate: student?.birthDate ?? "",
        guardian: student?.guardian ?? "",
        guardianPhoneNumber: student?.guardianPhoneNumber ?? "",
      };
    })(),
    validationSchema: enrollSchema,
    onSubmit: async (values, helpers) => {
      // PATCH /api/student/{studentId} - called by StudentTable's
      // handleEditSubmit (via enrollmentService.updateStudent), which
      // this onSubmit prop points to.
      try {
        const payload = { ...values };

        // TODO: RE-ENABLE once backend ships GET /api/student/rfid/{rfid}.
        // Same duplicate-RFID pre-check as EnrollStudentModal (see the
        // note there and in enrollmentService.js) - PATCH /api/student
        // writes to the same @Column(unique = true) rfid column, so
        // assigning a card that another record still holds fails the
        // same way, with a bare 500. Disabled for now: the endpoint
        // doesn't exist on the backend yet, so this was a guaranteed 500
        // on every RFID change (extra latency + console noise), and
        // findStudentByRfid() fails soft and always returned null anyway
        // - removing it changes no behavior today. Restore once the
        // endpoint ships:
        //
        // if (values.rfid && values.rfid !== student?.rfid) {
        //   const cardOwner = await findStudentByRfid(values.rfid);
        //   if (cardOwner && cardOwner.studentId !== student?.studentId) {
        //     helpers.setStatus(`This RFID is already assigned to ${cardOwner.fullName}.`);
        //     return; // the finally below still clears isSubmitting
        //   }
        // }

        // Only send sectionId if it actually changed. StudentService.
        // updateStudent() re-validates sectionId's section (archived?
        // inactive school year?) whenever it's present in the request -
        // even if it's the SAME section the student is already in. The
        // Section dropdown here is built from getSections(), which only
        // lists ACTIVE sections, so if this student's current section
        // has since been archived, it won't be selected and Formik
        // still holds the original (now-archived) id. Sending that
        // unchanged id back would fail an unrelated edit (e.g. just
        // updating guardian phone) with "inactive section", even though
        // the section itself isn't part of what's being changed.
        if (String(values.sectionId) === String(student?.section?.sectionId ?? "")) {
          delete payload.sectionId;
        }

        await onSubmit?.(student?.studentId, payload);
        onClose();
      } catch (error) {
        helpers.setStatus(error.message);
      } finally {
        helpers.setSubmitting(false);
      }
    },
  });

  if (!isOpen || !student) return null;

  async function handleRfidConfirm(uid) {
    // Same fix as EnrollStudentModal's handleRfidConfirm: setFieldTouched
    // validates against the stale render's values (old rfid), which
    // brought the "required" error back even after a successful tap.
    // Touch WITHOUT validating, then set the value WITH validating so
    // the check runs against the new uid.
    formik.setFieldTouched("rfid", true, false);
    await formik.setFieldValue("rfid", uid, true);
    setIsRfidModalOpen(false);
  }

  return (
    <div className="font-primary fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-xl bg-white shadow-xl">
        <div className="flex shrink-0 items-center border-b border-gray-200 px-6 py-3">
          <h2 className="flex-1 text-center text-2xl font-bold text-primary">
            Edit Student
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <StudentForm
            formik={formik}
            sections={sections}
            onRfidClick={() => setIsRfidModalOpen(true)}
          />
          {formik.status && (
            <p className="mt-4 text-sm text-danger">{formik.status}</p>
          )}
        </div>

        <div className="flex shrink-0 gap-3 border-t border-gray-200 px-6 py-3">
          <button
            type="button"
            onClick={formik.handleSubmit}
            disabled={formik.isSubmitting}
            className="flex-1 cursor-pointer rounded-lg bg-primary py-2.5 text-base font-semibold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {formik.isSubmitting ? "Saving..." : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 cursor-pointer rounded-lg bg-secondary py-2.5 text-base font-semibold text-white transition-colors hover:bg-red-700"
          >
            Cancel
          </button>
        </div>
      </div>

      <RfidFormModal
        isOpen={isRfidModalOpen}
        onClose={() => setIsRfidModalOpen(false)}
        onConfirm={handleRfidConfirm}
      />
    </div>
  );
}

export default EditStudentModal;