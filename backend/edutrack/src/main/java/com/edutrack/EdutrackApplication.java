package com.edutrack;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@SpringBootApplication
public class EdutrackApplication {

    public static void main(String[] args) {
        SpringApplication.run(EdutrackApplication.class, args);
    }

    @GetMapping
    public String welcome(){
        return "Welcome to Edutrack API";
    }

}
