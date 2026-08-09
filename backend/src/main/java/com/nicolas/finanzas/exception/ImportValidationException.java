package com.nicolas.finanzas.exception;

import java.util.List;

public class ImportValidationException extends RuntimeException {

    private final List<String> messages;

    public ImportValidationException(List<String> messages) {
        super(String.join("; ", messages));
        this.messages = messages;
    }

    public List<String> getMessages() {
        return messages;
    }
}
