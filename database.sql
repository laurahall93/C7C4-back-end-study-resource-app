DROP TABLE IF EXISTS users;

CREATE TABLE users(
    id SERIAL PRIMARY KEY,
    name VARCHAR (50) NOT NULL,
    is_faculty BOOLEAN DEFAULT false
);

CREATE TYPE user_comment_options AS ENUM('I recommend this resource after having used it','I do not recommend this resource, having used it','I have not used this resource but it looks promising');

DROP TABLE IF EXISTS resources;

CREATE TABLE resources(
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(50) NOT NULL,
    url VARCHAR(1000) NOT NULL,
    description VARCHAR(1000) NOT NULL,
    tags VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    first_study_time VARCHAR(255) NOT NULL,
    creation_time DATE DEFAULT CURRENT_DATE,
    created_by INT NOT NULL REFERENCES users(id),
    user_comment user_comment_options,
    comment_reason VARCHAR(1000) NOT NULL
);

DROP TABLE IF EXISTS resource_votes;

CREATE TABLE resource_votes(
    id INT REFERENCES resources(id),
    likes INT DEFAULT 0,
    dislikes INT DEFAULT 0
);

DROP TABLE IF EXISTS resource_comments;

CREATE TABLE resource_comments(
    id SERIAL PRIMARY KEY,
    resource_id INT REFERENCES resources(id),
    commented_by INT REFERENCES users(id),
    comment VARCHAR(1000) NOT NULL
);

DROP TABLE IF EXISTS users_votes;

CREATE TABLE users_votes(
    id  INT REFERENCES users(id),
    resource_id INT REFERENCES resources(id),
    has_liked BOOLEAN DEFAULT false,
    has_disliked BOOLEAN DEFAULT false
);

DROP TABLE IF EXISTS study_list;

CREATE TABLE study_list(
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    resource_id INT REFERENCES resources(id),
    is_completed BOOLEAN DEFAULT false
);