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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for UserService.
 *
 * NOTE: User/AdminCreateUserRequest/UpdateUserRequest/UserResponse are mocked rather than
 * constructed, since their exact field lists weren't in the snippet shared. Only the
 * accessor methods UserService actually calls are stubbed. Swap in real instances if you'd
 * rather assert on concrete field values.
 */
@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserMapper userMapper;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserService userService;

    @Nested
    @DisplayName("createTeacher")
    class CreateTeacherTests {

        private AdminCreateUserRequest request;
        private User mappedEntity;
        private User savedEntity;
        private UserResponse expectedResponse;

        @BeforeEach
        void setUp() {
            request = mock(AdminCreateUserRequest.class);
            mappedEntity = mock(User.class);
            savedEntity = mock(User.class);
            expectedResponse = mock(UserResponse.class);

            when(request.username()).thenReturn("jdoe");
        }

        @Test
        @DisplayName("creates and returns the user when the username is free")
        void createsUser_whenUsernameIsAvailable() {
            when(request.password()).thenReturn("plainPassword");
            when(userRepository.existsByUsername("jdoe")).thenReturn(false);
            when(userMapper.toEntity(request)).thenReturn(mappedEntity);
            when(passwordEncoder.encode("plainPassword")).thenReturn("encodedPassword");
            when(userRepository.save(mappedEntity)).thenReturn(savedEntity);
            when(userMapper.toResponseDTO(savedEntity)).thenReturn(expectedResponse);

            UserResponse actual = userService.createTeacher(request);

            assertEquals(expectedResponse, actual);
            verify(mappedEntity).setPassword("encodedPassword");
            verify(userRepository).save(mappedEntity);
        }

        @Test
        @DisplayName("throws and never saves when the username is already taken")
        void throws_whenUsernameAlreadyExists() {
            when(userRepository.existsByUsername("jdoe")).thenReturn(true);

            assertThrows(UsernameAlreadyExists.class, () -> userService.createTeacher(request));

            verify(userRepository, never()).save(any());
            verifyNoInteractions(userMapper, passwordEncoder);
        }
    }

    @Nested
    @DisplayName("teacherDropdown")
    class TeacherDropdownTests {

        @Test
        @DisplayName("maps every active teacher to a UserResponse")
        void returnsMappedActiveTeachers() {
            User teacherOne = mock(User.class);
            User teacherTwo = mock(User.class);
            when(userRepository.findByUserRoleAndAccountStatus(UserRole.teacher, AccountStatus.active))
                    .thenReturn(List.of(teacherOne, teacherTwo));
            when(userMapper.toResponseDTO(any(User.class))).thenReturn(mock(UserResponse.class));

            List<UserResponse> result = userService.teacherDropdown();

            assertEquals(2, result.size());
            verify(userMapper, times(2)).toResponseDTO(any(User.class));
        }

        @Test
        @DisplayName("returns an empty list when there are no active teachers")
        void returnsEmptyList_whenNoneFound() {
            when(userRepository.findByUserRoleAndAccountStatus(UserRole.teacher, AccountStatus.active))
                    .thenReturn(List.of());

            List<UserResponse> result = userService.teacherDropdown();

            assertTrue(result.isEmpty());
            verifyNoInteractions(userMapper);
        }
    }

    @Nested
    @DisplayName("authenticatedUser")
    class AuthenticatedUserTests {
        // @PreAuthorize is enforced by Spring's AOP security proxy. Calling the method
        // directly on a Mockito-injected instance bypasses it entirely, so these tests
        // only cover the method body. The authorization rule itself needs a slice test
        // (e.g. @WebMvcTest, or a full security-context integration test) to exercise.

        @Test
        @DisplayName("returns the mapped user when found")
        void returnsUser_whenFound() {
            User user = mock(User.class);
            UserResponse expected = mock(UserResponse.class);
            when(userRepository.findById(1L)).thenReturn(Optional.of(user));
            when(userMapper.toResponseDTO(user)).thenReturn(expected);

            UserResponse actual = userService.authenticatedUser(1L);

            assertEquals(expected, actual);
        }

        @Test
        @DisplayName("throws when the user does not exist")
        void throws_whenNotFound() {
            when(userRepository.findById(99L)).thenReturn(Optional.empty());

            assertThrows(UserNotFoundException.class, () -> userService.authenticatedUser(99L));
        }
    }

    @Nested
    @DisplayName("updateUser")
    class UpdateUserTests {

        private User existingUser;

        @BeforeEach
        void setUp() {
            existingUser = mock(User.class);
            when(userRepository.findById(1L)).thenReturn(Optional.of(existingUser));
        }

        @Test
        @DisplayName("updates the username when it's new and free")
        void updatesUsername_whenAvailable() {
            when(existingUser.getUsername()).thenReturn("oldName");
            UpdateUserRequest request = mock(UpdateUserRequest.class);
            when(request.username()).thenReturn("newName");
            when(userRepository.existsByUsername("newName")).thenReturn(false);
            when(userRepository.save(existingUser)).thenReturn(existingUser);
            when(userMapper.toResponseDTO(existingUser)).thenReturn(mock(UserResponse.class));

            userService.updateUser(1L, request);

            verify(existingUser).setUsername("newName");
            verify(userRepository).save(existingUser);
        }

        @Test
        @DisplayName("throws when the new username is already taken")
        void throws_whenUsernameTaken() {
            when(existingUser.getUsername()).thenReturn("oldName");
            UpdateUserRequest request = mock(UpdateUserRequest.class);
            when(request.username()).thenReturn("takenName");
            when(userRepository.existsByUsername("takenName")).thenReturn(true);

            assertThrows(UsernameAlreadyExists.class, () -> userService.updateUser(1L, request));

            verify(userRepository, never()).save(any());
        }

        @Test
        @DisplayName("clears the middle name when the request sends a blank one")
        void clearsMiddleName_whenBlankRequested() {
            when(existingUser.getMiddleName()).thenReturn("Existing");
            UpdateUserRequest request = mock(UpdateUserRequest.class);
            when(request.middleName()).thenReturn("  ");
            when(userRepository.save(existingUser)).thenReturn(existingUser);
            when(userMapper.toResponseDTO(existingUser)).thenReturn(mock(UserResponse.class));

            userService.updateUser(1L, request);

            verify(existingUser).setMiddleName(null);
            verify(userRepository).save(existingUser);
        }

        @Test
        @DisplayName("leaves the middle name untouched when it's already null and the request is blank")
        void skipsMiddleNameChange_whenAlreadyNullAndRequestBlank() {
            when(existingUser.getMiddleName()).thenReturn(null);
            UpdateUserRequest request = mock(UpdateUserRequest.class);
            when(request.middleName()).thenReturn(null);
            when(userMapper.toResponseDTO(existingUser)).thenReturn(mock(UserResponse.class));

            userService.updateUser(1L, request);

            verify(existingUser, never()).setMiddleName(any());
            verify(userRepository, never()).save(any());
        }

        @Test
        @DisplayName("encodes and sets a new password when one is provided")
        void encodesPassword_whenProvided() {
            UpdateUserRequest request = mock(UpdateUserRequest.class);
            when(request.password()).thenReturn("newPlainPassword");
            when(passwordEncoder.encode("newPlainPassword")).thenReturn("newEncodedPassword");
            when(userRepository.save(existingUser)).thenReturn(existingUser);
            when(userMapper.toResponseDTO(existingUser)).thenReturn(mock(UserResponse.class));

            userService.updateUser(1L, request);

            verify(existingUser).setPassword("newEncodedPassword");
            verify(userRepository).save(existingUser);
        }

        @Test
        @DisplayName("returns the mapped entity without saving when nothing changed")
        void doesNotSave_whenNoFieldsProvided() {
            when(existingUser.getMiddleName()).thenReturn(null);
            UpdateUserRequest request = mock(UpdateUserRequest.class);
            when(userMapper.toResponseDTO(existingUser)).thenReturn(mock(UserResponse.class));

            userService.updateUser(1L, request);

            verify(userRepository, never()).save(any());
        }
    }
}