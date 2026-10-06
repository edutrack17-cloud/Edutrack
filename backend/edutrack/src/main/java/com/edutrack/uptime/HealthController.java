package com.edutrack.uptime;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

    private final JdbcTemplate jdbcTemplate;

    public HealthController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping("/db-keepalive")
    public ResponseEntity<String> keepAlive() {
        try {
            // This forces a query, which validates the connection
            Integer result = jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            return ResponseEntity.ok("DB OK: " + result);
        } catch (Exception e) {
            // Log the error, but return a 500 so UptimeRobot knows something's wrong
            return ResponseEntity.status(500).body("DB Error");
        }
    }
}