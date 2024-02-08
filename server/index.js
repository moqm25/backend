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

app.get("/api/top-films", (req, res) => {
	db.query(
		`
SELECT f.film_id, f.title, COUNT(r.rental_id) AS rental_count
FROM film f
JOIN inventory i ON f.film_id = i.film_id
JOIN rental r ON i.inventory_id = r.inventory_id
GROUP BY f.film_id, f.title
ORDER BY rental_count DESC
LIMIT 5;
`,
		(err, result) => {
			if (err) throw err;
			res.json(result);
		}
	);
});

app.get("/api/top-actors", (req, res) => {
	db.query(
		`
SELECT a.actor_id, a.first_name, a.last_name, COUNT(fa.film_id) AS film_count
FROM actor a
JOIN film_actor fa ON a.actor_id = fa.actor_id
JOIN film f ON fa.film_id = f.film_id
JOIN inventory i ON f.film_id = i.film_id
GROUP BY a.actor_id, a.first_name, a.last_name
ORDER BY film_count DESC
LIMIT 5;
`,
		(err, result) => {
			if (err) throw err;
			res.json(result);
		}
	);
});
