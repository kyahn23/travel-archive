package com.travelarchive.auth;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
class AuthExceptionHandler {
    @ExceptionHandler(AuthenticationException.class)
    ResponseEntity<Void> authenticationException() {
        return ResponseEntity.status(401).build();
    }
}
