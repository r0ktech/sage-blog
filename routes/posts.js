const express = require('express');
const db = require('../database');
const authenticateToken = require('../middleware/authMiddleware');
const router = express.Router();

// Get Feed (All posts with user info)
router.get('/', (req, res) => {
    // A complex query to join user info, comments count, and check if it's a repost would be ideal.
    // simpler version: Get posts, then for each post get user. Join is better.
    // Query: Select posts, join users. Also select reposts...
    // Let's keep it simple first: Get all posts + user info.
    const query = `
        SELECT posts.id, posts.content, posts.created_at, users.username, users.id as user_id,
        (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) as comment_count,
        (SELECT COUNT(*) FROM reposts WHERE reposts.post_id = posts.id) as repost_count
        FROM posts
        JOIN users ON posts.user_id = users.id
        ORDER BY posts.created_at DESC
    `;

    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Create Post
router.post('/', authenticateToken, (req, res) => {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Content is required' });

    const query = `INSERT INTO posts (user_id, content) VALUES (?, ?)`;
    db.run(query, [req.user.id, content], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID, content, user_id: req.user.id, created_at: new Date() });
    });
});

// Comment on Post
router.post('/:id/comment', authenticateToken, (req, res) => {
    const { content } = req.body;
    const postId = req.params.id;
    if (!content) return res.status(400).json({ error: 'Content is required' });

    const query = `INSERT INTO comments (user_id, post_id, content) VALUES (?, ?, ?)`;
    db.run(query, [req.user.id, postId, content], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: 'Comment added' });
    });
});

// Get Comments for a Post
router.get('/:id/comments', (req, res) => {
    const postId = req.params.id;
    const query = `
        SELECT comments.id, comments.content, comments.created_at, users.username
        FROM comments
        JOIN users ON comments.user_id = users.id
        WHERE comments.post_id = ?
        ORDER BY comments.created_at ASC
    `;
    db.all(query, [postId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Repost
router.post('/:id/repost', authenticateToken, (req, res) => {
    const postId = req.params.id;

    // Check if valid post
    db.get(`SELECT id FROM posts WHERE id = ?`, [postId], (err, post) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!post) return res.status(404).json({ error: 'Post not found' });

        // Check if already reposted? (Optional, but good practice). For simplicty allowing multiple for now or just insert.
        const query = `INSERT INTO reposts (user_id, post_id) VALUES (?, ?)`;
        db.run(query, [req.user.id, postId], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ message: 'Reposted successfully' });
        });
    });
});

module.exports = router;
