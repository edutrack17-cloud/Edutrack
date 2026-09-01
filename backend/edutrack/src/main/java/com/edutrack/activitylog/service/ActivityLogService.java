package com.edutrack.activitylog.service;

import com.edutrack.activitylog.dto.request.CreateLogRequest;
import com.edutrack.activitylog.dto.response.ActivityLogResponse;
import com.edutrack.activitylog.repository.ActivityLogRepository;
import com.edutrack.user.entity.User;
import com.edutrack.user.exception.UserNotFoundException;
import com.edutrack.user.repository.UserRepository;
import org.springframework.stereotype.Service;

@Service
public class ActivityLogService {
    private final ActivityLogRepository activityLogRepository;
    private final UserRepository userRepository;

    public ActivityLogService(
            ActivityLogRepository activityLogRepository,
            UserRepository userRepository) {
        this.activityLogRepository = activityLogRepository;
        this.userRepository = userRepository;
    }

//    //CREATE LOG
//    public ActivityLogResponse createLogRecord(CreateLogRequest request){
//        User loggedInUser = userRepository.
//                findById(request.userId())
//                .orElseThrow(() -> new UserNotFoundException(request.userId()));
//
//
//    }
}
