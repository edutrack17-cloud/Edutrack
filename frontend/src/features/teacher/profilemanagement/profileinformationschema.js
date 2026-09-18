import * as Yup from "yup";

const profileManagementSchema = Yup.object({
  firstName: Yup.string().trim().required("First name is required"),

  middleName: Yup.string().trim(),

  lastName: Yup.string().trim().required("Last name is required"),

  username: Yup.string()
    .trim()
    .min(4, "Username must be at least 4 characters")
    .required("Username is required"),
});

export default profileManagementSchema;