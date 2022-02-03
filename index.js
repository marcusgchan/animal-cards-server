const express = require("express");
const { Pool } = require("pg");
const ApiError = require("./error/ApiError");
const KEYS = require("./utils/databaseKeys");
const PORT = process.env.PORT || 3001;
const DATABASE_NAME = "animal_cards";
const TABLE_NAME = "animals";
const CONNECTION_STRING = `postgresql://postgres@localhost:5432/${DATABASE_NAME}`;
const KEYS_SET = new Set(KEYS);

const app = express();

const pool = new Pool({ connectionString: CONNECTION_STRING });

app.use(express.json());

app.get("/", (req, res) => {
  res.send("test!");
});

app.get("/api/animals", (req, res, next) => {
  pool
    .query(`SELECT * FROM ${TABLE_NAME}`)
    .then((data) => res.json(data.rows))
    .catch((err) =>
      next(
        ApiError.internal("Something went wrong with the database conenction")
      )
    );
});

app.post("/api/animals", (req, res, next) => {
  function getInputQueryString(card) {
    const columnNames = Object.keys(card).join(", ");
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
      console.log("test");
      next(ApiError.internal("Something went wrong with the query."));
    });
});

app.use(errorHandler);

function errorHandler(err, req, res, next) {
  console.log(err);
  if (err instanceof ApiError) {
    return res.status(err.code).send({ message: err.msg });
  }

  res.status(500).json("Something went wrong with the server.");
}

app.listen(PORT, () => console.log("Server is running!"));
