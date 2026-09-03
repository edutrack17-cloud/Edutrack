package com.edutrack.activitylog.mapper;

import com.edutrack.activitylog.dto.response.ActivityLogResponse;
import com.edutrack.activitylog.entity.ActivityLog;
import com.edutrack.shared.util.NameUtil;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(
        componentModel = "spring",
        imports = {NameUtil.class}
)
public interface ActivityLogMapper {

    @Mapping(target = "userFullName",
    expression = "java(NameUtil.buildFullName(" +
                       "activityLog.getUser().getFirstName()," +
                       "activityLog.getUser().getMiddleName()," +
                       "activityLog.getUser().getLastName()))")
    ActivityLogResponse toActivityLogResponse(ActivityLog activityLog);
}
