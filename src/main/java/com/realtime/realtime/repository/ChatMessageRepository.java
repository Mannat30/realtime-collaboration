package com.realtime.realtime.repository;

import com.realtime.realtime.entity.ChatMessageEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatMessageRepository
        extends JpaRepository<ChatMessageEntity, Long> {
}