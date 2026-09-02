import React from "react";
import { useFormik } from "formik";
import { useNavigate } from "react-router-dom";
import { User, Lock } from "lucide-react";

import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import loginSchema from "./loginSchema";
import { loginUser } from "./authService";
import { useAuth } from "../../Context/Authcontext";

function LoginForm() {
  const navigate = useNavigate();
  const { login } = useAuth();

  async function handleLoginSubmit(values, formikHelpers) {
    formikHelpers.setStatus(undefined);

    try {
      // authService.loginUser() already returns { token, user: { id, username, role } }
      // normalized from the backend's LoginResponse - nothing left to map here.
      const { token, user } = await loginUser(values);

      login({ token, user });

      // Guards don't use the MainLayout/dashboard shell (no sidebar nav
      // items exist for them) - send them straight to their own screen.
      // Admins and teachers both land on /dashboard; MainLayout/Sidebar
      // already branch their UI off `role`.
      const redirectPath = user.role === "guard" ? "/guard-attendance" : "/dashboard";
      navigate(redirectPath, { replace: true });
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
    <form onSubmit={formik.handleSubmit} className="flex flex-col gap-4">
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

      {formik.status && <p className="text-sm text-danger">{formik.status}</p>}

      <Button type="submit" className="w-full bg-primary text-white hover:bg-sky-700">
        Login
      </Button>
    </form>
  );
}

export default LoginForm;