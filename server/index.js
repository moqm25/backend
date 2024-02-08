const {
	port,
	host,
	user,
	password,
	database,
} = require("configurations/config.js");

const mysql = require("mysql");
const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());

const db = mysql.createConnection({
	host: host,
	user: user,
	password: password,
	database: database,
});

db.connect((err) => {
	if (err) throw err;
	console.log("Connected to the database!");
});
