package com.edutrack.student.repository;

import com.edutrack.student.entity.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface SectionRepository extends JpaRepository<Student, Long>, JpaSpecificationExecutor<Student> {
}
