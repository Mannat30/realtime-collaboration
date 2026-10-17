
package com.realtime.realtime.controller;

import com.realtime.realtime.dto.UserSummaryResponse;
import com.realtime.realtime.repository.UserRepository;

import java.security.Principal;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping("/api/users")
    public List<UserSummaryResponse> getUsers(Principal principal) {

        if (principal == null || principal.getName() == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Authentication required"
            );
        }

        String currentEmail = principal.getName();

        return userRepository.findAll()
                .stream()
                .filter(user ->
                        !user.getEmail().equalsIgnoreCase(currentEmail))
                .map(user ->
                        new UserSummaryResponse(
                                user.getName(),
                                user.getEmail()
                        ))
                .toList();
    }
}
