package com.edutrack.activitylog.service;

import com.edutrack.activitylog.dto.request.CreateLogRequest;
import com.edutrack.activitylog.dto.response.ActivityLogResponse;
import com.edutrack.activitylog.entity.ActivityLog;
import com.edutrack.activitylog.mapper.ActivityLogMapper;
import com.edutrack.activitylog.repository.ActivityLogRepository;
import com.edutrack.activitylog.specification.ActivityLogSpecification;
import com.edutrack.security.SecurityUtils;
import com.edutrack.shared.util.NameUtil;
import com.edutrack.user.entity.User;
import com.edutrack.user.enums.UserRole;
import com.edutrack.user.exception.UserNotFoundException;
import com.edutrack.user.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.parameters.P;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class ActivityLogService {
    private final ActivityLogRepository activityLogRepository;
    private final UserRepository userRepository;
    private final ActivityLogMapper activityLogMapper;

    public ActivityLogService(
            ActivityLogRepository activityLogRepository,
            UserRepository userRepository, ActivityLogMapper activityLogMapper) {
        this.activityLogRepository = activityLogRepository;
        this.userRepository = userRepository;
        this.activityLogMapper = activityLogMapper;
    }

    //CREATE LOG
    @Transactional
    public void createLogRecord(String logHeader, String logDescription){
        Long currentUserId = SecurityUtils.getCurrentUserId();

        User loggedInUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new UserNotFoundException(currentUserId));

        String convertedRole = (loggedInUser.getUserRole().equals(UserRole.teacher) ? "Teacher" : "Admin");

        ActivityLog logToSave = new ActivityLog();
        logToSave.setUser(loggedInUser);
        logToSave.setLogHeader(logHeader);
        logToSave.setLogDescription(
                convertedRole + " " +
                NameUtil.buildFullName(
                  loggedInUser.getFirstName(),
                  loggedInUser.getMiddleName(),
                  loggedInUser.getLastName()
                )
                + " " + logDescription
        );
        logToSave.setCreatedAt(LocalDateTime.now());

        activityLogRepository.save(logToSave);
    }

    //READ
    public Page<ActivityLogResponse> getLogs(Pageable pageable, String logHeader){
        Specification<ActivityLog> filters = Specification
                .where(ActivityLogSpecification.hasHeader(logHeader));

        return activityLogRepository.findAll(filters, pageable)
                .map(activityLogMapper::toActivityLogResponse);
    }

    //DROPDOWN
    public List<String> getLogHeaders(){
        return activityLogRepository.findDistinctLogHeaders();
    }

}
