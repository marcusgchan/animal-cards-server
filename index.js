require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const ApiError = require("./error/ApiError");
const KEYS = require("./utils/databaseKeys");
const getType = require("./utils/checkType");
const PORT = process.env.PORT || 3001;
const DATABASE_NAME = "animals";
const TABLE_NAME = "cards";
const PASSWORD = process.env.PASSWORD;
const USERNAME = process.env.USERNAME;
const CONNECTION_STRING = `postgresql://${USERNAME}:${PASSWORD}@localhost:5432/${DATABASE_NAME}`;
const KEYS_SET = new Set(KEYS);

const app = express();

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthroized: false,
      },
    })
  : new Pool({ connectionString: CONNECTION_STRING });

app.use(cors());
app.use(express.json());
app.use(express.static("build"));

app.get("/", (req, res) => {
  res.send("hi");
});

app.get("/api/cards", (req, res, next) => {
  pool
    .query(`SELECT * FROM ${TABLE_NAME}`)
    .then((data) => res.json(data.rows))
    .catch((err) =>
      next(
        ApiError.internal("Something went wrong with the database conenction")
      )
    );
});

app.put("/api/cards/:id", (req, res, next) => {
  function buildString(card) {
    let queryValues = [];
    for (const key of KEYS_SET) {
      if (card[key] === undefined) {
        queryValues.push(`${key} = NULL`);
      } else {
        if (getType(card[key]) === "string") {
          queryValues.push(`${key} = '${card[key]}'`);
        } else if (getType(card[key]) === "number") {
          queryValues.push(`${key} = ${card[key]}`);
        } else {
          ApiError.badRequest("Value of properties must be a string or int");
          return;
        }
      }
    }
    return queryValues.join(", ");
  }
  const id = req.params.id;
  const card = req.body;

  // Check for valid input
  if (
    id === undefined ||
    isNaN(Number(id)) ||
    id.trim() === "" ||
    card === undefined ||
    card.name === undefined ||
    card.name.trim() === "" // Card must have a name
  ) {
    next(ApiError.badRequest("Invalid request"));
    return;
  }

  // test for put request where id isn't in the database
  pool
    .query(`UPDATE ${TABLE_NAME} SET ${buildString(card)} WHERE id = ${id}`)
    .then((data) => {
      res.status(204).end();
    })
    .catch((err) => next(ApiError.internal("Unable to query database")));
});

app.get("/api/cards/:id", (req, res, next) => {
  const id = req.params.id;

  if (isNaN(Number(id))) {
    next(ApiError.badRequest("Invalid request"));
    return;
  }

  pool
    .query(`SELECT * FROM ${TABLE_NAME} WHERE id=${id}`)
    .then((data) => {
      if (data.rows[0]) {
        res.json(data.rows[0]);
      } else {
        next(ApiError.notFound("This card does not exist"));
        return;
      }
    })
    .catch((err) =>
      next(
        ApiError.internal("Something went wrong with the database conenction")
      )
    );
});

app.post("/api/cards", (req, res, next) => {
  function getInputQueryString(card) {
    const columnNames = Object.keys(card);
    const columnValues = Object.values(card)
      .map((val) => {
        if (typeof val === "number") {
          return val;
        }
        // Add quotes around value
        else if (typeof val === "string") {
          return `'${val}'`;
        } else {
          next(
            ApiError.badRequest("Value of properties must be a string or int")
          );
          return;
        }
      })
      .join(", ");
    return `INSERT INTO ${TABLE_NAME}(${columnNames}) VALUES (${columnValues}) RETURNING *`;
  }

  // Check if request body is empty
  if (req.body === undefined) {
    next(ApiError.badRequest("Body of request is empty"));
    return;
  }

  // Validate keys
  const reqObj = { ...req.body };
  for (let key of Object.keys(reqObj)) {
    if (!KEYS_SET.has(key)) {
      next(ApiError.badRequest("Invalid key value pair"));
      return;
    }
  }

  // Query database
  pool
    .query(getInputQueryString(reqObj))
    .then((data) => res.json(data.rows[0]))
    .catch((err) => {
      next(ApiError.internal("Something went wrong with the query."));
      return;
    });
});

app.delete("/api/cards/:id", (req, res, next) => {
  const { id } = req.params;
  if (isNaN(Number(id))) {
    next(ApiError.badRequest("Invalid request format"));
    return;
  }

  pool
    .query(`DELETE FROM ${TABLE_NAME} WHERE id=${id}`)
    .then(() => res.status(204).end())
    .catch((err) => {
      next(ApiError.badRequest("Unable to query database to delete card"));
      return;
    });
});

app.use(errorHandler);

function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.code).send({ message: err.msg });
  }

  res.status(500).json("Something went wrong with the server.");
}

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
