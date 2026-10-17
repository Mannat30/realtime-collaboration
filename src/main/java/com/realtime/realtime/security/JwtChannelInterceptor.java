
package com.realtime.realtime.security;

import java.util.List;

import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;

@Component
public class JwtChannelInterceptor implements ChannelInterceptor {

    private final JwtService jwtService;

    public JwtChannelInterceptor(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    public Message<?> preSend(
            Message<?> message,
            MessageChannel channel) {

        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(
                        message,
                        StompHeaderAccessor.class
                );

        if (accessor != null
                && StompCommand.CONNECT.equals(accessor.getCommand())) {

            String authHeader =
                    accessor.getFirstNativeHeader("Authorization");

            if (authHeader == null
                    || !authHeader.startsWith("Bearer ")) {
                throw new MessageDeliveryException(
                        "Missing or invalid Authorization header"
                );
            }

            String token = authHeader.substring(7).trim();

            if (token.isEmpty() || !jwtService.isTokenValid(token)) {
                throw new MessageDeliveryException(
                        "Invalid or expired JWT token"
                );
            }

            String email = jwtService.extractEmail(token);

            if (email == null || email.isBlank()) {
                throw new MessageDeliveryException(
                        "JWT token does not contain a valid user"
                );
            }

            var authentication =
                    new UsernamePasswordAuthenticationToken(
                            email,
                            null,
                            List.of()
                    );

            accessor.setUser(authentication);
        }

        return message;
    }
}
