package com.nicolas.finanzas.transaction.importer.dto;

import java.util.List;

public record ImportConfirmRequest(List<ImportRow> rows) {
}
