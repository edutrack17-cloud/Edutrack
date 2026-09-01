package com.edutrack.user.controller;

import com.edutrack.user.dto.request.AdminCreateUserRequest;
import com.edutrack.user.dto.response.AdminCreateUserResponse;
import com.edutrack.user.entity.User;
import com.edutrack.user.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("api/user")
public class UserController {
    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    //CREATE
    @PreAuthorize("hasRole('admin')")
    @PostMapping("createTeacher")
    public ResponseEntity<AdminCreateUserResponse> createTeacher(@Valid @RequestBody AdminCreateUserRequest clientRequest){
        AdminCreateUserResponse createdUser = userService.createTeacher(clientRequest);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdUser);
    }

    //TEACHER DROPDOWN
    @PreAuthorize("hasRole('admin')")
    @GetMapping("teachers")
    public ResponseEntity<List<AdminCreateUserResponse>> teacherDropdown(){
        return ResponseEntity.ok(userService.teacherDropdown());
    }

}
