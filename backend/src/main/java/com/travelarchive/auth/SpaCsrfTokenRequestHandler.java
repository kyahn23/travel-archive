package com.travelarchive.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.function.Supplier;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.web.csrf.XorCsrfTokenRequestAttributeHandler;

/**
 * Spring Security 6 removed BREACH defense by default for BREACH-vulnerable
 * GET requests. The combination handler keeps the deferred resolution for
 * plain GETs (so the cookie is materialized only when the application reads
 * the token) but resolves the plain token from the X-XSRF-TOKEN header when
 * the SPA sends one, avoiding a second XOR round trip on every write.
 */
public class SpaCsrfTokenRequestHandler extends CsrfTokenRequestAttributeHandler {

    private final XorCsrfTokenRequestAttributeHandler xor = new XorCsrfTokenRequestAttributeHandler();

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response, Supplier<CsrfToken> deferredToken) {
        String header = request.getHeader("X-XSRF-TOKEN");
        if (header != null && !header.isBlank()) {
            xor.handle(request, response, deferredToken);
            return;
        }
        super.handle(request, response, deferredToken);
    }
}
