const { port, host, user, password, database } = require("./config/config.js");

const mysql = require("mysql");
const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

app.get("/api/customer-exists/:customer_id", (req, res) => {
	const { customer_id } = req.params;
	const query = `
SELECT EXISTS(
SELECT 1 
FROM customer 
WHERE customer_id = ?
) AS 'Exists';
`;
	db.query(query, [customer_id], (err, result) => {
		if (err) throw err;
		res.json(result[0]);
	});
});

app.get("/api/all-customers", (req, res) => {
	const { first_name, last_name, customer_id } = req.query;

	let query = `
SELECT customer_id, first_name, last_name 
FROM customer
WHERE (first_name LIKE CONCAT('%', ?, '%') OR ? IS NULL)
AND (last_name LIKE CONCAT('%', ?, '%') OR ? IS NULL)
AND (customer_id = ? OR ? IS NULL);
`;

	db.query(
		query,
		[first_name, first_name, last_name, last_name, customer_id, customer_id],
		(err, result) => {
			if (err) throw err;
			res.json(result);
		}
	);
});

app.get("/api/rentals/:customer_id", (req, res) => {
	const { customer_id } = req.params;
	const query = `
SELECT r.customer_id, f.film_id, f.title, r.rental_id,
CASE
WHEN r.return_date IS NULL THEN 'Rented Out'
ELSE 'Returned'
END AS rental_status
FROM rental r
JOIN inventory i ON r.inventory_id = i.inventory_id
JOIN film f ON i.film_id = f.film_id
WHERE r.customer_id = ?
ORDER BY r.rental_date;
`;
	db.query(query, [customer_id], (err, result) => {
		if (err) throw err;
		res.json(result);
	});
});

app.post("/api/rent-film", (req, res) => {
	const { customer_id, inventory_id } = req.body;
	const staff_id = 1; // replace with actual staff_id

	db.query(
		`SELECT inventory_id FROM inventory WHERE film_id = ${inventory_id} LIMIT 1`,
		(err, result) => {
			if (err) throw err;

			const inventory_id = result[0].inventory_id;

			// Insert a new rental
			db.query(
				`INSERT INTO rental (rental_date, inventory_id, customer_id, return_date, staff_id) VALUES (NOW(), ${inventory_id}, ${customer_id}, NULL, ${staff_id})`,
				(err, result) => {
					if (err) throw err;
					res.json({ message: "Film rented successfully!" });
				}
			);
		}
	);
});

app.post("/api/add-customer", (req, res) => {
	const {
		firstName,
		lastName,
		email,
		address,
		district,
		city,
		postalCode,
		phone,
		country,
	} = req.body;
	db.query(
		`SELECT country_id FROM country WHERE country = '${country}'`,
		(err, result) => {
			if (err) throw err;
			const countryId = result[0].country_id;
			console.log(`countryId ${countryId}, ${city}`);

			// Look up the city_id
			db.query(
				`SELECT city_id FROM city WHERE city = '${city}'`,
				(err, result) => {
					if (err) throw err;
					const cityId = result[0].city_id;
					console.log(`cityId ${cityId}`);

					// Insert a new address
					db.query(
						"INSERT INTO address (address, district, city_id, postal_code, phone, location) VALUES (?, ?, ?, ?, ?, geometrycollection())",
						[address, district, cityId, postalCode, phone],
						(err, result) => {
							if (err) throw err;
							const addressId = result.insertId;

							// Insert a new customer
							db.query(
								"INSERT INTO customer (store_id, first_name, last_name, email, address_id, active, create_date) VALUES (1, ?, ?, ?, ?, 1, NOW())",
								[firstName, lastName, email, addressId],
								(err, result) => {
									if (err) throw err;
									res.json({ message: "Customer added successfully!" });
								}
							);
						}
					);
				}
			);
		}
	);
});
app.delete("/api/delete-customer/:customer_id", (req, res) => {
	const { customer_id } = req.params;
	db.query(
		`DELETE FROM customer WHERE customer_id = ?`,
		[customer_id],
		(err, result) => {
			if (err) throw err;
			res.json({ message: "Customer deleted successfully!" });
		}
	);
});

app.put("/api/edit-customer/:customer_id", (req, res) => {
	const {
		firstName,
		lastName,
		email,
		address,
		district,
		city,
		postalCode,
		phone,
		country,
		customerId,
		active,
	} = req.body;

	// const { customer_id } = req.params;

	db.query(
		`SELECT country_id FROM country WHERE country = '${country}'`,
		(err, result) => {
			if (err) throw err;
			const countryId = result[0].country_id;

			db.query(
				`SELECT city_id FROM city WHERE city = '${city}'`,
				(err, result) => {
					if (err) throw err;
					const cityId = result[0].city_id;

					db.query(
						`SELECT address_id FROM customer WHERE customer_id = ${customerId}`,
						(err, result) => {
							if (err) throw err;
							const addressId = result[0].address_id;

							db.query(
								"UPDATE address SET address = ?, district = ?, city_id = ?, postal_code = ?, phone = ? WHERE address_id = ?",
								[address, district, cityId, postalCode, phone, addressId],
								(err, result) => {
									if (err) throw err;

									db.query(
										"UPDATE customer SET first_name = ?, last_name = ?, email = ?, active = ? WHERE customer_id = ?",
										[firstName, lastName, email, active, customerId], // include 'active' in the update statement
										(err, result) => {
											if (err) throw err;
											res.json({ message: "Customer updated successfully!" });
										}
									);
								}
							);
						}
					);
				}
			);
		}
	);
});

app.get("/api/customer/:id", (req, res) => {
	const customerId = req.params.id;

	const query = `
		SELECT 
			customer.first_name,
			customer.last_name,
			customer.email,
			address.address,
			address.district,
			city.city,
			address.postal_code,
			address.phone,
			country.country,
			customer.active
		FROM 
			customer
		INNER JOIN 
			address ON customer.address_id = address.address_id
		INNER JOIN 
			city ON address.city_id = city.city_id
		INNER JOIN 
			country ON city.country_id = country.country_id
		WHERE 
			customer.customer_id = ?`;
	// console.log(`${query}`);
	db.query(query, [customerId], (err, result) => {
		if (err) throw err;
		res.json(result[0]);
	});
});

app.listen(port, () => {
	console.log(`Server running at http://localhost:${port}`);
});
