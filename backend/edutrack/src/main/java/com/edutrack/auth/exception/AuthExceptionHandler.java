package com.edutrack.auth.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AccountExpiredException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.CredentialsExpiredException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.Map;

@RestControllerAdvice
public class AuthExceptionHandler {

    /**
     * Handles every AuthenticationException subclass thrown by
     * AuthenticationManager.authenticate(...) during login.
     *
     * Without this, Spring's default resolver treats them as generic
     * RuntimeExceptions and returns 500. We map each known cause to a
     * 401 with a clear message. The messages intentionally differentiate
     * "disabled account" from "bad credentials" so a legitimate user whose
     * account was disabled gets told why they can't log in - but we do NOT
     * reveal whether a given username exists (bad credentials covers both
     * "unknown user" and "wrong password").
     */
    @ExceptionHandler(DisabledException.class)
    public ResponseEntity<Map<String, Object>> handleDisabled(DisabledException ex) {
        return buildResponse(
                HttpStatus.UNAUTHORIZED,
                "Account is disabled. Please contact the administrator."
        );
    }

    @ExceptionHandler(LockedException.class)
    public ResponseEntity<Map<String, Object>> handleLocked(LockedException ex) {
        return buildResponse(
                HttpStatus.UNAUTHORIZED,
                "Account is locked. Please contact the administrator."
        );
    }

    @ExceptionHandler(AccountExpiredException.class)
    public ResponseEntity<Map<String, Object>> handleAccountExpired(AccountExpiredException ex) {
        return buildResponse(
                HttpStatus.UNAUTHORIZED,
                "Account has expired. Please contact the administrator."
        );
    }

    @ExceptionHandler(CredentialsExpiredException.class)
    public ResponseEntity<Map<String, Object>> handleCredentialsExpired(CredentialsExpiredException ex) {
        return buildResponse(
                HttpStatus.UNAUTHORIZED,
                "Credentials have expired. Please reset your password."
        );
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<Map<String, Object>> handleBadCredentials(BadCredentialsException ex) {
        // Deliberately generic: don't leak whether the username exists.
        return buildResponse(
                HttpStatus.UNAUTHORIZED,
                "Invalid username or password."
        );
    }

    /**
     * Fallback for any other AuthenticationException we didn't explicitly
     * handle above. Keeps the response shape identical to the specific
     * handlers so the frontend can parse it uniformly.
     */
    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<Map<String, Object>> handleOtherAuth(AuthenticationException ex) {
        return buildResponse(
                HttpStatus.UNAUTHORIZED,
                "Authentication failed."
        );
    }

    private ResponseEntity<Map<String, Object>> buildResponse(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(Map.of(
                "timestamp", LocalDateTime.now().toString(),
                "status", status.value(),
                "error", status.getReasonPhrase(),
                "message", message
        ));
    }
}