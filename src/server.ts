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

//Users
app.get("/users", async (_req, res) => {
    try {
        const text = "SELECT id, name FROM users ORDER BY name";
        const result = await client.query(text);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
    }
});

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

//Users votes
app.get("/users/:userId/votes", async (req, res) => {
    try {
        const { userId } = req.params;
        const queryText = "SELECT * FROM users_votes where user_id = $1";
        const queryResult = await client.query(queryText, [userId]);
        res.status(200).json(queryResult.rows);
    } catch (error) {
        console.log(error);
    }
});

app.post("/users/:userId/votes", async (req, res) => {
    try {
        const { userId } = req.params;
        const { resourceId, voted } = req.body;
        const queryText =
            "INSERT INTO users_votes (user_id, resource_id, voted) values ($1, $2, $3) returning *";
        const queryResult = await client.query(queryText, [
            userId,
            resourceId,
            voted,
        ]);
        res.status(200).json(queryResult.rows);
    } catch (error) {
        console.log(error);
    }
});

app.patch("/users/:userId/votes/:resourceId", async (req, res) => {
    try {
        const { userId, resourceId } = req.params;
        const { voted } = req.body;
        const queryText =
            "UPDATE users_votes SET voted = $1 WHERE user_id = $2 AND resource_id = $3 returning *";
        const queryResult = await client.query(queryText, [
            voted,
            userId,
            resourceId,
        ]);
        res.status(200).json(queryResult.rows);
    } catch (error) {
        console.log(error);
    }
});

//Tags
app.get("/tags", async (_req, res) => {
    try {
        const text = "SELECT * FROM tags";
        const result = await client.query(text);
        res.status(200).json(result.rows);
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

// Resources
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
    ORDER BY resources.id DESC;`;

        const result = await client.query(queryText, [id]);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
    }
});

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

app.delete("/resources/:id", async (req, res) => {
    try {
        const id = req.params.id;
        if (isNaN(parseInt(id))) {
            return res.status(400).json({ error: "Invalid ID provided." });
        }
        const value = [id];
        await client.query(
            "DELETE FROM resource_votes WHERE resource_votes.resource_id = $1",
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

//Resource comments
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

app.get("/resources/:id/comments/:commentId", async (req, res) => {
    try {
        const id = req.params.id;
        const commentId = req.params.commentId;
        const text =
            " SELECT b.id, users.name, b.comment FROM resource_comments  AS b JOIN users ON b.commented_by = users.id WHERE b.resource_id = $1 AND b.id = $2";
        const value = [id, commentId];
        const result = await client.query(text, value);
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error(error);
    }
});

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

app.delete("/resources/:id/comments/:commentId", async (req, res) => {
    try {
        const id = req.params.id;
        const commentId = req.params.commentId;
        const text =
            "DELETE FROM resource_comments WHERE resource_id = $1 AND id = $2 RETURNING *";
        const value = [id, commentId];
        const result = await client.query(text, value);
        console.log(result.rows[0], "Comment deleted successfully");
        res.status(200).json({ message: "Comment deleted successfully" });
    } catch (error) {
        console.error(error);
    }
});

//Resource votes
app.get("/resources/:id/votes", async (req, res) => {
    try {
        const id = req.params.id;
        const text =
            "SELECT likes, dislikes FROM resource_votes WHERE resource_id = $1";
        const value = [id];
        const result = await client.query(text, value);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
    }
});

app.patch("/resources/:id/votes", async (req, res) => {
    try {
        const { voteType, voteAmount } = req.body;
        const id = req.params.id;
        let queryText;
        let queryResult;
        if (voteType === "like") {
            queryText =
                "INSERT INTO resource_votes (resource_id, likes) VALUES ($1, 1) ON CONFLICT (resource_id) DO UPDATE SET likes = resource_votes.likes + $2 returning *";
            queryResult = await client.query(queryText, [id, voteAmount]);
        } else {
            queryText =
                "INSERT INTO resource_votes (resource_id, likes) VALUES ($1, 1) ON CONFLICT (resource_id) DO UPDATE SET dislikes = resource_votes.dislikes + $2 returning *";
            queryResult = await client.query(queryText, [id, voteAmount]);
        }
        res.status(200).json(queryResult.rows);
    } catch (error) {
        console.log(error);
    }
});

// Study list
app.get("/users/:userId/study-list", async (req, res) => {
    try {
        const { userId } = req.params;
        const queryText =
            "SELECT id, resource_id, is_completed FROM study_list WHERE user_id = $1";
        const queryResult = await client.query(queryText, [userId]);
        res.status(200).json(queryResult.rows);
    } catch (error) {
        console.log(error);
    }
});

app.post("/users/:userId/study-list", async (req, res) => {
    try {
        const { userId } = req.params;
        const { resourceId } = req.body;
        const queryText =
            "INSERT INTO study_list (user_id, resource_id) VALUES ($1, $2) returning *";
        const queryResult = await client.query(queryText, [userId, resourceId]);
        res.status(200).json(queryResult.rows);
    } catch (error) {
        console.log(error);
    }
});

app.patch("/users/:userId/study-list/:resourceId", async (req, res) => {
    try {
        const { userId, resourceId } = req.params;
        const { isCompleted } = req.body;
        const queryText =
            "UPDATE study_list SET is_completed = $1  WHERE user_id = $2 AND resource_id = $3 returning *";
        const queryResult = await client.query(queryText, [
            isCompleted,
            userId,
            resourceId,
        ]);
        res.status(200).json(queryResult.rows);
    } catch (error) {
        console.log(error);
    }
});

app.delete("/users/:userId/study-list/:resourceId", async (req, res) => {
    try {
        const { userId, resourceId } = req.params;
        const queryText =
            "DELETE FROM study_list WHERE user_id = $1 AND resource_id = $2 returning *";
        const queryResult = await client.query(queryText, [userId, resourceId]);
        res.status(200).json(queryResult.rows);
    } catch (error) {
        console.log(error);
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
