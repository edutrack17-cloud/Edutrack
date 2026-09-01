package com.edutrack.security.revoketoken.service;

import com.edutrack.security.revoketoken.entity.RevokedToken;
import com.edutrack.security.revoketoken.repository.RevokedTokenRepository;
import org.springframework.stereotype.Service;
import java.time.Instant;

@Service
public class TokenRevocationService {

    private final RevokedTokenRepository revokedTokenRepository;

    public TokenRevocationService(RevokedTokenRepository revokedTokenRepository) {
        this.revokedTokenRepository = revokedTokenRepository;
    }

    public void revoke(String jti, Instant expiryDate) {
        revokedTokenRepository.save(new RevokedToken(jti, expiryDate));
    }

    public boolean isRevoked(String jti) {
        return revokedTokenRepository.existsByJti(jti);
    }
}