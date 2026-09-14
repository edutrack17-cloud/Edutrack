package com.edutrack.user.controller;

import com.edutrack.user.dto.request.AdminCreateUserRequest;
import com.edutrack.user.dto.request.UpdateUserRequest;
import com.edutrack.user.dto.response.UserResponse;
import com.edutrack.user.enums.AccountStatus;
import com.edutrack.user.repository.UserRepository;
import com.edutrack.user.service.UserService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("api/user")
public class UserController {
    private final UserService userService;
    private final UserRepository userRepository;

    public UserController(UserService userService, UserRepository userRepository) {
        this.userService = userService;
        this.userRepository = userRepository;
    }

    //CREATE
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("createTeacher")
    public ResponseEntity<UserResponse> createTeacher(@Valid @RequestBody AdminCreateUserRequest clientRequest){
        UserResponse createdUser = userService.createTeacher(clientRequest);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdUser);
    }

    //READ
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping
    public ResponseEntity<Page<UserResponse>> getUsers(Pageable pageable,
                                                       @RequestParam(required = false) AccountStatus accountStatus,
                                                       @RequestParam(required = false) String searchEntry){
        return ResponseEntity.ok(userService.getUsers(pageable, accountStatus, searchEntry));
    }

    //TEACHER DROPDOWN
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("teachers")
    public ResponseEntity<List<UserResponse>> teacherDropdown(){
        return ResponseEntity.ok(userService.teacherDropdown());
    }

    //READ LOGGED-IN USER
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @GetMapping("{userId}")
    public UserResponse readAuthenticatedUser(@PathVariable Long userId){
        UserResponse foundAuthenticatedUser = userService.authenticatedUser(userId);
        return ResponseEntity.ok(foundAuthenticatedUser).getBody();
    }

    //UPDATE
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @PatchMapping("update/{userId}")
    public ResponseEntity<UserResponse> updateUser(@PathVariable Long userId, @RequestBody UpdateUserRequest request){
        UserResponse updatedUser = userService.updateUser(userId, request);
        return ResponseEntity.ok(updatedUser);
    }

    //DISABLE ACCOUNT
    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("disable/{userId}")
    public ResponseEntity<UserResponse> disableUser(@PathVariable Long userId){
        UserResponse disabledUser = userService.disableAccount(userId);
        return ResponseEntity.ok(disabledUser);
    }

    //RESTORE ACCOUNT
    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("restore/{userId}")
    public ResponseEntity<UserResponse> restoreUser(@PathVariable Long userId){
        UserResponse restoredUser = userService.restoreAccount(userId);
        return ResponseEntity.ok(restoredUser);
    }

    //RESET PASSWORD
    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("{userId}/reset-password")
    public ResponseEntity<String> resetPassword(@PathVariable Long userId){
        userService.resetPassword(userId);
        return ResponseEntity.ok("Password reset successful");
    }

}
