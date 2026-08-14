package com.edutrack.user.controller;

import com.edutrack.user.dto.request.AdminCreateUserRequest;
import com.edutrack.user.dto.response.AdminCreateUserResponse;
import com.edutrack.user.entity.User;
import com.edutrack.user.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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

    //TEACHER DROPDOWN
    @GetMapping("teachers")
    public ResponseEntity<List<AdminCreateUserResponse>> teacherDropdown(){
        return ResponseEntity.ok(userService.teacherDropdown());
    }

}
