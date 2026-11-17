package com.levi9.reddit.community.infrastructure;

public class PostServiceUnavailableException extends RuntimeException {

    public PostServiceUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
