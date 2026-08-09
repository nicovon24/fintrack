package com.nicolas.finanzas.transaction.importer.dto;

import java.util.List;

public record ImportPreviewResponse(
        int totalRows,
        List<ImportRow> rows,
        List<String> distinctCategories,
        List<ImportRowError> errors,
        boolean valid
) {
}
