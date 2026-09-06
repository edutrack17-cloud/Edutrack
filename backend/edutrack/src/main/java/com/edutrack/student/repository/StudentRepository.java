package com.edutrack.student.repository;

import com.edutrack.student.entity.Student;
import com.edutrack.student.enums.StudentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface StudentRepository extends JpaRepository<Student, Long>, JpaSpecificationExecutor<Student> {
    long countByStudentStatus(StudentStatus studentStatus);
    boolean existsByRfid(String rfid);
    boolean existsByLrn(String lrn);
    Optional<Student> findByLrn(String lrn);
    boolean existsByRfidAndStudentStatus(String rfid, StudentStatus studentStatus);
}
