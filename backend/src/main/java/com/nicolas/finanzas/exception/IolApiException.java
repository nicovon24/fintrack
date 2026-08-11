package com.nicolas.finanzas.exception;

public class IolApiException extends RuntimeException {
    private final int status;

    public IolApiException(int status, String message) {
        super(message);
        this.status = status;
    }

    public int getStatus() {
        return status;
    }
}
