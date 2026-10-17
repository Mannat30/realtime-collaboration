
package com.realtime.realtime.controller;

import com.realtime.realtime.dto.PrivateMessageRequest;
import com.realtime.realtime.entity.PrivateChatMessageEntity;
import com.realtime.realtime.entity.User;
import com.realtime.realtime.repository.PrivateChatMessageRepository;
import com.realtime.realtime.repository.UserRepository;

import java.security.Principal;

import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.stereotype.Controller;

@Controller
public class PrivateChatSocketController {

    private final PrivateChatMessageRepository messageRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public PrivateChatSocketController(
            PrivateChatMessageRepository messageRepository,
            UserRepository userRepository,
            SimpMessagingTemplate messagingTemplate) {

        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
        this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping("/private-chat")
    public void sendPrivateMessage(
            PrivateMessageRequest request,
            Principal principal) {

        if (principal == null) {
            throw new MessageDeliveryException(
                    "Authentication is required."
            );
        }

        if (request == null
                || request.getReceiverEmail() == null
                || request.getReceiverEmail().isBlank()
                || request.getContent() == null
                || request.getContent().isBlank()) {

            throw new MessageDeliveryException(
                    "Recipient and message content are required."
            );
        }

        String senderEmail = principal.getName();
        String receiverEmail = request.getReceiverEmail().trim();
        String content = request.getContent().trim();

        if (content.length() > 2000) {
            throw new MessageDeliveryException(
                    "Message cannot exceed 2000 characters."
            );
        }

        User sender = userRepository.findByEmail(senderEmail)
                .orElseThrow(() -> new MessageDeliveryException(
                        "Authenticated sender was not found."
                ));

        User receiver = userRepository.findByEmail(receiverEmail)
                .orElseThrow(() -> new MessageDeliveryException(
                        "Recipient was not found."
                ));

        if (sender.getEmail().equalsIgnoreCase(receiver.getEmail())) {
            throw new MessageDeliveryException(
                    "You cannot send a private message to yourself."
            );
        }

        PrivateChatMessageEntity message =
                new PrivateChatMessageEntity(
                        sender.getEmail(),
                        receiver.getEmail(),
                        content
                );

        // Save the message before delivering it.
        PrivateChatMessageEntity savedMessage =
                messageRepository.save(message);

        // Deliver only to the sender and intended recipient.
        messagingTemplate.convertAndSendToUser(
                sender.getEmail(),
                "/queue/private",
                savedMessage
        );

        messagingTemplate.convertAndSendToUser(
                receiver.getEmail(),
                "/queue/private",
                savedMessage
        );
    }
}
