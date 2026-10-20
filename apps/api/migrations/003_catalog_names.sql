CREATE UNIQUE INDEX dishes_name_case_insensitive_idx ON dishes (lower(name));
CREATE UNIQUE INDEX school_groups_name_case_insensitive_idx ON school_groups (lower(name));
