import React from "react";
import { useFormik } from "formik";
import { User, Lock } from "lucide-react";

import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import loginSchema from "./loginSchema";
import { loginUser } from "./authService";

function LoginForm() {
  async function handleLoginSubmit(values, formikHelpers) {
    formikHelpers.setStatus(undefined);

    try {
      // TODO: Connect to Spring Boot Login API
      // POST /api/auth/login
      const data = await loginUser(values);

      // TODO: JWT token storage (placeholder only for now)
      localStorage.setItem("token", data.token);

      // TODO: Redirect to the correct dashboard once it exists
      console.log("Login successful. Would redirect to a dashboard here.");
    } catch (error) {
      formikHelpers.setStatus("Login failed. Please check your username and password.");
    }

    formikHelpers.setSubmitting(false);
  }

  const formik = useFormik({
    initialValues: {
      username: "",
      password: "",
    },
    validationSchema: loginSchema,
    onSubmit: handleLoginSubmit,
  });

  return (
    <form onSubmit={formik.handleSubmit}>
      <Input
        label="Username"
        icon={<User size={18} />}
        id="username"
        name="username"
        type="text"
        placeholder="Enter your username"
        value={formik.values.username}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        error={formik.errors.username}
        touched={formik.touched.username}
      />

      <Input
        label="Password"
        icon={<Lock size={18} />}
        id="password"
        name="password"
        type="password"
        placeholder="Enter your password"
        value={formik.values.password}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        error={formik.errors.password}
        touched={formik.touched.password}
      />

      {formik.status && <p className="text-danger text-sm mb-4">{formik.status}</p>}

     <Button type="submit" className="w-full bg-primary text-white hover:bg-sky-700">
      Login
     </Button>
    </form>
  );
}

export default LoginForm;