/**
 * Copyright © 2016-2025 The Thingsboard Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.thingsboard.rest.client;

import com.auth0.jwt.JWT;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

final class TokenManager {

    private static final long AVG_REQUEST_TIMEOUT = 1000L;

    private final String baseURL;
    private final RestTemplate loginRestTemplate;

    private volatile String mainToken;
    private volatile String refreshToken;

    private volatile long mainTokenExpTs;
    private volatile long refreshTokenExpTs;
    private volatile long clientServerTimeDiff;

    private volatile String username;
    private volatile String password;

    TokenManager(String baseURL, RestTemplate loginRestTemplate, String accessToken) {
        this.baseURL = baseURL;
        this.loginRestTemplate = loginRestTemplate;
        if (accessToken != null) {
            this.mainToken = accessToken;
        }
    }

    void setCredentials(String username, String password) {
        this.username = username;
        this.password = password;
    }

    /** Punto único para obtener un token válido (renueva si es necesario). */
    String ensureValidToken() {
        long calc = System.currentTimeMillis() + clientServerTimeDiff + AVG_REQUEST_TIMEOUT;
        if (mainToken == null || (mainTokenExpTs > 0 && calc > mainTokenExpTs)) {
            synchronized (this) {
                calc = System.currentTimeMillis() + clientServerTimeDiff + AVG_REQUEST_TIMEOUT;
                if (mainToken == null || (mainTokenExpTs > 0 && calc > mainTokenExpTs)) {
                    if (refreshToken != null && (refreshTokenExpTs == 0 || calc < refreshTokenExpTs)) {
                        refresh();
                    } else {
                        login();
                    }
                }
            }
        }
        return mainToken;
    }

    String getMainToken() { return mainToken; }
    String getRefreshToken() { return refreshToken; }

    /** Login explícito desde RestClient.login(username, password) */
    void login() {
        long ts = System.currentTimeMillis();
        Map<String, String> loginRequest = new HashMap<>();
        loginRequest.put("username", username);
        loginRequest.put("password", password);
        ResponseEntity<JsonNode> tokenInfo = loginRestTemplate.postForEntity(
                baseURL + "/api/auth/login", loginRequest, JsonNode.class);
        setTokenInfo(ts, tokenInfo.getBody());
    }

    void refresh() {
        long ts = System.currentTimeMillis();
        Map<String, String> refreshTokenRequest = new HashMap<>();
        refreshTokenRequest.put("refreshToken", refreshToken);
        ResponseEntity<JsonNode> tokenInfo = loginRestTemplate.postForEntity(
                baseURL + "/api/auth/token", refreshTokenRequest, JsonNode.class);
        setTokenInfo(ts, tokenInfo.getBody());
    }

    private void setTokenInfo(long ts, JsonNode tokenInfo) {
        this.mainToken = tokenInfo.get("token").asText();
        JsonNode rt = tokenInfo.get("refreshToken");
        this.refreshToken = rt != null && !rt.isNull() ? rt.asText() : null;

        this.mainTokenExpTs = JWT.decode(this.mainToken).getExpiresAtAsInstant().toEpochMilli();
        if (this.refreshToken != null) {
            this.refreshTokenExpTs = JWT.decode(this.refreshToken).getExpiresAtAsInstant().toEpochMilli();
        } else {
            this.refreshTokenExpTs = 0L;
        }
        this.clientServerTimeDiff = JWT.decode(this.mainToken).getIssuedAtAsInstant().toEpochMilli() - ts;
    }
}