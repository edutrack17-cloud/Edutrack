package com.edutrack.user.repository;

import com.edutrack.user.entity.User;
import com.edutrack.user.enums.AccountStatus;
import com.edutrack.user.enums.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {
    boolean existsByUsername(String username);
    List<User> findByUserRoleAndAccountStatus(UserRole role, AccountStatus accountStatus);
    Optional<User> findByUsername(String username);
    long countByUserRoleAndAccountStatus(UserRole userRole, AccountStatus accountStatus);
    Optional<User> findByContactNumber(String contactNumber);
    boolean existsByContactNumber(String contactNumber);
}
