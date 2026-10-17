
package com.realtime.realtime.controller;

import com.realtime.realtime.dto.PrivateMessageRequest;
import com.realtime.realtime.entity.ChatMessageEntity;
import com.realtime.realtime.entity.PrivateChatMessageEntity;
import com.realtime.realtime.entity.User;
import com.realtime.realtime.repository.PrivateChatMessageRepository;
import com.realtime.realtime.repository.UserRepository;

import jakarta.validation.Valid;

import java.security.Principal;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/private/messages")
public class PrivateChatController {

    private final PrivateChatMessageRepository privateMessageRepository;
    private final UserRepository userRepository;

    public PrivateChatController(
            PrivateChatMessageRepository privateMessageRepository,
            UserRepository userRepository) {

        this.privateMessageRepository = privateMessageRepository;
        this.userRepository = userRepository;
    }

    @PostMapping
    public PrivateChatMessageEntity sendPrivateMessage(
            @Valid @RequestBody PrivateMessageRequest request,
            Principal principal) {

        if (principal == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Authentication is required"
            );
        }

        // Determine the sender from the authenticated JWT principal.
        User sender = userRepository.findByEmail(principal.getName())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Authenticated user not found"
                ));

        String requestedEmail = request.getReceiverEmail().trim();

        User receiver = userRepository.findByEmail(requestedEmail)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Recipient not found"
                ));

        String content = request.getContent().trim();

        if (content.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Message content cannot be empty"
            );
        }

        if (content.length() > 2000) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Message cannot exceed 2000 characters"
            );
        }

        PrivateChatMessageEntity message =
                new PrivateChatMessageEntity(
                        sender.getEmail(),
                        receiver.getEmail(),
                        content
                );

        return privateMessageRepository.save(message);
    }

    @GetMapping
    public List<PrivateChatMessageEntity> getPrivateConversation(
            @RequestParam("with") String otherEmail,
            Principal principal) {

        if (principal == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Authentication is required"
            );
        }

        User currentUser = userRepository.findByEmail(principal.getName())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Authenticated user not found"
                ));

        if (otherEmail == null || otherEmail.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Recipient email is required"
            );
        }

        User otherUser = userRepository.findByEmail(otherEmail.trim())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Recipient not found"
                ));

        // Return only messages between these two authenticated users.
        return privateMessageRepository.findConversation(
                currentUser.getEmail(),
                otherUser.getEmail()
        );
    }
}
