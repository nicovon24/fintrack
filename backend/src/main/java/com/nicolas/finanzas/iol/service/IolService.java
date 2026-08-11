package com.nicolas.finanzas.iol.service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.nicolas.finanzas.exception.IolApiException;
import com.nicolas.finanzas.iol.client.IolApiClient;
import com.nicolas.finanzas.iol.client.IolRawAccountStatus;
import com.nicolas.finanzas.iol.client.IolRawPortfolioResponse;
import com.nicolas.finanzas.iol.client.IolRawTokenResponse;
import com.nicolas.finanzas.iol.dto.IolHoldingResponse;
import com.nicolas.finanzas.iol.dto.IolPortfolioResponse;
import com.nicolas.finanzas.iol.dto.IolTokenResponse;

// Orquestacion pura: no toca CurrentUserProvider ni User, no guarda nada entre llamadas.
@Service
public class IolService {

    private static final Logger log = LoggerFactory.getLogger(IolService.class);
    private static final List<String> PORTFOLIO_COUNTRIES = List.of("argentina", "estados_Unidos");

    private final IolApiClient iolApiClient;

    public IolService(IolApiClient iolApiClient) {
        this.iolApiClient = iolApiClient;
    }

    public IolTokenResponse login(String username, String password) {
        return toTokenResponse(iolApiClient.login(username, password));
    }

    public IolTokenResponse refresh(String refreshToken) {
        return toTokenResponse(iolApiClient.refresh(refreshToken));
    }

    private IolTokenResponse toTokenResponse(IolRawTokenResponse raw) {
        return new IolTokenResponse(raw.accessToken(), raw.refreshToken(), raw.expiresIn());
    }

    // Pide la cartera de cada mercado por separado: si uno falla (ej. el usuario no tiene
    // subcuenta en USD en IOL) no debe tirar abajo toda la respuesta. Solo se propaga el error
    // si TODOS los mercados fallan (ahi si es genuinamente una sesion invalida/vencida).
    public IolPortfolioResponse getPortfolio(String accessToken) {
        List<IolHoldingResponse> holdings = new ArrayList<>();
        IolApiException lastError = null;
        for (String country : PORTFOLIO_COUNTRIES) {
            try {
                IolRawPortfolioResponse raw = iolApiClient.getPortfolioRaw(accessToken, country);
                holdings.addAll(mapHoldings(raw));
            } catch (IolApiException e) {
                log.warn("No se pudo obtener la cartera de IOL para {}: {}", country, e.getStatus());
                lastError = e;
            }
        }
        if (holdings.isEmpty() && lastError != null) {
            throw lastError;
        }

        BigDecimal cashArs = BigDecimal.ZERO;
        BigDecimal cashUsd = BigDecimal.ZERO;
        try {
            IolRawAccountStatus status = iolApiClient.getAccountStatusRaw(accessToken);
            if (status != null && status.cuentas() != null) {
                for (IolRawAccountStatus.Cuenta cuenta : status.cuentas()) {
                    BigDecimal disponible = nz(cuenta.disponible());
                    String currency = mapCurrency(cuenta.moneda());
                    if ("ARS".equals(currency)) {
                        cashArs = cashArs.add(disponible);
                    } else if ("USD".equals(currency)) {
                        cashUsd = cashUsd.add(disponible);
                    }
                }
            }
        } catch (IolApiException e) {
            // El efectivo es complementario: si falla, se muestra la cartera igual con efectivo en 0.
            log.warn("No se pudo obtener el estado de cuenta de IOL: {}", e.getStatus());
        }

        return new IolPortfolioResponse(holdings, cashArs, cashUsd);
    }

    private List<IolHoldingResponse> mapHoldings(IolRawPortfolioResponse raw) {
        List<IolHoldingResponse> result = new ArrayList<>();
        if (raw == null || raw.activos() == null) {
            return result;
        }
        for (IolRawPortfolioResponse.Activo activo : raw.activos()) {
            IolHoldingResponse holding = mapHolding(activo);
            if (holding != null) {
                result.add(holding);
            }
        }
        return result;
    }

    private IolHoldingResponse mapHolding(IolRawPortfolioResponse.Activo activo) {
        IolRawPortfolioResponse.Titulo titulo = activo.titulo();
        String monedaRaw = titulo == null ? null : titulo.moneda();
        String currency = mapCurrency(monedaRaw);
        if (currency == null) {
            log.warn("Moneda de IOL desconocida, se excluye la tenencia: {}", monedaRaw);
            return null;
        }

        BigDecimal qty = nz(activo.cantidad());
        BigDecimal avgCost = nz(activo.ppc());
        BigDecimal price = nz(activo.ultimoPrecio());
        BigDecimal value = activo.valorizado() != null ? activo.valorizado() : qty.multiply(price);
        // Costo y resultado salen de los totales de IOL: multiplicar qty por los precios unitarios
        // rompe en los bonos, que cotizan cada 100 nominales.
        BigDecimal result = activo.gananciaDinero() != null
                ? activo.gananciaDinero()
                : value.subtract(qty.multiply(avgCost));
        BigDecimal cost = activo.valorizado() != null && activo.gananciaDinero() != null
                ? activo.valorizado().subtract(activo.gananciaDinero())
                : qty.multiply(avgCost);

        return new IolHoldingResponse(
                titulo.simbolo() == null ? "" : titulo.simbolo(),
                titulo.descripcion() == null ? "" : titulo.descripcion(),
                qty,
                avgCost,
                price,
                currency,
                value,
                cost,
                result
        );
    }

    private BigDecimal nz(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private String mapCurrency(String moneda) {
        if (moneda == null) {
            return null;
        }
        return switch (moneda.toLowerCase()) {
            case "peso_argentino", "peso argentino", "ars" -> "ARS";
            case "dolar_estadounidense", "dolar estadounidense", "usd" -> "USD";
            default -> null;
        };
    }
}
