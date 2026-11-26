-- The community's name, copied from community-service when the post is created (like author_username), so a
-- list of posts can show "l/name" without asking community-service on every read. Community names never change.
-- Nullable: posts written before this column have no name, and SQL can't fetch it from the other service.
ALTER TABLE posts ADD COLUMN community_name VARCHAR(50);
