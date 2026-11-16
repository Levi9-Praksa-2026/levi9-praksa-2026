CREATE TABLE posts (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title           VARCHAR(300) NOT NULL,
    content         TEXT,
    author_id       BIGINT       NOT NULL,          -- user in auth-service: no FK across services
    author_username VARCHAR(30)  NOT NULL,
    community_id    BIGINT       NOT NULL,          -- community in community-service: no FK across services
    score           INT          NOT NULL DEFAULT 0,
    comment_count   INT          NOT NULL DEFAULT 0 CHECK (comment_count >= 0),
    version         INT          NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ,                    -- null until the author edits
    removed_at      TIMESTAMPTZ,
    removed_by      BIGINT,
    CONSTRAINT ck_posts_removed CHECK ((removed_at IS NULL) = (removed_by IS NULL))
);

CREATE INDEX ix_posts_community_created ON posts (community_id, created_at DESC);
CREATE INDEX ix_posts_community_score   ON posts (community_id, score DESC);
CREATE INDEX ix_posts_author_id         ON posts (author_id);

CREATE TABLE post_images (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    post_id    BIGINT       NOT NULL REFERENCES posts (id),
    s3_key     VARCHAR(512) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX ix_post_images_post_id ON post_images (post_id);

CREATE TABLE post_votes (
    post_id    BIGINT      NOT NULL REFERENCES posts (id),
    user_id    BIGINT      NOT NULL,
    value      SMALLINT    NOT NULL CHECK (value IN (-1, 1)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (post_id, user_id)
);

CREATE INDEX ix_post_votes_created_at ON post_votes (created_at);

CREATE TABLE comments (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    post_id         BIGINT      NOT NULL REFERENCES posts (id),
    author_id       BIGINT      NOT NULL,
    author_username VARCHAR(30) NOT NULL,
    content         TEXT        NOT NULL,
    score           INT         NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    removed_at      TIMESTAMPTZ,
    removed_by      BIGINT,
    CONSTRAINT ck_comments_removed CHECK ((removed_at IS NULL) = (removed_by IS NULL))
);

CREATE INDEX ix_comments_post_created ON comments (post_id, created_at DESC);

CREATE TABLE comment_votes (
    comment_id BIGINT      NOT NULL REFERENCES comments (id),
    user_id    BIGINT      NOT NULL,
    value      SMALLINT    NOT NULL CHECK (value IN (-1, 1)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (comment_id, user_id)
);
