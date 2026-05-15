import express from 'express';
import bodyParser from 'body-parser';
import morgan from 'morgan';
import pg from 'pg';

const app = express();
const PORT = 3000;

app.set('view engine', 'ejs');

app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('tiny'));

const db = new pg.Client({
    user: 'postgres',
    host: 'localhost',
    database: 'world',
    password: 'abhi10734',
    port: 5432
});

// Active User
let currentUserId = 1;

// Get visited countries of current user
async function checkVisited(userId) {

    const result = await db.query(
        "SELECT country_code FROM visited_countries WHERE user_id = $1",
        [userId]
    );

    let countries = [];

    result.rows.forEach((country) => {
        countries.push(country.country_code);
    });

    return countries;
}

// Render Main Page
async function renderHomePage(res, userId) {

    const countries = await checkVisited(userId);

    const usersResult = await db.query(
        "SELECT * FROM users"
    );

    const currentUserResult = await db.query(
        "SELECT * FROM users WHERE id = $1",
        [userId]
    );

    const currentUser = currentUserResult.rows[0];

    res.render('index', {
        countries: countries,
        total: countries.length,
        users: usersResult.rows,
        currentUserId: userId,
        currentUser: currentUser
    });
}

// Home Route
app.get("/", async (req, res) => {
    await renderHomePage(res, currentUserId);
});

// Switch User
app.get('/user/:id', async (req, res) => {
    currentUserId = req.params.id;

    await renderHomePage(res, currentUserId);
});

// Add Country
app.post("/add", async (req, res) => {

    const userCountry = req.body.country
        .trim()
        .toLowerCase()
        .replace(/\b\w/g, char => char.toUpperCase());

    const result = await db.query(
        "SELECT country_code FROM countries WHERE country_name = $1",
        [userCountry]
    );

    if (result.rows.length !== 0) {

        const country_code = result.rows[0].country_code;

        await db.query(
            `INSERT INTO visited_countries 
            (country_code, user_id) 
            VALUES ($1, $2)
            ON CONFLICT DO NOTHING`,
            [country_code, currentUserId]
        );
    }

    res.redirect(`/user/${currentUserId}`);
});

// Reset Current User Countries
app.post("/reset", async (req, res) => {

    await db.query(
        "DELETE FROM visited_countries WHERE user_id = $1",
        [currentUserId]
    );

    res.redirect(`/user/${currentUserId}`);
});

// Add Member Page
app.get('/new', (req, res) => {
    res.render('addFamily');
});

// Add New Member
app.post('/newMember', async (req, res) => {

    const { memberName, color } = req.body;

    await db.query(
        "INSERT INTO users(name, color) VALUES ($1, $2)",
        [memberName, color]
    );

    res.redirect('/');
});

(async () => {

    try {

        await db.connect();

        console.log('Database Connected Successfully');

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });

    } catch (error) {

        console.log('Database Connection Error:', error);
    }

})();