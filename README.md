# mark-fullstack-proj--starter-1

## Usage:

Instead of cloning this project, click "Use this template". This will allow you to create a repo on github which has this project's content but which is not a fork of it.

Make sure you create the repo as being owned by your own account.

## Install

`yarn`

## DB Setup

Ccreate an .env file and set `DATABASE_URL`, `LOCAL_DATABASE_URL` and `PORT`.

e.g.

```
DATABASE_URL=postgres://someuser:somebigsecretpassword@somedbhost/pastebin
LOCAL_DATABASE_URL=postgres://user@localhost/pastebin
PORT=4000
```

Running the queries in the database.sql file will recreate our database tables.

Our remote server and database are hosted on:

-   https://render.com
-   https://www.elephantsql.com/

## Running locally

`yarn start:dev-with-local-db`

The env var LOCAL_DATABASE_URL will be consulted.

## Running locally against a remote db

`yarn start:dev`

The env var DATABASE_URL will be consulted.

# Deploying to render.com

To deploy to render.com:

-   build command should be `yarn && yarn build`

## Running on render.com

After deployment, render.com should be set up to run either `yarn start` or
`node dist/server.js`

The env var DATABASE_URL will be consulted and so must be set on render.com prior to application start.
