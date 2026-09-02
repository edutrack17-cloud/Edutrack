package com.edutrack.activitylog.service;

import com.edutrack.activitylog.dto.request.CreateLogRequest;
import com.edutrack.activitylog.dto.response.ActivityLogResponse;
import com.edutrack.activitylog.entity.ActivityLog;
import com.edutrack.activitylog.repository.ActivityLogRepository;
import com.edutrack.security.SecurityUtils;
import com.edutrack.user.entity.User;
import com.edutrack.user.exception.UserNotFoundException;
import com.edutrack.user.repository.UserRepository;
import org.springframework.security.core.parameters.P;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@Transactional(readOnly = true)
public class ActivityLogService {
    private final ActivityLogRepository activityLogRepository;
    private final UserRepository userRepository;

    public ActivityLogService(
            ActivityLogRepository activityLogRepository,
            UserRepository userRepository) {
        this.activityLogRepository = activityLogRepository;
        this.userRepository = userRepository;
    }

    //CREATE LOG
    @Transactional
    public void createLogRecord(String logHeader, String logDescription){
        Long currentUserId = SecurityUtils.getCurrentUserId();

        User loggedInUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new UserNotFoundException(currentUserId));

        ActivityLog logToSave = new ActivityLog();
        logToSave.setUser(loggedInUser);
        logToSave.setLogHeader(logHeader);
        logToSave.setLogDescription(logDescription);
        logToSave.setCreatedAt(LocalDateTime.now());

        activityLogRepository.save(logToSave);
    }
}
