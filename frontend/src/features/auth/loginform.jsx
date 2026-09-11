import React from "react";
import { useFormik } from "formik";
import { useNavigate } from "react-router-dom";
import { User, Lock, Loader2 } from "lucide-react";

import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import loginSchema from "./loginSchema";
import { loginUser } from "./authService";
import { useAuth } from "../../Context/Authcontext";

const MIN_LOADING_MS = 600;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function LoginForm() {
  const navigate = useNavigate();
  const { login } = useAuth();

  async function handleLoginSubmit(values, formikHelpers) {
    formikHelpers.setStatus(undefined);

    const startedAt = Date.now();

    try {
      const { user } = await loginUser(values);

      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_LOADING_MS) {
        await wait(MIN_LOADING_MS - elapsed);
      }

      login({ user });

      const redirectPath = user.role === "guard" ? "/guard-attendance" : "/dashboard";
      navigate(redirectPath, { replace: true });
    } catch (error) {
      formikHelpers.setStatus("Login failed. Please check your username and password.");
      formikHelpers.setSubmitting(false);
    }
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
        disabled={formik.isSubmitting}
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
        disabled={formik.isSubmitting}
      />

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => navigate("/forgot-password")}
          className="text-sm text-primary hover:underline"
        >
          Forgot password?
        </button>
      </div>

      {formik.status && <p className="text-sm text-danger">{formik.status}</p>}

      <Button
        type="submit"
        disabled={formik.isSubmitting}
        className="w-full bg-primary text-white hover:bg-sky-700 disabled:opacity-70 flex items-center justify-center gap-2"
      >
        {formik.isSubmitting ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          "Login"
        )}
      </Button>
    </form>
  );
}

export default LoginForm;