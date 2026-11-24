package com.levi9.reddit.post.dto;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import java.util.Set;
import java.util.stream.Collectors;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

class PostRequestValidationTest {

    private static ValidatorFactory factory;
    private static Validator validator;

    @BeforeAll
    static void setUp() {
        factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @AfterAll
    static void tearDown() {
        factory.close();
    }

    @Test
    void create_valid_withAndWithoutContent() {
        assertThat(invalidFields(new CreatePostDTO("Title", "Body", 1L))).isEmpty();
        assertThat(invalidFields(new CreatePostDTO("Title", null, 1L))).isEmpty();
    }

    @Test
    void create_titleIsRequiredAndLimited() {
        assertThat(invalidFields(new CreatePostDTO(null, null, 1L))).containsExactly("title");
        assertThat(invalidFields(new CreatePostDTO("   ", null, 1L))).containsExactly("title");
        assertThat(invalidFields(new CreatePostDTO("x".repeat(PostLimits.TITLE_MAX), null, 1L))).isEmpty();
        assertThat(invalidFields(new CreatePostDTO("x".repeat(PostLimits.TITLE_MAX + 1), null, 1L)))
                .containsExactly("title");
    }

    @Test
    void create_contentIsLimited() {
        assertThat(invalidFields(new CreatePostDTO("Title", "x".repeat(PostLimits.CONTENT_MAX + 1), 1L)))
                .containsExactly("content");
    }

    @Test
    void create_communityIdIsRequiredAndPositive() {
        assertThat(invalidFields(new CreatePostDTO("Title", null, null))).containsExactly("communityId");
        assertThat(invalidFields(new CreatePostDTO("Title", null, 0L))).containsExactly("communityId");
    }

    @Test
    void edit_valid_withAndWithoutContent() {
        assertThat(invalidFields(new EditPostDTO("New title", "New body"))).isEmpty();
        assertThat(invalidFields(new EditPostDTO("New title", null))).isEmpty();
    }

    @Test
    void edit_titleIsRequiredAndLimited_contentIsLimited() {
        assertThat(invalidFields(new EditPostDTO("", null))).containsExactly("title");
        assertThat(invalidFields(new EditPostDTO("x".repeat(PostLimits.TITLE_MAX + 1), null)))
                .containsExactly("title");
        assertThat(invalidFields(new EditPostDTO("Title", "x".repeat(PostLimits.CONTENT_MAX + 1))))
                .containsExactly("content");
    }

    private static Set<String> invalidFields(Object request) {
        return validator.validate(request).stream()
                .map(ConstraintViolation::getPropertyPath)
                .map(Object::toString)
                .collect(Collectors.toSet());
    }
}
