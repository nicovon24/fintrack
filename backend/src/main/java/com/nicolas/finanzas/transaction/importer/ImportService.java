package com.nicolas.finanzas.transaction.importer;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.nicolas.finanzas.category.model.Category;
import com.nicolas.finanzas.category.service.CategoryService;
import com.nicolas.finanzas.exception.ImportValidationException;
import com.nicolas.finanzas.security.CurrentUserProvider;
import com.nicolas.finanzas.transaction.importer.dto.ImportConfirmResponse;
import com.nicolas.finanzas.transaction.importer.dto.ImportPreviewResponse;
import com.nicolas.finanzas.transaction.importer.dto.ImportRow;
import com.nicolas.finanzas.transaction.importer.dto.ImportRowError;
import com.nicolas.finanzas.transaction.model.Currency;
import com.nicolas.finanzas.transaction.model.Transaction;
import com.nicolas.finanzas.transaction.model.TransactionType;
import com.nicolas.finanzas.transaction.repository.TransactionRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ImportService {

    private static final List<String> REQUIRED_HEADERS = List.of("Fecha", "Tipo", "Categoria", "Concepto", "Monto");
    private static final String MONTH_HEADER = "Mes";
    private static final String CURRENCY_HEADER = "Moneda";
    private static final String EXCHANGE_RATE_HEADER = "Cotizacion";
    private static final int MAX_DISTINCT_CATEGORIES = 20;
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final CategoryService categoryService;
    private final TransactionRepository transactionRepository;
    private final CurrentUserProvider currentUserProvider;
    private final DataFormatter dataFormatter = new DataFormatter();

    public ImportPreviewResponse preview(MultipartFile file) {
        ParsedImportResult result = parse(file);
        return new ImportPreviewResponse(
                result.rows().size() + result.errors().size(),
                result.rows(),
                result.distinctCategories(),
                result.errors(),
                result.errors().isEmpty()
        );
    }

    @Transactional
    public ImportConfirmResponse confirmImport(List<ImportRow> rows) {
        List<ImportRowError> errors = new ArrayList<>();
        for (int i = 0; i < rows.size(); i++) {
            try {
                validateBusinessRules(rows.get(i));
            } catch (RowParseException e) {
                errors.add(new ImportRowError(i + 1, e.getMessage()));
            }
        }
        if (!errors.isEmpty()) {
            throw new ImportValidationException(errors.stream()
                    .map(e -> "Fila " + e.rowNumber() + ": " + e.message())
                    .toList());
        }

        Set<String> distinctCategories = new LinkedHashSet<>(rows.stream().map(ImportRow::category).toList());
        validateCategoryCap(distinctCategories);
        validateCategoriesExist(rows);

        var user = currentUserProvider.getCurrentUser();
        for (ImportRow row : rows) {
            Category category = categoryService.findByNameAndType(row.category(), row.type())
                    .orElseThrow(() -> new ImportValidationException(
                            List.of("La categoria '" + row.category() + "' ya no existe")));
            Transaction transaction = new Transaction();
            transaction.setUser(user);
            transaction.setType(row.type());
            transaction.setAmount(row.amount());
            transaction.setDate(row.date());
            transaction.setDescription(row.description());
            transaction.setCategory(category);
            transaction.setCurrency(row.currency());
            transaction.setExchangeRate(row.exchangeRate());
            transactionRepository.save(transaction);
        }

        return new ImportConfirmResponse(rows.size());
    }

    private ParsedImportResult parse(MultipartFile file) {
        String filename = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase();
        if (filename.endsWith(".xlsx") || filename.endsWith(".xls")) {
            return parseExcel(file);
        }
        if (filename.endsWith(".csv") || filename.endsWith(".txt")) {
            return parseDelimited(file);
        }
        throw new ImportValidationException(List.of("Formato de archivo no soportado. Subi un .xlsx, .csv o .txt"));
    }

    private ParsedImportResult parseExcel(MultipartFile file) {
        List<ImportRow> rows = new ArrayList<>();
        List<ImportRowError> errors = new ArrayList<>();
        Set<String> distinctCategories = new LinkedHashSet<>();

        try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            Row headerRow = sheet.getRow(0);
            if (headerRow == null) {
                throw new ImportValidationException(List.of("El archivo no tiene fila de encabezados"));
            }
            List<String> headerCells = new ArrayList<>();
            for (int i = 0; i < headerRow.getLastCellNum(); i++) {
                headerCells.add(formatCell(headerRow.getCell(i)));
            }
            Map<String, Integer> headerIndex = validateHeaders(headerCells);
            boolean hasCurrency = headerIndex.containsKey(CURRENCY_HEADER);
            boolean hasExchangeRate = headerIndex.containsKey(EXCHANGE_RATE_HEADER);

            for (int rowNum = 1; rowNum <= sheet.getLastRowNum(); rowNum++) {
                Row row = sheet.getRow(rowNum);
                if (row == null || isRowEmpty(row)) {
                    continue;
                }

                int excelRowNumber = rowNum + 1;
                try {
                    ImportRow parsedRow = parseRow(row, headerIndex, hasCurrency, hasExchangeRate);
                    validateBusinessRules(parsedRow);
                    rows.add(parsedRow);
                    distinctCategories.add(parsedRow.category());
                } catch (RowParseException e) {
                    errors.add(new ImportRowError(excelRowNumber, e.getMessage()));
                }
            }
        } catch (IOException e) {
            throw new ImportValidationException(List.of("No se pudo leer el archivo: " + e.getMessage()));
        }

        validateCategoryCap(distinctCategories);
        if (errors.isEmpty()) {
            validateCategoriesExist(rows);
        }

        return new ParsedImportResult(rows, errors, new ArrayList<>(distinctCategories));
    }

    private ParsedImportResult parseDelimited(MultipartFile file) {
        List<ImportRow> rows = new ArrayList<>();
        List<ImportRowError> errors = new ArrayList<>();
        Set<String> distinctCategories = new LinkedHashSet<>();

        List<String> lines;
        try {
            lines = readLines(file);
        } catch (IOException e) {
            throw new ImportValidationException(List.of("No se pudo leer el archivo: " + e.getMessage()));
        }

        int headerLineIndex = -1;
        for (int i = 0; i < lines.size(); i++) {
            if (!lines.get(i).isBlank()) {
                headerLineIndex = i;
                break;
            }
        }
        if (headerLineIndex == -1) {
            throw new ImportValidationException(List.of("El archivo no tiene fila de encabezados"));
        }

        char delimiter = detectDelimiter(lines.get(headerLineIndex));

        List<String> headerCells = splitLine(lines.get(headerLineIndex), delimiter);
        Map<String, Integer> headerIndex = validateHeaders(headerCells);
        boolean hasCurrency = headerIndex.containsKey(CURRENCY_HEADER);
        boolean hasExchangeRate = headerIndex.containsKey(EXCHANGE_RATE_HEADER);

        for (int i = headerLineIndex + 1; i < lines.size(); i++) {
            String line = lines.get(i);
            if (line.isBlank()) {
                continue;
            }
            List<String> cells = splitLine(line, delimiter);
            if (isRowEmpty(cells)) {
                continue;
            }

            int lineNumber = i + 1;
            try {
                ImportRow parsedRow = parseTextRow(cells, headerIndex, hasCurrency, hasExchangeRate);
                validateBusinessRules(parsedRow);
                rows.add(parsedRow);
                distinctCategories.add(parsedRow.category());
            } catch (RowParseException e) {
                errors.add(new ImportRowError(lineNumber, e.getMessage()));
            }
        }

        validateCategoryCap(distinctCategories);
        if (errors.isEmpty()) {
            validateCategoriesExist(rows);
        }

        return new ParsedImportResult(rows, errors, new ArrayList<>(distinctCategories));
    }

    private List<String> readLines(MultipartFile file) throws IOException {
        List<String> lines = new ArrayList<>();
        try (var reader = new java.io.BufferedReader(
                new java.io.InputStreamReader(file.getInputStream(), java.nio.charset.StandardCharsets.UTF_8))) {
            String line;
            boolean first = true;
            while ((line = reader.readLine()) != null) {
                if (first) {
                    if (!line.isEmpty() && line.charAt(0) == '﻿') {
                        line = line.substring(1);
                    }
                    first = false;
                }
                lines.add(line);
            }
        }
        return lines;
    }

    private char detectDelimiter(String headerLine) {
        if (headerLine.contains("\t")) {
            return '\t';
        }
        if (headerLine.contains(";")) {
            return ';';
        }
        return ',';
    }

    private List<String> splitLine(String line, char delimiter) {
        List<String> cells = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inQuotes = false;
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (inQuotes) {
                if (c == '"') {
                    if (i + 1 < line.length() && line.charAt(i + 1) == '"') {
                        current.append('"');
                        i++;
                    } else {
                        inQuotes = false;
                    }
                } else {
                    current.append(c);
                }
            } else if (c == '"' && current.isEmpty()) {
                inQuotes = true;
            } else if (c == delimiter) {
                cells.add(current.toString().trim());
                current.setLength(0);
            } else {
                current.append(c);
            }
        }
        cells.add(current.toString().trim());
        return cells;
    }

    private boolean isRowEmpty(List<String> cells) {
        return cells.stream().allMatch(String::isBlank);
    }

    private ImportRow parseTextRow(
            List<String> cells, Map<String, Integer> headerIndex, boolean hasCurrency, boolean hasExchangeRate) {
        String fechaStr = textCellValue(cells, headerIndex.get("Fecha"));
        String tipoStr = textCellValue(cells, headerIndex.get("Tipo"));
        String categoria = textCellValue(cells, headerIndex.get("Categoria"));
        String concepto = textCellValue(cells, headerIndex.get("Concepto"));
        String montoStr = textCellValue(cells, headerIndex.get("Monto"));

        LocalDate fecha = parseFecha(fechaStr);
        TransactionType tipo = parseTipo(tipoStr);
        BigDecimal monto = parseMonto(montoStr);

        Currency currency = Currency.ARS;
        if (hasCurrency) {
            String monedaStr = textCellValue(cells, headerIndex.get(CURRENCY_HEADER));
            if (monedaStr != null && !monedaStr.isBlank()) {
                currency = parseMoneda(monedaStr);
            }
        }

        BigDecimal exchangeRate = null;
        if (hasExchangeRate) {
            exchangeRate = parseOptionalDecimal(textCellValue(cells, headerIndex.get(EXCHANGE_RATE_HEADER)));
        }

        return new ImportRow(fecha, tipo, categoria == null ? null : categoria.trim(), concepto, monto, currency, exchangeRate);
    }

    private String textCellValue(List<String> cells, Integer columnIndex) {
        if (columnIndex == null || columnIndex >= cells.size()) {
            return null;
        }
        String value = cells.get(columnIndex);
        return value == null ? null : value.trim();
    }

    private BigDecimal parseMonto(String raw) {
        BigDecimal value = parseOptionalDecimal(raw);
        if (value == null) {
            throw new RowParseException("El monto es obligatorio");
        }
        if (value.signum() <= 0) {
            throw new RowParseException("Monto invalido: debe ser positivo");
        }
        return value;
    }

    private BigDecimal parseOptionalDecimal(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String normalized = normalizeDecimalSeparators(raw.trim());
        try {
            return new BigDecimal(normalized);
        } catch (NumberFormatException e) {
            throw new RowParseException("Valor numerico invalido: '" + raw + "'");
        }
    }

    // Detecta el separador decimal por el propio valor (no por el delimitador del archivo):
    // si aparecen coma y punto, el ultimo de los dos es el decimal y el otro es separador de miles.
    private String normalizeDecimalSeparators(String value) {
        int lastComma = value.lastIndexOf(',');
        int lastDot = value.lastIndexOf('.');
        if (lastComma >= 0 && lastDot >= 0) {
            return lastComma > lastDot
                    ? value.replace(".", "").replace(',', '.')
                    : value.replace(",", "");
        }
        if (lastComma >= 0) {
            return value.replace(',', '.');
        }
        return value;
    }

    private void validateCategoryCap(Set<String> distinctCategories) {
        if (distinctCategories.size() > MAX_DISTINCT_CATEGORIES) {
            throw new ImportValidationException(List.of(
                    "Se encontraron %d categorias distintas, el maximo permitido es %d"
                            .formatted(distinctCategories.size(), MAX_DISTINCT_CATEGORIES)));
        }
    }

    private void validateCategoriesExist(List<ImportRow> rows) {
        record CategoryKey(String name, TransactionType type) {
        }

        List<String> missing = rows.stream()
                .map(r -> new CategoryKey(r.category(), r.type()))
                .distinct()
                .filter(k -> categoryService.findByNameAndType(k.name(), k.type()).isEmpty())
                .map(CategoryKey::name)
                .toList();

        if (!missing.isEmpty()) {
            throw new ImportValidationException(List.of(
                    "Las siguientes categorias no existen, pedile al admin que las cree antes de reintentar: "
                            + String.join(", ", missing)));
        }
    }

    private void validateBusinessRules(ImportRow row) {
        if (row.date() == null) {
            throw new RowParseException("La fecha es obligatoria");
        }
        if (row.type() == null) {
            throw new RowParseException("El tipo es obligatorio");
        }
        if (row.category() == null || row.category().isBlank()) {
            throw new RowParseException("La categoria es obligatoria");
        }
        if (row.amount() == null || row.amount().signum() <= 0) {
            throw new RowParseException("Monto invalido: debe ser positivo");
        }
        if (row.currency() == null) {
            throw new RowParseException("La moneda es obligatoria");
        }
        if (row.currency() == Currency.USD && (row.exchangeRate() == null || row.exchangeRate().signum() <= 0)) {
            throw new RowParseException("La cotizacion es obligatoria y debe ser positiva para filas en USD");
        }
        if (row.currency() == Currency.ARS && row.exchangeRate() != null) {
            throw new RowParseException("La cotizacion no aplica para filas en ARS");
        }
    }

    private Map<String, Integer> validateHeaders(List<String> headerCells) {
        Map<String, Integer> index = new LinkedHashMap<>();
        for (int i = 0; i < headerCells.size(); i++) {
            String header = headerCells.get(i).trim();
            if (!header.isEmpty()) {
                index.put(header, i);
            }
        }

        List<String> missing = REQUIRED_HEADERS.stream().filter(h -> !index.containsKey(h)).toList();
        if (!missing.isEmpty()) {
            throw new ImportValidationException(List.of("Faltan columnas obligatorias: " + String.join(", ", missing)));
        }

        for (int i = 0; i < REQUIRED_HEADERS.size(); i++) {
            if (!index.get(REQUIRED_HEADERS.get(i)).equals(i)) {
                throw new ImportValidationException(
                        List.of("Las columnas deben estar en este orden: " + String.join(", ", REQUIRED_HEADERS)));
            }
        }

        Set<String> allowed = new HashSet<>(REQUIRED_HEADERS);
        allowed.add(MONTH_HEADER);
        allowed.add(CURRENCY_HEADER);
        allowed.add(EXCHANGE_RATE_HEADER);
        List<String> unexpected = index.keySet().stream().filter(h -> !allowed.contains(h)).toList();
        if (!unexpected.isEmpty()) {
            throw new ImportValidationException(List.of("Columnas no reconocidas: " + String.join(", ", unexpected)));
        }

        return index;
    }

    private boolean isRowEmpty(Row row) {
        for (int i = 0; i < row.getLastCellNum(); i++) {
            if (!formatCell(row.getCell(i)).isBlank()) {
                return false;
            }
        }
        return true;
    }

    private ImportRow parseRow(Row row, Map<String, Integer> headerIndex, boolean hasCurrency, boolean hasExchangeRate) {
        String fechaStr = cellValue(row, headerIndex.get("Fecha"));
        String tipoStr = cellValue(row, headerIndex.get("Tipo"));
        String categoria = cellValue(row, headerIndex.get("Categoria"));
        String concepto = cellValue(row, headerIndex.get("Concepto"));
        Cell montoCell = row.getCell(headerIndex.get("Monto"));

        LocalDate fecha = parseFecha(fechaStr);
        TransactionType tipo = parseTipo(tipoStr);

        BigDecimal monto = parseMonto(montoCell);

        Currency currency = Currency.ARS;
        if (hasCurrency) {
            String monedaStr = cellValue(row, headerIndex.get(CURRENCY_HEADER));
            if (monedaStr != null && !monedaStr.isBlank()) {
                currency = parseMoneda(monedaStr);
            }
        }

        BigDecimal exchangeRate = null;
        if (hasExchangeRate) {
            exchangeRate = parseOptionalDecimal(row.getCell(headerIndex.get(EXCHANGE_RATE_HEADER)));
        }

        return new ImportRow(fecha, tipo, categoria == null ? null : categoria.trim(), concepto, monto, currency, exchangeRate);
    }

    private LocalDate parseFecha(String value) {
        if (value == null || value.isBlank()) {
            throw new RowParseException("La fecha es obligatoria");
        }
        try {
            return LocalDate.parse(value.trim(), DATE_FORMAT);
        } catch (DateTimeParseException e) {
            throw new RowParseException("Fecha invalida: '" + value + "' (formato esperado dd/MM/yyyy)");
        }
    }

    private TransactionType parseTipo(String value) {
        if (value == null || value.isBlank()) {
            throw new RowParseException("El tipo es obligatorio");
        }
        String trimmed = value.trim();
        if (trimmed.equalsIgnoreCase("Ingreso")) {
            return TransactionType.INCOME;
        }
        if (trimmed.equalsIgnoreCase("Gasto")) {
            return TransactionType.EXPENSE;
        }
        throw new RowParseException("Tipo invalido: '" + value + "' (esperado Ingreso o Gasto)");
    }

    private Currency parseMoneda(String value) {
        String trimmed = value.trim();
        if (trimmed.equalsIgnoreCase("ARS")) {
            return Currency.ARS;
        }
        if (trimmed.equalsIgnoreCase("USD")) {
            return Currency.USD;
        }
        throw new RowParseException("Moneda invalida: '" + value + "' (esperado ARS o USD)");
    }

    private BigDecimal parseMonto(Cell cell) {
        BigDecimal value = parseOptionalDecimal(cell);
        if (value == null) {
            throw new RowParseException("El monto es obligatorio");
        }
        if (value.signum() <= 0) {
            throw new RowParseException("Monto invalido: debe ser positivo");
        }
        return value;
    }

    private BigDecimal parseOptionalDecimal(Cell cell) {
        if (cell == null) {
            return null;
        }
        if (cell.getCellType() == CellType.NUMERIC) {
            return BigDecimal.valueOf(cell.getNumericCellValue());
        }
        return parseOptionalDecimal(formatCell(cell).trim());
    }

    private String cellValue(Row row, Integer columnIndex) {
        if (columnIndex == null) {
            return null;
        }
        return formatCell(row.getCell(columnIndex)).trim();
    }

    private String formatCell(Cell cell) {
        if (cell == null) {
            return "";
        }
        return dataFormatter.formatCellValue(cell);
    }

    private record ParsedImportResult(List<ImportRow> rows, List<ImportRowError> errors, List<String> distinctCategories) {
    }

    private static class RowParseException extends RuntimeException {
        RowParseException(String message) {
            super(message);
        }
    }
}
