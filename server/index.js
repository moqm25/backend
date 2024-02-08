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

app.get("/api/films/:title", (req, res) => {
	db.query(
		`
SELECT f.film_id, f.title, f.description, f.release_year, f.language_id, f.rental_duration, f.rental_rate, f.length, f.replacement_cost, f.rating, f.special_features
FROM film f
WHERE f.title = ?;
`,
		[req.params.title],
		(err, result) => {
			if (err) throw err;
			res.json(result[0]);
		}
	);
});

app.get("/api/actors/:firstName/:lastName", (req, res) => {
	db.query(
		`
SELECT a.actor_id, a.first_name, a.last_name, f.title, COUNT(r.rental_id) as rental_count
FROM actor a
JOIN film_actor fa ON a.actor_id = fa.actor_id
JOIN film f ON fa.film_id = f.film_id
JOIN inventory i ON f.film_id = i.film_id
JOIN rental r ON i.inventory_id = r.inventory_id
WHERE a.first_name = ? AND a.last_name = ?
GROUP BY a.actor_id, a.first_name, a.last_name, f.title
ORDER BY rental_count DESC
LIMIT 5;
`,
		[req.params.firstName, req.params.lastName],
		(err, result) => {
			if (err) throw err;
			res.json({
				actor_id: result[0].actor_id,
				first_name: result[0].first_name,
				last_name: result[0].last_name,
				films: result.map((film) => ({
					title: film.title,
					rental_count: film.rental_count,
				})),
			});
		}
	);
});

app.get("/api/films-genre-actor", (req, res) => {
	const { film_name, actor_first_name, actor_last_name, genre_name } =
		req.query;
	db.query(
		`
SELECT DISTINCT f.film_id, f.title, a.first_name, a.last_name, c.name AS genre
FROM film f
LEFT JOIN film_actor fa ON f.film_id = fa.film_id
LEFT JOIN actor a ON fa.actor_id = a.actor_id
LEFT JOIN film_category fc ON f.film_id = fc.film_id
LEFT JOIN category c ON fc.category_id = c.category_id
WHERE (f.title LIKE CONCAT('%', ?, '%') OR ? IS NULL)
AND (a.first_name LIKE CONCAT('%', ?, '%') OR ? IS NULL)
AND (a.last_name LIKE CONCAT('%', ?, '%') OR ? IS NULL)
AND (c.name LIKE CONCAT('%', ?, '%') OR ? IS NULL);
`,
		[
			film_name,
			film_name,
			actor_first_name,
			actor_first_name,
			actor_last_name,
			actor_last_name,
			genre_name,
			genre_name,
		],
		(err, result) => {
			if (err) throw err;
			res.json(result);
		}
	);
});

app.get("/api/filmsid/:film_id", (req, res) => {
	db.query(
		`
SELECT f.film_id, f.title, f.description, f.release_year, f.language_id, f.rental_duration, f.rental_rate, f.length, f.replacement_cost, f.rating, f.special_features
FROM film f
WHERE f.film_id = ?;
`,
		[req.params.film_id],
		(err, result) => {
			if (err) throw err;
			res.json(result[0]);
		}
	);
});
