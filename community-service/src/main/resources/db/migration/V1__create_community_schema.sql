CREATE TABLE communities (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name         VARCHAR(50) NOT NULL,
    description  TEXT,
    creator_id   BIGINT      NOT NULL,              -- user in auth-service: no FK across services
    is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
    member_count INT         NOT NULL DEFAULT 0 CHECK (member_count >= 0),
    version      INT         NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ux_communities_name_lower ON communities (lower(name));

CREATE TABLE community_members (
    community_id BIGINT      NOT NULL REFERENCES communities (id),
    user_id      BIGINT      NOT NULL,              -- no FK across services
    joined_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (community_id, user_id)
);

CREATE INDEX ix_community_members_user_id ON community_members (user_id);
