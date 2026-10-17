
package com.realtime.realtime.controller;

import com.realtime.realtime.dto.ChatMessage;
import com.realtime.realtime.entity.ChatMessageEntity;
import com.realtime.realtime.entity.User;
import com.realtime.realtime.repository.ChatMessageRepository;
import com.realtime.realtime.repository.UserRepository;

import java.security.Principal;
import java.util.List;

import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.server.ResponseStatusException;

@Controller
public class ChatController {

    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;

    public ChatController(
            ChatMessageRepository chatMessageRepository,
            UserRepository userRepository) {

        this.chatMessageRepository = chatMessageRepository;
        this.userRepository = userRepository;
    }

    @MessageMapping("/chat")
    @SendTo("/topic/messages")
    public ChatMessageEntity sendMessage(
            ChatMessage message,
            Principal principal) {

        // Require an authenticated WebSocket user.
        if (principal == null
                || principal.getName() == null
                || principal.getName().isBlank()) {

            throw new MessageDeliveryException(
                    "Authentication is required to send messages."
            );
        }

        // Resolve the sender using the authenticated JWT identity.
        User user = userRepository.findByEmail(principal.getName())
                .orElseThrow(() -> new MessageDeliveryException(
                        "Authenticated user was not found."
                ));

        if (message == null
                || message.getContent() == null
                || message.getContent().isBlank()) {

            throw new MessageDeliveryException(
                    "Message content cannot be empty."
            );
        }

        String content = message.getContent().trim();

        if (content.length() > 2000) {
            throw new MessageDeliveryException(
                    "Message cannot exceed 2000 characters."
            );
        }

        String sender = user.getName();

        if (sender == null || sender.isBlank()) {
            sender = user.getEmail();
        }

        sender = sender.trim();

        // The existing database column allows 50 characters.
        if (sender.length() > 50) {
            sender = sender.substring(0, 50);
        }

        // Ignore message.getSender(): the client cannot choose its identity.
        ChatMessageEntity chatMessage =
                new ChatMessageEntity(sender, content);

        // Persist the message before broadcasting it.
        return chatMessageRepository.save(chatMessage);
    }

    @GetMapping("/api/chat/history")
    @ResponseBody
    public List<ChatMessageEntity> getChatHistory() {

        return chatMessageRepository.findAll(
                Sort.by(Sort.Direction.ASC, "sentAt")
        );
    }
}
