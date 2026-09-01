package com.edutrack.user.mapper;

import com.edutrack.shared.util.NameUtil;
import com.edutrack.user.dto.request.AdminCreateUserRequest;
import com.edutrack.user.dto.response.UserResponse;
import com.edutrack.user.entity.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring", imports = NameUtil.class)
public interface UserMapper {

    @Mapping(target = "fullName", expression = "java(NameUtil.buildFullName(user.getFirstName(), user.getMiddleName(), user.getLastName()))")
    UserResponse toResponseDTO(User user);

    @Mapping(target = "userId", ignore = true)
    @Mapping(target = "accountStatus", ignore = true)
    @Mapping(target = "userRole", ignore = true)
    User toEntity(AdminCreateUserRequest clientRequest);


}
