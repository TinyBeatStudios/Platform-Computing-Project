// Import installed packages
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const app = express();    
const PORT = 3000;        

// Allows AJAX JQuery requests
app.use(cors());

// Allows JSON to JS use
app.use(express.json());

// Provides public folder files to browser
app.use(express.static('public'));

//Data file paths
const BOOKS_FILE = path.join(__dirname, 'data', 'books.json');
const USERS_FILE = path.join(__dirname, 'data', 'users.json');

// Helper functions for reading/writing data files

function readJSON(filePath) {
    try {
        // reads the file and returns its contents as a string.
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Converts a JSON string to JS object or array.
        return JSON.parse(content);
    } catch (error) {
        return [];
    }
}

function writeJSON(filePath, data) {
    //  converts a JS array/object back to JSON string and string to the file, replacing previous content.
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// req = request (what the browser sent)
// res = response (what you send back)

// GET /books — return all books
app.get('/books', function(req, res) {
    const books = readJSON(BOOKS_FILE);
    res.json(books);
});

// POST /books — save a new book
app.post('/books', function(req, res) {
    const books = readJSON(BOOKS_FILE);
    const newBook = req.body;

    newBook.id = Date.now();

    books.push(newBook);
    writeJSON(BOOKS_FILE, books);
    
    res.status(201).json(newBook);
});

// PUT /books/:id — update an existing book
app.put('/books/:id', function(req, res) {
    // extracts the :id part from the URL
    let books = readJSON(BOOKS_FILE);
    const bookId = Number(req.params.id);
    
    const index = books.findIndex(function(b) { return b.id === bookId; });
    
    if (index === -1) {
        return res.status(404).json({ error: 'Book not found' });
    }
    
    // overwrites its properties with the new data keeps the original id
    books[index] = { ...books[index], ...req.body, id: bookId };

    writeJSON(BOOKS_FILE, books);
    res.json(books[index]);
});

// DELETE /books/:id — remove a book
app.delete('/books/:id', function(req, res) {
    let books = readJSON(BOOKS_FILE);
    const bookId = Number(req.params.id);
    
    // returns a new array excluding the book with the matching id.
    const filtered = books.filter(function(b) { return b.id !== bookId; });
    
    if (filtered.length === books.length) {
        return res.status(404).json({ error: 'Book not found' });
    }
    
    writeJSON(BOOKS_FILE, filtered);
    res.json({ message: 'Deleted successfully' });
});

// POST /auth/signup — create a new user account
app.post('/auth/signup', async function(req, res) {
    
    // extracts email, password, name from req.body into separate variables.
    const users = readJSON(USERS_FILE);
    const { email, password, name } = req.body;
    
    // Check if this email is already registered
    const existingUser = users.find(function(u) { return u.email === email; });
    if (existingUser) {
        return res.status(400).json({ error: 'An account with this email already exists.' });
    }
    
    // stores hashed nasword
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const newUser = {
        id: Date.now(),
        name: name,
        email: email,
        password: hashedPassword
    };
    
    users.push(newUser);
    writeJSON(USERS_FILE, users);
    
    res.status(201).json({ id: newUser.id, name: newUser.name, email: newUser.email });
});

// POST /auth/login — verify credentials
app.post('/auth/login', async function(req, res) {
    const users = readJSON(USERS_FILE);
    const { email, password } = req.body;
    
    const user = users.find(function(u) { return u.email === email; });
    if (!user) {
        return res.status(401).json({ error: 'Invalid email or password.' });
    }
    
    // compares hashed tpyed password, and existing hashed password
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
        return res.status(401).json({ error: 'Invalid email or password.' });
    }
    
    res.json({ id: user.id, name: user.name, email: user.email });
});

// Start the server 
app.listen(PORT, function() {
    console.log('Library server running at http://localhost:' + PORT);
});