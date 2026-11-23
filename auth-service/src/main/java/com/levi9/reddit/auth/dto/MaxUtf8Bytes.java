package com.levi9.reddit.auth.dto;

import jakarta.validation.Constraint;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.Target;
import java.nio.charset.StandardCharsets;

import static java.lang.annotation.ElementType.ANNOTATION_TYPE;
import static java.lang.annotation.ElementType.FIELD;
import static java.lang.annotation.ElementType.METHOD;
import static java.lang.annotation.ElementType.PARAMETER;
import static java.lang.annotation.RetentionPolicy.RUNTIME;

/**
 * Limits a string by its UTF-8 size in bytes, not by its number of characters. {@code @Size} counts characters,
 * but BCrypt only uses the first 72 bytes and Spring Security rejects longer input, and letters such as
 * {@code š} take two bytes. Null is valid; combine with {@code @NotBlank} where the value is required.
 */
@Documented
@Constraint(validatedBy = MaxUtf8Bytes.Validator.class)
@Target({FIELD, METHOD, PARAMETER, ANNOTATION_TYPE})
@Retention(RUNTIME)
public @interface MaxUtf8Bytes {

    int value();

    String message() default "must be at most {value} bytes; letters like š count as two";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};

    class Validator implements ConstraintValidator<MaxUtf8Bytes, CharSequence> {
        private int maxBytes;

        @Override
        public void initialize(MaxUtf8Bytes annotation) {
            this.maxBytes = annotation.value();
        }

        @Override
        public boolean isValid(CharSequence value, ConstraintValidatorContext context) {
            return value == null || value.toString().getBytes(StandardCharsets.UTF_8).length <= maxBytes;
        }
    }
}
