import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { Client } from "pg";
import { getEnvVarOrFail } from "./support/envVarUtils";
import { setupDBClientConfig } from "./support/setupDBClientConfig";
//import { request } from "http";

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
app.post("/tags", async (req, res) => {
    try {
        const data = req.body;
        const text = "INSERT INTO tags (tag_name) VALUES ($1) RETURNING *";
        const value = [data.tag_name];
        const result = await client.query(text, value);
        res.status(201).json(result.rows);
        console.log("Tag added to DB");
    } catch (error) {
        console.error(error);
        res.status(500).json("Internal server error, check your server logs");
    }
});

app.delete("/tags/:id", async (req, res) => {
    try {
        const tagsId = req.params.id;
        const text = "DELETE FROM tags WHERE id = $1 RETURNING *";
        const value = [tagsId];
        const result = await client.query(text, value);
        console.log(result.rows[0], "Deleted successfully");
        res.status(200).json({ message: "Resource deleted successfully" });
    } catch (error) {
        console.error(error);
    }
});

app.get("/tags", async (_req, res) => {
    try {
        const text = "SELECT * FROM tags";
        const result = await client.query(text);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
    }
});

app.get("/resources", async (_req, res) => {
    try {
        const queryText = `
    SELECT resources.*, users.name AS user_name, STRING_AGG(tags.tag_name, ',') AS tags
    FROM resources
    INNER JOIN users ON resources.created_by = users.id
    INNER JOIN resource_tags ON resources.id = resource_tags.resource_id
    INNER JOIN tags ON resource_tags.tag_id = tags.id
    GROUP BY resources.id, users.name
    ORDER BY resources.id DESC;
  `;

        const result = await client.query(queryText);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
    }
});

app.get("/resources/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const queryText = `
    SELECT resources.*, users.name AS user_name, STRING_AGG(tags.tag_name, ',') AS tags
    FROM resources
    INNER JOIN users ON resources.created_by = users.id
    INNER JOIN resource_tags ON resources.id = resource_tags.resource_id
    INNER JOIN tags ON resource_tags.tag_id = tags.id
    GROUP BY resources.id, users.name
    HAVING resources.id = $1
    ORDER BY resources.id DESC;
  `;

        const result = await client.query(queryText, [id]);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
    }
});

//Post new resource
app.post("/resources/", async (req, res) => {
    try {
        const {
            title,
            author,
            url,
            description,
            tags,
            type,
            first_study_time,
            created_by,
            user_comment,
            comment_reason,
        } = req.body;
        const resourceQueryText =
            "INSERT INTO resources (title, author, url, description, type, first_study_time, created_by, user_comment, comment_reason) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *";
        const resourceValues = [
            title,
            author,
            url,
            description,
            type,
            first_study_time,
            created_by,
            user_comment,
            comment_reason,
        ];
        const result = await client.query(resourceQueryText, resourceValues);
        const resourceId = result.rows[0].id;
        for (const tag of tags) {
            const tagIdResult = await client.query(
                "SELECT id from tags where tag_name = $1",
                [tag]
            );
            const tagId = tagIdResult.rows[0].id;
            await client.query("INSERT INTO resource_tags VALUES ($1, $2)", [
                resourceId,
                tagId,
            ]);
        }
        res.status(200).json(result.rows);
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
        const value = [id];
        await client.query(
            "DELETE FROM resource_votes WHERE resource_votes.id = $1",
            value
        );
        await client.query(
            "DELETE FROM resource_comments WHERE resource_id = $1",
            value
        );

        await client.query(
            "DELETE FROM resource_tags WHERE resource_id = $1",
            value
        );

        const text = "DELETE FROM resources WHERE id = $1 RETURNING *";

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

app.get("/resources/:id/likes", async (req, res) => {
    try {
        const id = req.params.id;
        const text = "SELECT likes FROM resource_votes WHERE id = $1";
        const value = [id];
        const result = await client.query(text, value);
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error(error);
    }
});

app.put("/resources/:id/likes", async (req, res) => {
    try {
        const id = req.params.id;
        const text =
            "INSERT INTO resource_votes (id, likes) VALUES ($1, 1) ON CONFLICT (id) DO UPDATE SET likes = resource_votes.likes + 1";
        const value = [id];
        await client.query(text, value);
        const updatedResult = await client.query(
            "SELECT likes FROM resource_votes WHERE id = $1",
            [id]
        );
        console.log("Updated likes count:", updatedResult.rows[0].likes);
        res.status(200).send("updated successfully");
    } catch (error) {
        console.log(error);
    }
});

app.get("/resources/:id/dislikes", async (req, res) => {
    try {
        const id = req.params.id;
        const text = "SELECT dislikes FROM resource_votes WHERE id = $1";
        const value = [id];
        const result = await client.query(text, value);
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error(error);
    }
});

app.put("/resources/:id/dislikes", async (req, res) => {
    try {
        const id = req.params.id;
        const text =
            "INSERT INTO resource_votes (id, dislikes) VALUES ($1, 1) ON CONFLICT (id) DO UPDATE SET dislikes = resource_votes.dislikes + 1";
        const value = [id];
        await client.query(text, value);
        const updatedResult = await client.query(
            "SELECT dislikes FROM resource_votes WHERE id = $1",
            [id]
        );
        console.log("Updated dislikes count:", updatedResult.rows[0].dislikes);
        res.status(200).send("updated successfully");
    } catch (error) {
        console.log(error);
    }
});

// app.get("/users/:id/study_list", async (req, res) => {
//     try {
//         const userId = req.params.id;
//         const text = "SELECT study_list.id AS study_list_id, user.name AS user_name, resources.title ";
//     } catch (error) {
//         console.log(error);
//     }
// });

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
