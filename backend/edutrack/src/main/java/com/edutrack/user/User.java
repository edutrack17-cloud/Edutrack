package com.edutrack.user;

import com.edutrack.activitylogs.ActivityLog;
import com.edutrack.section.Section;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long userId;

    @NotBlank
    @Size(max = 100)
    @Column(nullable = false, name = "username", length = 100)
    private String username;

    @NotBlank
    @Size(max = 255)
    @Column(nullable = false, name = "password")
    private String password;

    @NotBlank
    @Size(max = 100)
    @Column(nullable = false, name = "first_name", length = 100)
    private String firstName;

    @Size(max = 100)
    @Column(name = "middle_name", length = 100)
    private String middleName;

    @NotBlank
    @Size(max = 100)
    @Column(nullable = false, name = "last_name", length = 100)
    private String lastName;

    @NotBlank
    @Enumerated(EnumType.STRING)
    private UserRole userRole = UserRole.teacher;

    @NotBlank
    @Enumerated(EnumType.STRING)
    private AccountStatus accountStatus = AccountStatus.active;

    @OneToMany(mappedBy = "user")
    private List<ActivityLog> activityLogs;

    @OneToMany(mappedBy = "user")
    private List<Section> sections;


    public long getUserId() {
        return userId;
    }

    public void setUserId(long userId) {
        this.userId = userId;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getMiddleName() {
        return middleName;
    }

    public void setMiddleName(String middleName) {
        this.middleName = middleName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public UserRole getUserRole() {
        return userRole;
    }

    public void setUserRole(UserRole userRole) {
        this.userRole = userRole;
    }

    public AccountStatus getAccountStatus() {
        return accountStatus;
    }

    public void setAccountStatus(AccountStatus accountStatus) {
        this.accountStatus = accountStatus;
    }

    public List<ActivityLog> getActivityLogs() {
        return activityLogs;
    }

    public void setActivityLogs(List<ActivityLog> activityLogs) {
        this.activityLogs = activityLogs;
    }

    public List<Section> getSections() {
        return sections;
    }

    public void setSections(List<Section> sections) {
        this.sections = sections;
    }
}
