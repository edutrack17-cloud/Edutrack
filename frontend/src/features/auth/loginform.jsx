
import { useFormik } from "formik";
import { useNavigate } from "react-router-dom";
import { User, Lock, Loader2 } from "lucide-react";

import Input from "../../components/ui/Input";
import Button from "../../components/ui/button";
import loginSchema from "./loginSchema";
import { loginUser } from "./authService";
import { useAuth } from "../../Context/AuthContext";

const MIN_LOADING_MS = 600;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Extracts the most useful error message from whatever the network
 * layer threw. Handles three shapes that can reach us here:
 *
 *   1. Raw axios error:    { response: { data: { message: "..." } } }
 *      -> produced by apiClient.js when it re-throws the original error.
 *
 *   2. Flattened Error:    { message: "..." }
 *      -> produced if any layer (authService.js, an interceptor,
 *         apiClient.js) does `throw new Error(response.data.message)`.
 *
 *   3. Anything else:      fall back to the generic string so the user
 *      never sees a blank error box.
 */
function extractErrorMessage(error) {
  return (
    error?.response?.data?.message ||   // axios error (preferred)
    error?.response?.data?.error ||     // some backends put it here
    error?.message ||                   // flattened Error
    "Login failed. Please check your username and password."
  );
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
      // Works whether the error survived as an axios error or got
      // flattened into a plain Error by a lower layer.
      formikHelpers.setStatus(extractErrorMessage(error));
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