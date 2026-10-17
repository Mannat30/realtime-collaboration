
package com.realtime.realtime.repository;

import com.realtime.realtime.entity.PrivateChatMessageEntity;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PrivateChatMessageRepository
        extends JpaRepository<PrivateChatMessageEntity, Long> {

    @Query("""
        SELECT m
        FROM PrivateChatMessageEntity m
        WHERE
            (m.senderEmail = :firstEmail
             AND m.receiverEmail = :secondEmail)
            OR
            (m.senderEmail = :secondEmail
             AND m.receiverEmail = :firstEmail)
        ORDER BY m.sentAt ASC, m.id ASC
        """)
    List<PrivateChatMessageEntity> findConversation(
            @Param("firstEmail") String firstEmail,
            @Param("secondEmail") String secondEmail
    );
}
