package com.levi9.reddit.auth.contracts;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

public class UpdateUserRequest {
    @Size(min = 1, max = 50)
    private String firstName;

    @Size(min = 1, max = 50)
    private String lastName;

    @Email
    @Size(min = 1, max = 254)
    private String email;

    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String currentPassword;

    @JsonSetter(nulls = Nulls.FAIL)
    public void setFirstName(String firstName) {
        this.firstName = firstName.strip();
    }

    @JsonSetter(nulls = Nulls.FAIL)
    public void setLastName(String lastName) {
        this.lastName = lastName.strip();
    }

    @JsonSetter(nulls = Nulls.FAIL)
    public void setEmail(String email) {
        this.email = email.strip();
    }

    public String getFirstName() {
        return firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public String getEmail() {
        return email;
    }

    public String getCurrentPassword() {
        return currentPassword;
    }

    @AssertTrue(message = "Provide at least one of firstName, lastName, or email")
    public boolean isProfileFieldPresent() {
        return firstName != null || lastName != null || email != null;
    }
}
