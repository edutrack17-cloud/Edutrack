package com.edutrack.user.service;

import com.edutrack.user.dto.request.AdminCreateUserRequest;
import com.edutrack.user.dto.response.AdminCreateUserResponse;
import com.edutrack.user.entity.User;
import com.edutrack.user.exception.UsernameAlreadyExists;
import com.edutrack.user.mapper.UserMapper;
import com.edutrack.user.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

@Service
public class UserService {
    private final UserRepository userRepository;
    private final UserMapper userMapper;

    public UserService(UserRepository userRepository, UserMapper userMapper){
        this.userRepository = userRepository;
        this.userMapper = userMapper;
    }

    //CREATE
    @Transactional
    public AdminCreateUserResponse createTeacher(AdminCreateUserRequest request){
        if (userRepository.existsByUsername(request.username())){
            throw new UsernameAlreadyExists(request.username());
        }

        User userToBeSaved = userMapper.toEntity(request);
        User savedUser = userRepository.save(userToBeSaved);
        return userMapper.toResponseDTO(savedUser);
    }

}
