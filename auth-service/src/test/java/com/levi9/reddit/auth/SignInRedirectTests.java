package com.levi9.reddit.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

/**
 * The redirect to the React sign-in page, on a real server, because only the real Tomcat turns a relative Location
 * into an absolute one (MockMvc never does, so {@link AuthorizationCodeFlowTests} can't see it).
 * <p>
 * On AWS the request reaches this service through CloudFront, the ALB and the gateway, so the scheme and host it sees
 * are http:// and possibly the ALB's own name. An absolute Location built from them sends the browser somewhere it
 * can't go. A relative one lets the browser stay on the public origin it is on.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class SignInRedirectTests {
    private static final String AUTHORIZE_QUERY = "response_type=code&client_id=levddit-gateway&scope=openid"
            + "&state=s&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Flogin%2Foauth2%2Fcode%2Flevddit"
            + "&code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM&code_challenge_method=S256";

    /** Never follows redirects: the test is about the Location header itself. */
    private final HttpClient http = HttpClient.newHttpClient();

    @Value("${local.server.port}")
    private int port;

    @Test
    void theSignInRedirectStaysRelativeWhateverHostAndSchemeTheProxiesReport() throws Exception {
        HttpRequest request = HttpRequest.newBuilder(
                        URI.create("http://127.0.0.1:" + port + "/oauth2/authorize?" + AUTHORIZE_QUERY))
                .header("Accept", "text/html")
                // What arrives on AWS: plain HTTP from the ALB, and a host the browser can't reach.
                .header("X-Forwarded-Proto", "http")
                .header("X-Forwarded-Host", "levddit-alb-123.eu-central-1.elb.amazonaws.com")
                .header("X-Forwarded-Port", "80")
                .GET()
                .build();

        HttpResponse<Void> response = http.send(request, HttpResponse.BodyHandlers.discarding());

        assertThat(response.statusCode()).isEqualTo(302);
        assertThat(response.headers().firstValue("Location")).hasValue("/signin");
    }
}
