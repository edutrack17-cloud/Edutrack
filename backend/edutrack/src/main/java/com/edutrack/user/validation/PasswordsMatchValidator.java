package com.edutrack.user.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.lang.reflect.Method;

public class PasswordsMatchValidator implements ConstraintValidator<PasswordsMatch, Object> {

    private String passwordField;
    private String confirmPasswordField;

    @Override
    public void initialize(PasswordsMatch constraintAnnotation) {
        this.passwordField = constraintAnnotation.passwordField();
        this.confirmPasswordField = constraintAnnotation.confirmPasswordField();
    }

    @Override
    public boolean isValid(Object value, ConstraintValidatorContext context) {
        if (value == null) {
            return true;
        }

        try {
            Method passwordMethod = value.getClass().getMethod(passwordField);
            Method confirmPasswordMethod = value.getClass().getMethod(confirmPasswordField);

            Object password = passwordMethod.invoke(value);
            Object confirmPassword = confirmPasswordMethod.invoke(value);

            // If password is null or blank, skip validation (update scenario where password isn't changed)
            if (password == null || password.toString().isBlank()) {
                return true;
            }

            return password.equals(confirmPassword);

        } catch (Exception e) {
            return false;
        }
    }
}