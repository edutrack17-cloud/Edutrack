package com.edutrack.student.entity;

import com.edutrack.student.enums.AdmissionType;
import com.edutrack.student.enums.Sex;
import com.edutrack.student.enums.StudentStatus;
import com.edutrack.studentsectionassignment.entity.StudentSectionAssignment;
import jakarta.persistence.*;

import java.time.LocalDate;
import java.util.List;

@Entity
@Table(name = "students")
public class Student {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long studentId;

    @Column(nullable = false, length = 12, unique = true)
    private String lrn;

    @Column(nullable = false, length = 100)
    private String firstName;

    @Column(length = 100)
    private String middleName;

    @Column(nullable = false, length = 100)
    private String lastName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Sex sex;

    @Column(nullable = false)
    private LocalDate birthDate;

    @Column(nullable = false, length = 100)
    private String guardian;

    @Column(nullable = false, length = 11)
    private String guardianPhoneNumber;

    @Column(nullable = false, length = 255, unique = true)
    private String rfid;

    @Enumerated(EnumType.STRING)
    private StudentStatus studentStatus = StudentStatus.enrolled;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AdmissionType admissionType;

    @OneToMany(mappedBy = "student")
    private List<StudentSectionAssignment> studentSectionAssignments;

    public StudentStatus getStudentStatus() {
        return studentStatus;
    }

    public void setStudentStatus(StudentStatus studentStatus) {
        this.studentStatus = studentStatus;
    }

    public String getRfid() {
        return rfid;
    }

    public void setRfid(String rfid) {
        this.rfid = rfid;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public String getMiddleName() {
        return middleName;
    }

    public void setMiddleName(String middleName) {
        this.middleName = middleName;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public Sex getSex() {
        return sex;
    }

    public void setSex(Sex sex) {
        this.sex = sex;
    }

    public String getLrn() {
        return lrn;
    }

    public void setLrn(String lrn) {
        this.lrn = lrn;
    }

    public long getStudentId() {
        return studentId;
    }

    public void setStudentId(long studentId) {
        this.studentId = studentId;
    }

    public LocalDate getBirthDate() {
        return birthDate;
    }

    public void setBirthDate(LocalDate birthDate) {
        this.birthDate = birthDate;
    }

    public String getGuardian() {
        return guardian;
    }

    public void setGuardian(String guardian) {
        this.guardian = guardian;
    }

    public String getGuardianPhoneNumber() {
        return guardianPhoneNumber;
    }

    public void setGuardianPhoneNumber(String guardianPhoneNumber) {
        this.guardianPhoneNumber = guardianPhoneNumber;
    }

    public AdmissionType getAdmissionType() {
        return admissionType;
    }

    public void setAdmissionType(AdmissionType admissionType) {
        this.admissionType = admissionType;
    }

    public List<StudentSectionAssignment> getStudentSectionAssignments() {
        return studentSectionAssignments;
    }

    public void setStudentSectionAssignments(List<StudentSectionAssignment> studentSectionAssignments) {
        this.studentSectionAssignments = studentSectionAssignments;
    }
}
