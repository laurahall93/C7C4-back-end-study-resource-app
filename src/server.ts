import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { Client } from "pg";
import { getEnvVarOrFail } from "./support/envVarUtils";
import { setupDBClientConfig } from "./support/setupDBClientConfig";

dotenv.config(); //Read .env file lines as though they were env vars.

const dbClientConfig = setupDBClientConfig();
const client = new Client(dbClientConfig);

//Configure express routes
const app = express();

app.use(express.json()); //add JSON body parser to each following route handler
app.use(cors()); //add CORS support to each following route handler

app.get("/", async (_req, res) => {
    res.json({
        msg: "Hello! There's nothing interesting for GET , Try /users",
    });
});
//GET all users
app.get("/users", async (_req, res) => {
    try {
        const text = "SELECT id, name FROM users ORDER BY name";
        const result = await client.query(text);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
    }
});

//GET users by id
app.get("/users/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const text = "SELECT name FROM users WHERE id = $1";
        const value = [id];
        const result = await client.query(text, value);
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error(error);
    }
});

app.get("/resources", async (_req, res) => {
    try {
        const text =
            "SELECT a.id, a.title, a.author, a.url, a.description, a.tags, a.type, a.first_study_time, a.creation_time, a.user_comment, a.comment_reason, users.name FROM resources AS a JOIN users ON a.created_by = users.id ORDER BY creation_time DESC";
        const result = await client.query(text);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
    }
});

app.get("/resources/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const text =
            "SELECT a.id, a.title, a.author, a.url, a.description, a.tags, a.type, a.first_study_time, a.creation_time, a.user_comment, a.comment_reason, users.name FROM resources AS a JOIN users ON a.created_by = users.id WHERE a.id = $1";
        const value = [id];
        const result = await client.query(text, value);
        res.status(200).json(result.rows[0]);
    } catch (error) {}
});

app.get("/health-check", async (_req, res) => {
    try {
        //For this to be successful, must connect to db
        await client.query("select now()");
        res.status(200).send("system ok");
    } catch (error) {
        //Recover from error rather than letting system halt
        console.error(error);
        res.status(500).send("An error occurred. Check server logs.");
    }
});

connectToDBAndStartListening();

async function connectToDBAndStartListening() {
    console.log("Attempting to connect to db");
    await client.connect();
    console.log("Connected to db!");

    const port = getEnvVarOrFail("PORT");
    app.listen(port, () => {
        console.log(
            `Server started listening for HTTP requests on port ${port}.  Let's go!`
        );
    });
}
