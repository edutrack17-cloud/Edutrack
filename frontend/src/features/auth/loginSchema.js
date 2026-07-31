// this is for validation of username and password
import * as Yup from "yup";

const loginSchema = Yup.object({
  username: Yup.string()
    .required("Username is required"),

  password: Yup.string()
    .min(6, "Password must be at least 6 characters")
    .max(20, "Password must not exceed 20 characters")
    .matches(/[0-9]/, "Password must contain at least one number like")
    .required("Password is required"),
});

export default loginSchema;