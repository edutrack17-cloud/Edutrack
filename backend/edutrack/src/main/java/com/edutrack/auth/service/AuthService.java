package com.edutrack.auth.service;

import com.edutrack.auth.dto.request.LoginRequest;
import com.edutrack.auth.dto.response.LoginResponse;
import com.edutrack.refreshtoken.service.RefreshTokenService;
import com.edutrack.security.CustomUserDetails;
import com.edutrack.security.JwtService;
import com.edutrack.security.revoketoken.service.TokenRevocationService;
import com.edutrack.user.entity.User;
import jakarta.transaction.Transactional;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final TokenRevocationService tokenRevocationService;
    private final RefreshTokenService refreshTokenService;

    public AuthService(AuthenticationManager authenticationManager, JwtService jwtService, TokenRevocationService tokenRevocationService, RefreshTokenService refreshTokenService) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.tokenRevocationService = tokenRevocationService;
        this.refreshTokenService = refreshTokenService;
    }

    public LoginResponse login(LoginRequest request) {

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.username(),
                        request.password()
                )
        );

        CustomUserDetails userDetails =
                (CustomUserDetails) authentication.getPrincipal();

        User user = userDetails.getUser();

        String accessToken = jwtService.generateToken(userDetails);

        String refreshToken = refreshTokenService.createRefreshToken(user);

        return new LoginResponse(
                accessToken,
                refreshToken,
                user.getUserId(),
                user.getUsername(),
                user.getUserRole()
        );
    }

    @Transactional
    public LoginResponse refresh(String rawRefreshToken) {
        User user = refreshTokenService.rotateRefreshToken(rawRefreshToken);

        String newAccessToken = jwtService.generateToken(new CustomUserDetails(user));
        String newRefreshToken = refreshTokenService.createRefreshToken(user);

        return new LoginResponse(
                newAccessToken,
                newRefreshToken,
                user.getUserId(),
                user.getUsername(),
                user.getUserRole()
        );
    }

    @Transactional
    public void logout(String authHeader) {
        String token = authHeader.substring(7); // strip "Bearer "
        String jti = jwtService.extractJti(token);
        Instant expiry = jwtService.extractExpiration(token).toInstant();
        tokenRevocationService.revoke(jti, expiry);
    }
}