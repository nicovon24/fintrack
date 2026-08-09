package com.nicolas.finanzas.transaction.importer;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.nicolas.finanzas.transaction.importer.dto.ImportConfirmRequest;
import com.nicolas.finanzas.transaction.importer.dto.ImportConfirmResponse;
import com.nicolas.finanzas.transaction.importer.dto.ImportPreviewResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/transactions/import")
@RequiredArgsConstructor
@Tag(name = "Importacion", description = "Import masivo de transacciones desde un archivo Excel (.xlsx)")
public class ImportController {

    private final ImportService importService;

    @PostMapping(value = "/preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Parsea y valida un archivo .xlsx sin persistir nada")
    public ImportPreviewResponse preview(@RequestParam("file") MultipartFile file) {
        return importService.preview(file);
    }

    @PostMapping(value = "/confirm", consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Revalida y persiste las filas devueltas por preview, con las correcciones que haya hecho el usuario")
    public ImportConfirmResponse confirm(@RequestBody ImportConfirmRequest request) {
        return importService.confirmImport(request.rows());
    }
}
