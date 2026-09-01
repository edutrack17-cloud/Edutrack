package com.edutrack.user.service;

import com.edutrack.user.dto.request.AdminCreateUserRequest;
import com.edutrack.user.dto.request.UpdateUserRequest;
import com.edutrack.user.dto.response.UserResponse;
import com.edutrack.user.entity.User;
import com.edutrack.user.enums.AccountStatus;
import com.edutrack.user.enums.UserRole;
import com.edutrack.user.exception.UserNotFoundException;
import com.edutrack.user.exception.UsernameAlreadyExists;
import com.edutrack.user.mapper.UserMapper;
import com.edutrack.user.repository.UserRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.parameters.P;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
@Transactional(readOnly = true)
@Service
public class UserService {
    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, UserMapper userMapper, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.userMapper = userMapper;
        this.passwordEncoder = passwordEncoder;
    }

    private User findUserByUserId(Long userId){
        return userRepository.findById(userId).orElseThrow(() -> new UserNotFoundException(userId));
    }

    //CREATE
    @Transactional
    public UserResponse createTeacher(AdminCreateUserRequest request){
        if (userRepository.existsByUsername(request.username())){
            throw new UsernameAlreadyExists(request.username());
        }

        User userToBeSaved = userMapper.toEntity(request);
        userToBeSaved.setPassword(passwordEncoder.encode(request.password()));

        User savedUser = userRepository.save(userToBeSaved);
        return userMapper.toResponseDTO(savedUser);
    }

    //TEACHER DROPDOWN
    public List<UserResponse> teacherDropdown(){
        return userRepository
                .findByUserRoleAndAccountStatus(UserRole.teacher, AccountStatus.active)
                .stream()
                .map(userMapper::toResponseDTO)
                .toList();
    }

    //READ LOGGED-IN USER
    @PreAuthorize("hasRole('ADMIN') or #userId == principal.user.userId")
    public UserResponse authenticatedUser(@P("userId") Long userId){
        User authUser = findUserByUserId(userId);
        return userMapper.toResponseDTO(authUser);
    }

    //UPDATE
    @Transactional
    @PreAuthorize("hasRole('ADMIN') or #userId == principal.user.userId")
    public UserResponse updateUser(@P("userId") Long userId, UpdateUserRequest request){
        User userToUpdate = findUserByUserId(userId);

        boolean changed = false;

        if (request.username() != null && !request.username().isBlank()) {
            if (!request.username().equals(userToUpdate.getUsername())
                    && userRepository.existsByUsername(request.username())) {
                throw new UsernameAlreadyExists(request.username());
            }
            userToUpdate.setUsername(request.username());
            changed = true;
        }

        if (request.firstName() != null && !request.firstName().isBlank()) {
            userToUpdate.setFirstName(request.firstName());
            changed = true;
        }

        if (request.middleName() == null || request.middleName().isBlank()) {
            if (userToUpdate.getMiddleName() != null) {
                userToUpdate.setMiddleName(null);
                changed = true;
            }
        } else {
            userToUpdate.setMiddleName(request.middleName());
            changed = true;
        }

        if (request.lastName() != null && !request.lastName().isBlank()) {
            userToUpdate.setLastName(request.lastName());
            changed = true;
        }

        if (request.password() != null && !request.password().isBlank()) {
            userToUpdate.setPassword(passwordEncoder.encode(request.password()));
            changed = true;
        }

        User savedUser = changed ? userRepository.save(userToUpdate) : userToUpdate;
        return userMapper.toResponseDTO(savedUser);
    }

}