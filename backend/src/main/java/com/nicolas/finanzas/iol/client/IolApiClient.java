package com.nicolas.finanzas.iol.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import com.nicolas.finanzas.exception.IolApiException;

// Cliente stateless hacia la API publica de IOL. No cachea ni persiste nada: cada llamada usa
// el token que le pasan y lo descarta. Nunca loggea bodies (podrian reflejar user/password).
@Component
public class IolApiClient {

    private final RestClient restClient;

    public IolApiClient(@Value("${app.iol.base-url}") String baseUrl) {
        this.restClient = RestClient.builder().baseUrl(baseUrl).build();
    }

    public IolRawTokenResponse login(String username, String password) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", "password");
        form.add("username", username);
        form.add("password", password);
        return requestToken(form);
    }

    public IolRawTokenResponse refresh(String refreshToken) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", "refresh_token");
        form.add("refresh_token", refreshToken);
        return requestToken(form);
    }

    private IolRawTokenResponse requestToken(MultiValueMap<String, String> form) {
        try {
            return restClient.post()
                    .uri("/token")
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(IolRawTokenResponse.class);
        } catch (RestClientResponseException e) {
            throw new IolApiException(e.getStatusCode().value(), "No se pudo autenticar con IOL");
        }
    }

    public IolRawAccountStatus getAccountStatusRaw(String accessToken) {
        try {
            return restClient.get()
                    .uri("/api/v2/estadocuenta")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .retrieve()
                    .body(IolRawAccountStatus.class);
        } catch (RestClientResponseException e) {
            throw new IolApiException(e.getStatusCode().value(), "No se pudo obtener el estado de cuenta de IOL");
        }
    }

    public IolRawPortfolioResponse getPortfolioRaw(String accessToken, String country) {
        try {
            return restClient.get()
                    .uri("/api/v2/portafolio/{country}", country)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .retrieve()
                    .body(IolRawPortfolioResponse.class);
        } catch (RestClientResponseException e) {
            throw new IolApiException(e.getStatusCode().value(), "No se pudo obtener la cartera de IOL");
        }
    }
}
