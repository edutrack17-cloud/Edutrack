package com.edutrack.security.revoketoken.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "revoked_tokens")
public class RevokedToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String jti;

    @Column(nullable = false, name = "expiry_date")
    private Instant expiryDate;

    public RevokedToken() {}

    public RevokedToken(String jti, Instant expiryDate) {
        this.jti = jti;
        this.expiryDate = expiryDate;
    }

    public Long getId() { return id; }
    public String getJti() { return jti; }
    public Instant getExpiryDate() { return expiryDate; }
}