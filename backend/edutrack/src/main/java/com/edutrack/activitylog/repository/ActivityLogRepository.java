package com.edutrack.activitylog.repository;

import com.edutrack.activitylog.entity.ActivityLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long>, JpaSpecificationExecutor<ActivityLog> {
    @Query("SELECT DISTINCT a.logHeader FROM ActivityLog a ORDER BY a.logHeader ASC")
    List<String> findDistinctLogHeaders();
}
