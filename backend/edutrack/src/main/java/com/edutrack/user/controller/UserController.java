package com.edutrack.user.controller;

import com.edutrack.user.dto.request.AdminCreateUserRequest;
import com.edutrack.user.dto.response.AdminCreateUserResponse;
import com.edutrack.user.entity.User;
import com.edutrack.user.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class UserController {
    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    //CREATE
    @PostMapping("createTeacher")
    public ResponseEntity<AdminCreateUserResponse> createTeacher(@Valid @RequestBody AdminCreateUserRequest clientRequest){
        AdminCreateUserResponse createdUser = userService.createTeacher(clientRequest);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdUser);
    }
}
