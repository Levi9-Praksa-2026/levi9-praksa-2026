package com.levi9.reddit.auth.api;

import com.levi9.reddit.auth.core.exception.ErrorType;
import com.levi9.reddit.auth.core.exception.ForbiddenException;
import com.levi9.reddit.auth.core.exception.NotFoundException;
import com.levi9.reddit.auth.core.exception.UnauthorizedException;
import com.levi9.reddit.auth.infrastructure.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

@WebMvcTest(UserController.class)
@AutoConfigureMockMvc(addFilters = false)
class UserControllerTest {
    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private UserService userService;

    @Test
    void deletesUser() throws Exception {
        mvc.perform(delete("/api/users/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"password\":\"secret\"}"))
                .andExpect(status().isNoContent());

        verify(userService).delete(1L, "secret");
    }

    @Test
    void rejectsInvalidRequestBodies() throws Exception {
        for (String body : new String[] {"{}", "{\"password\":\"   \"}", "{invalid"}) {
            mvc.perform(delete("/api/users/me")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest());
        }
        mvc.perform(delete("/api/users/me").contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(userService);
    }

    @Test
    void returnsUnauthorizedForWrongPassword() throws Exception {
        doThrow(new UnauthorizedException(ErrorType.INVALID_CREDENTIALS, "Invalid password"))
                .when(userService).delete(1L, "wrong");

        mvc.perform(delete("/api/users/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"password\":\"wrong\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorType").value("INVALID_CREDENTIALS"));
    }

    @Test
    void returnsProblemDetailsForMissingUserAndForbiddenDeletion() throws Exception {
        doThrow(new NotFoundException(ErrorType.USER_NOT_FOUND, "User not found"))
                .when(userService).delete(1L, "missing");
        doThrow(new ForbiddenException(ErrorType.ACCOUNT_DELETION_FORBIDDEN, "This account cannot be deleted"))
                .when(userService).delete(1L, "forbidden");

        mvc.perform(delete("/api/users/me").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"password\":\"missing\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorType").value("USER_NOT_FOUND"));
        mvc.perform(delete("/api/users/me").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"password\":\"forbidden\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorType").value("ACCOUNT_DELETION_FORBIDDEN"));
    }
}
