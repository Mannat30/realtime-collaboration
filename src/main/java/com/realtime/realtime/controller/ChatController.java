
package com.realtime.realtime.controller;

import com.realtime.realtime.entity.ChatMessageEntity;
import com.realtime.realtime.repository.ChatMessageRepository;
import org.springframework.data.domain.Sort;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.List;

@Controller
public class ChatController {

    private final ChatMessageRepository chatMessageRepository;

    public ChatController(ChatMessageRepository chatMessageRepository) {
        this.chatMessageRepository = chatMessageRepository;
    }

    @MessageMapping("/chat")
    @SendTo("/topic/messages")
    public ChatMessageEntity sendMessage(ChatMessageEntity message) {

        if (message.getSender() == null
                || message.getSender().isBlank()
                || message.getContent() == null
                || message.getContent().isBlank()) {
            throw new IllegalArgumentException(
                    "Sender and message content are required"
            );
        }

        String sender = message.getSender().trim();
        String content = message.getContent().trim();

        if (sender.length() > 50 || content.length() > 2000) {
            throw new IllegalArgumentException("Message is too long");
        }

        ChatMessageEntity chatMessage =
                new ChatMessageEntity(sender, content);

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
