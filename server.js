const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = 3000;

// Database Connection Pool
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'Library2026!',
    database: 'library_app',
    waitForConnections: true,    
    connectionLimit: 10,    
    queueLimit: 0
});



app.use(cors({
    // Only allow requests from own server's origin.
    origin: 'http://localhost:3000',
    
    // Allows use of session cookies with AJAX Queries
    credentials: true
    
}));

app.use(express.json());

app.get('/', function(req, res) {
    res.redirect('/home.html');
});

// Serves HTML, CSS, and JS files from the public/ folder.
app.use(express.static('public', { index: false }));

app.use(session({
    // Verifies session cookies
    secret: 'library-app-secret-key-change-this-in-production',
    
    // Don't save the session back to the store if it wasn't modified.
    resave: false,

    // Don't create a session for requests that don't need one
    saveUninitialized: false,
    
    cookie: {
        secure: false,
        
        // How long the session cookie lasts, in milliseconds, set to 1 week
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}));



// Checks if the user is logged in and rejects the request if not.
function requireAuth(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'You must be logged in.' });
    }
    next();
}

// POST /auth/signup — create a new user account
app.post('/auth/signup', async function(req, res) {
    
    try {
        // Destructuring: pulls name, email, password out of req.body
        const { name, email, password } = req.body;

        // Server-side validation 
        if (!name || name.trim().length < 1) {
            return res.status(400).json({ error: 'Name is required.' });
        }
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: 'A valid email is required.' });
        }
        if (!password || password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters.' });
        }

        // Check if this email is already registered
        const [existingRows] = await db.execute(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );
        
        if (existingRows.length > 0) {
            return res.status(400).json({ error: 'An account with this email already exists.' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);
        
        // Insert the new user into the database
        const [result] = await db.execute(
            'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
            [name.trim(), email.toLowerCase(), hashedPassword]
        );
        
        // Set up the session — the user is now logged in
        req.session.userId = result.insertId;
        req.session.userName = name.trim();
        req.session.userEmail = email.toLowerCase();

        // Send back user info
        res.status(201).json({
            id: result.insertId,
            name: name.trim(),
            email: email.toLowerCase()
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
});

// POST /auth/login — verify credentials and start session
app.post('/auth/login', async function(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        // Find the user by email
        const [rows] = await db.execute(
            'SELECT id, name, email, password FROM users WHERE email = ?',
            [email.toLowerCase()]
        );

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const user = rows[0];

        // Compare the entered password against the stored hash
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // Credentials verified — set up the session
        req.session.userId = user.id;
        req.session.userName = user.name;
        req.session.userEmail = user.email;

        res.json({
            id: user.id,
            name: user.name,
            email: user.email
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
});

// POST /auth/logout — destroy the session
app.post('/auth/logout', function(req, res) {
    req.session.destroy(function(err) {
        if (err) {
            return res.status(500).json({ error: 'Logout failed.' });
        }
        // Remove cookie from browser
        res.clearCookie('connect.sid');

        res.json({ message: 'Logged out successfully.' });
    });
});

// GET /auth/me — check if someone is currently logged in, called on page load
app.get('/auth/me', function(req, res) {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not logged in.' });
    }
    res.json({
        id: req.session.userId,
        name: req.session.userName,
        email: req.session.userEmail
    });
});

// GET /books — return all books for the logged-in user
app.get('/books', requireAuth, async function(req, res) {
    try {
        const [rows] = await db.execute(
            'SELECT * FROM books WHERE user_id = ? ORDER BY created_at DESC',
            [req.session.userId]
        );
        
        res.json(rows);
    } catch (error) {
        console.error('Get books error:', error);
        res.status(500).json({ error: 'Failed to retrieve books.' });
    }
});

// POST /books — create a new book
app.post('/books', requireAuth, async function(req, res) {
    try {
        const { title, author, genre, status, pages, notes, wishlist, cover_url } = req.body;

        if (!title || !author) {
            return res.status(400).json({ error: 'Title and author are required.' });
        }

        const [result] = await db.execute(
            `INSERT INTO books (user_id, title, author, genre, status, pages, notes, wishlist, cover_url)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                req.session.userId,
                title,
                author,
                genre || null,
                status || null,
                pages || null,
                notes || null,
                wishlist || false,
                cover_url || null
            ]
        );

        const [newBook] = await db.execute(
            'SELECT * FROM books WHERE id = ?',
            [result.insertId]
        );

        res.status(201).json(newBook[0]);

    } catch (error) {
        console.error('Create book error:', error);
        res.status(500).json({ error: 'Failed to create book.' });
    }
});

// PUT /books/:id — update a book
app.put('/books/:id', requireAuth, async function(req, res) {
    try {
        const bookId = Number(req.params.id);
        const { title, author, genre, status, pages, notes, wishlist, cover_url } = req.body;

        // Check the book exists AND belongs to the logged-in user
        const [existing] = await db.execute(
            'SELECT id FROM books WHERE id = ? AND user_id = ?',
            [bookId, req.session.userId]
        );

        if (existing.length === 0) {
            return res.status(404).json({ error: 'Book not found.' });
        }

        await db.execute(
            `UPDATE books SET
                title = ?, author = ?, genre = ?, status = ?,
                pages = ?, notes = ?, wishlist = ?, cover_url = ?
            WHERE id = ? AND user_id = ?`,
            // Add || null to cover_url so it sends null instead of undefined
            [title, author, genre, status, pages, notes, wishlist, cover_url || null, bookId, req.session.userId]
        );

        const [updated] = await db.execute(
            'SELECT * FROM books WHERE id = ?',
            [bookId]
        );

        res.json(updated[0]);

    } catch (error) {
        console.error('Update book error:', error);
        res.status(500).json({ error: 'Failed to update book.' });
    }
});

// DELETE /books/:id — delete a book
app.delete('/books/:id', requireAuth, async function(req, res) {
    try {
        const bookId = Number(req.params.id);

        const [result] = await db.execute(
            'DELETE FROM books WHERE id = ? AND user_id = ?',
            [bookId, req.session.userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Book not found.' });

        }

        res.json({ message: 'Book deleted.' });

    } catch (error) {
        console.error('Delete book error:', error);
        res.status(500).json({ error: 'Failed to delete book.' });
    }
});

// --- Start Server ---
app.listen(PORT, function() {
    console.log('Library server running at http://localhost:' + PORT);
});