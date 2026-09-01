package com.edutrack.user.service;

import com.edutrack.user.dto.request.AdminCreateUserRequest;
import com.edutrack.user.dto.response.AdminCreateUserResponse;
import com.edutrack.user.entity.User;
import com.edutrack.user.enums.AccountStatus;
import com.edutrack.user.enums.UserRole;
import com.edutrack.user.exception.InvalidRole;
import com.edutrack.user.exception.UsernameAlreadyExists;
import com.edutrack.user.mapper.UserMapper;
import com.edutrack.user.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

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

    //CREATE
    @Transactional
    public AdminCreateUserResponse createTeacher(AdminCreateUserRequest request){
        if (userRepository.existsByUsername(request.username())){
            throw new UsernameAlreadyExists(request.username());
        }

        User userToBeSaved = userMapper.toEntity(request);
        userToBeSaved.setPassword(passwordEncoder.encode(request.password()));

        User savedUser = userRepository.save(userToBeSaved);
        return userMapper.toResponseDTO(savedUser);

    }

    //TEACHER DROPDOWN
    public List<AdminCreateUserResponse> teacherDropdown(){
        return userRepository
                .findByUserRoleAndAccountStatus(UserRole.teacher, AccountStatus.active)
                .stream()
                .map(userMapper::toResponseDTO)
                .toList();
    }

}
