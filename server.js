require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);

// Fallback for SPA (if we were using one, but for vanilla multi-page, this helps with explicit resets or clean URLs later)
// actually for now, standard static serving is enough.

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
