package com.nicolas.finanzas.transaction.importer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import com.nicolas.finanzas.category.model.Category;
import com.nicolas.finanzas.category.service.CategoryService;
import com.nicolas.finanzas.exception.ImportValidationException;
import com.nicolas.finanzas.security.CurrentUserProvider;
import com.nicolas.finanzas.transaction.importer.dto.ImportConfirmResponse;
import com.nicolas.finanzas.transaction.importer.dto.ImportPreviewResponse;
import com.nicolas.finanzas.transaction.importer.dto.ImportRow;
import com.nicolas.finanzas.transaction.model.Currency;
import com.nicolas.finanzas.transaction.model.Transaction;
import com.nicolas.finanzas.transaction.model.TransactionType;
import com.nicolas.finanzas.transaction.repository.TransactionRepository;
import com.nicolas.finanzas.user.model.Role;
import com.nicolas.finanzas.user.model.User;

@ExtendWith(MockitoExtension.class)
class ImportServiceTest {

    @Mock
    private CategoryService categoryService;

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private CurrentUserProvider currentUserProvider;

    @InjectMocks
    private ImportService importService;

    private static final String[] BASE_HEADERS = {"Fecha", "Tipo", "Categoria", "Concepto", "Monto"};
    private static final String[] HEADERS_WITH_CURRENCY = {"Fecha", "Tipo", "Categoria", "Concepto", "Monto", "Moneda", "Cotizacion"};

    @BeforeEach
    void setUp() {
        User user = new User(1L, "google-1", "user@example.com", "Test User", null, Role.USER, null);
        lenient().when(currentUserProvider.getCurrentUser()).thenReturn(user);
        lenient().when(categoryService.findByNameAndType(anyString(), any(TransactionType.class)))
                .thenReturn(Optional.of(new Category(1L, "Comida", TransactionType.EXPENSE)));
    }

    @Test
    void preview_archivoValido_devuelveFilasSinErrores() {
        MockMultipartFile file = buildWorkbook(BASE_HEADERS, new Object[][]{
                {"05/08/2026", "Gasto", "Comida", "Supermercado", 1500.0}
        });

        ImportPreviewResponse response = importService.preview(file);

        assertThat(response.valid()).isTrue();
        assertThat(response.errors()).isEmpty();
        assertThat(response.rows()).hasSize(1);
        assertThat(response.distinctCategories()).containsExactly("Comida");
        assertThat(response.rows().get(0).amount()).isEqualByComparingTo("1500.0");
    }

    @Test
    void preview_conMonedaUsdYCotizacion_parseaCorrectamente() {
        MockMultipartFile file = buildWorkbook(HEADERS_WITH_CURRENCY, new Object[][]{
                {"05/08/2026", "Gasto", "Comida", "Mundial 2026", 100.0, "USD", 1350.0}
        });

        ImportPreviewResponse response = importService.preview(file);

        assertThat(response.valid()).isTrue();
        assertThat(response.rows().get(0).currency().name()).isEqualTo("USD");
        assertThat(response.rows().get(0).exchangeRate()).isEqualByComparingTo("1350.0");
    }

    @Test
    void preview_usdSinCotizacion_devuelveErrorDeFila() {
        MockMultipartFile file = buildWorkbook(HEADERS_WITH_CURRENCY, new Object[][]{
                {"05/08/2026", "Gasto", "Comida", "Mundial 2026", 100.0, "USD", null}
        });

        ImportPreviewResponse response = importService.preview(file);

        assertThat(response.valid()).isFalse();
        assertThat(response.errors()).hasSize(1);
        assertThat(response.errors().get(0).message()).contains("cotizacion");
    }

    @Test
    void preview_tipoInvalido_devuelveErrorDeFila() {
        MockMultipartFile file = buildWorkbook(BASE_HEADERS, new Object[][]{
                {"05/08/2026", "Alquiler", "Comida", "Test", 100.0}
        });

        ImportPreviewResponse response = importService.preview(file);

        assertThat(response.valid()).isFalse();
        assertThat(response.errors().get(0).message()).contains("Tipo invalido");
    }

    @Test
    void preview_montoNegativo_devuelveErrorDeFila() {
        MockMultipartFile file = buildWorkbook(BASE_HEADERS, new Object[][]{
                {"05/08/2026", "Gasto", "Comida", "Test", -50.0}
        });

        ImportPreviewResponse response = importService.preview(file);

        assertThat(response.valid()).isFalse();
        assertThat(response.errors().get(0).message()).contains("positivo");
    }

    @Test
    void preview_fechaInvalida_devuelveErrorDeFila() {
        MockMultipartFile file = buildWorkbook(BASE_HEADERS, new Object[][]{
                {"2026-08-05", "Gasto", "Comida", "Test", 100.0}
        });

        ImportPreviewResponse response = importService.preview(file);

        assertThat(response.valid()).isFalse();
        assertThat(response.errors().get(0).message()).contains("Fecha invalida");
    }

    @Test
    void preview_filaVacia_seSaltaEnSilencio() {
        MockMultipartFile file = buildWorkbook(BASE_HEADERS, new Object[][]{
                {"05/08/2026", "Gasto", "Comida", "Test", 100.0},
                {null, null, null, null, null}
        });

        ImportPreviewResponse response = importService.preview(file);

        assertThat(response.valid()).isTrue();
        assertThat(response.rows()).hasSize(1);
    }

    @Test
    void preview_columnaObligatoriaFaltante_lanzaImportValidationException() {
        MockMultipartFile file = buildWorkbook(new String[]{"Fecha", "Tipo", "Categoria", "Concepto"}, new Object[][]{
                {"05/08/2026", "Gasto", "Comida", "Test"}
        });

        assertThatThrownBy(() -> importService.preview(file))
                .isInstanceOf(ImportValidationException.class);
    }

    @Test
    void preview_masDeDiezCategoriasDistintas_lanzaImportValidationException() {
        Object[][] filas = new Object[11][];
        for (int i = 0; i < 11; i++) {
            filas[i] = new Object[]{"05/08/2026", "Gasto", "Categoria" + i, "Test", 100.0};
        }
        MockMultipartFile file = buildWorkbook(BASE_HEADERS, filas);

        assertThatThrownBy(() -> importService.preview(file))
                .isInstanceOf(ImportValidationException.class);
    }

    @Test
    void preview_categoriaInexistente_lanzaImportValidationException() {
        when(categoryService.findByNameAndType("Comida", TransactionType.EXPENSE)).thenReturn(Optional.empty());

        MockMultipartFile file = buildWorkbook(BASE_HEADERS, new Object[][]{
                {"05/08/2026", "Gasto", "Comida", "Test", 100.0}
        });

        assertThatThrownBy(() -> importService.preview(file))
                .isInstanceOf(ImportValidationException.class);
    }

    @Test
    void confirmImport_filasValidas_persisteTransacciones() {
        List<ImportRow> rows = List.of(
                new ImportRow(LocalDate.of(2026, 8, 5), TransactionType.EXPENSE, "Comida", "Super",
                        new BigDecimal("1500.0"), Currency.ARS, null),
                new ImportRow(LocalDate.of(2026, 8, 6), TransactionType.INCOME, "Comida", "Pago",
                        new BigDecimal("500000.0"), Currency.ARS, null)
        );

        ImportConfirmResponse response = importService.confirmImport(rows);

        assertThat(response.importedCount()).isEqualTo(2);
        verify(transactionRepository, times(2)).save(any(Transaction.class));
    }

    @Test
    void confirmImport_conFilaInvalida_lanzaImportValidationExceptionYNoPersiste() {
        List<ImportRow> rows = List.of(
                new ImportRow(LocalDate.of(2026, 8, 5), TransactionType.EXPENSE, "Comida", "Super",
                        new BigDecimal("-100.0"), Currency.ARS, null)
        );

        assertThatThrownBy(() -> importService.confirmImport(rows))
                .isInstanceOf(ImportValidationException.class);

        verify(transactionRepository, never()).save(any(Transaction.class));
    }

    @Test
    void confirmImport_conCategoriaEditadaAUnaInexistente_lanzaImportValidationExceptionYNoPersiste() {
        when(categoryService.findByNameAndType("NoExiste", TransactionType.EXPENSE)).thenReturn(Optional.empty());

        List<ImportRow> rows = List.of(
                new ImportRow(LocalDate.of(2026, 8, 5), TransactionType.EXPENSE, "NoExiste", "Super",
                        new BigDecimal("100.0"), Currency.ARS, null)
        );

        assertThatThrownBy(() -> importService.confirmImport(rows))
                .isInstanceOf(ImportValidationException.class);

        verify(transactionRepository, never()).save(any(Transaction.class));
    }

    private MockMultipartFile buildWorkbook(String[] headers, Object[][] rows) {
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Transacciones");
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                headerRow.createCell(i).setCellValue(headers[i]);
            }

            for (int r = 0; r < rows.length; r++) {
                Row row = sheet.createRow(r + 1);
                Object[] values = rows[r];
                for (int c = 0; c < values.length; c++) {
                    if (values[c] == null) {
                        continue;
                    }
                    if (values[c] instanceof Double d) {
                        row.createCell(c).setCellValue(d);
                    } else {
                        row.createCell(c).setCellValue(values[c].toString());
                    }
                }
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return new MockMultipartFile("file", "transactions.xlsx",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", out.toByteArray());
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
