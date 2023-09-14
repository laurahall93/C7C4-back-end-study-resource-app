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
        const text = "SELECT id, name FROM users WHERE id = $1";
        const value = [id];
        const result = await client.query(text, value);
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error(error);
    }
});
// GET all resources
app.get("/resources", async (_req, res) => {
    try {
        const text =
            "SELECT a.id, a.title, a.author, a.url, a.description, a.tags, a.type, a.first_study_time, a.creation_time, a.user_comment, a.comment_reason, users.name FROM resources AS a JOIN users ON a.created_by = users.id ORDER BY a.id DESC";
        const result = await client.query(text);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
    }
});
// GET Resources by id
app.get("/resources/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const text =
            "SELECT a.id, a.title, a.author, a.url, a.description, a.tags, a.type, a.first_study_time, a.creation_time, a.user_comment, a.comment_reason, users.name FROM resources AS a JOIN users ON a.created_by = users.id WHERE a.id = $1";
        const value = [id];
        const result = await client.query(text, value);
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error(error);
    }
});
//Post new resource
app.post("/resources/", async (req, res) => {
    try {
        const data = req.body;
        const text =
            "INSERT INTO resources (title, author, url, description, tags, type, first_study_time, created_by, user_comment, comment_reason) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *";
        const value = [
            data.title,
            data.author,
            data.url,
            data.description,
            data.tags,
            data.type,
            data.first_study_time,
            data.created_by,
            data.user_comment,
            data.comment_reason,
        ];
        const result = await client.query(text, value);
        res.status(201).json(result.rows);
        console.log("Data added to DB");
    } catch (error) {
        console.error(error);
    }
});

//DELETE resource by id

app.delete("/resources/:id", async (req, res) => {
    try {
        const id = req.params.id;
        if (isNaN(parseInt(id))) {
            return res.status(400).json({ error: "Invalid ID provided." });
        }
        const text = "DELETE FROM resources WHERE id = $1 RETURNING *";
        const value = [id];
        const result = await client.query(text, value);
        console.log(result.rows[0], "Deleted successfully");
        res.status(200).json({ message: "Resource deleted successfully" });
    } catch (error) {
        console.error(error);
    }
});

//POST comments on resource by id

app.post("/resources/:id/comments", async (req, res) => {
    try {
        const id = req.params.id;
        const data = req.body;
        const comment = data.comment;
        const commented_by = data.commented_by;
        const text =
            "INSERT INTO resource_comments (resource_id, commented_by, comment) VALUES ($1, $2, $3) RETURNING *";
        const value = [id, commented_by, comment];
        const result = await client.query(text, value);
        res.status(201).json(result.rows);
    } catch (error) {
        console.error(error);
    }
});

//GET all coments for resource
app.get("/resources/:id/comments", async (req, res) => {
    try {
        const id = req.params.id;
        const text =
            "SELECT b.id, users.name, b.comment FROM resource_comments  AS b JOIN users ON b.commented_by = users.id WHERE b.resource_id = $1";
        const value = [id];
        const result = await client.query(text, value);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
    }
});
// GET comment from resources by comments id
app.get("/resources/:id/comments/:comment_id", async (req, res) => {
    try {
        const id = req.params.id;
        const comment_id = req.params.comment_id;
        const text =
            " SELECT b.id, users.name, b.comment FROM resource_comments  AS b JOIN users ON b.commented_by = users.id WHERE b.resource_id = $1 AND b.id = $2";
        const value = [id, comment_id];
        const result = await client.query(text, value);
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error(error);
    }
});

app.delete("/resources/:id/comments/:comment_id", async (req, res) => {
    try {
        const id = req.params.id;
        const comment_id = req.params.comment_id;
        const text =
            "DELETE FROM resource_comments WHERE resource_id = $1 AND id = $2 RETURNING *";
        const value = [id, comment_id];
        const result = await client.query(text, value);
        console.log(result.rows[0], "Comment deleted successfully");
        res.status(200).json({ message: "Comment deleted successfully" });
    } catch (error) {
        console.error(error);
    }
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
