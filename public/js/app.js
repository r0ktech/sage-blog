const API_URL = 'http://localhost:3000/api';

// --- Auth ---

function saveAuth(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
}

function getAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    return { token, user };
}

function checkAuth() {
    const { token } = getAuth();
    if (!token) {
        window.location.href = 'index.html';
    } else {
        const user = JSON.parse(localStorage.getItem('user'));
        const welcomeEl = document.getElementById('welcomeUser');
        if (welcomeEl) welcomeEl.textContent = `Hello, @${user.username}`;
    }
}

async function login(email, password) {
    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (res.ok) {
            saveAuth(data.token, data.user);
            window.location.href = 'dashboard.html';
        } else {
            alert(data.error);
        }
    } catch (err) {
        console.error(err);
        alert('Login failed');
    }
}

async function register(username, email, password) {
    try {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        const data = await res.json();

        if (res.ok) {
            alert('Registration successful! Please login.');
            window.location.href = 'index.html';
        } else {
            alert(data.error);
        }
    } catch (err) {
        console.error(err);
        alert('Registration failed');
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

// --- Posts ---

async function loadPosts() {
    const feed = document.getElementById('postsFeed');
    try {
        const res = await fetch(`${API_URL}/posts`);
        const posts = await res.json();

        feed.innerHTML = '';
        posts.forEach(post => {
            const card = createPostElement(post);
            feed.appendChild(card);
        });

        if (posts.length === 0) {
            feed.innerHTML = '<div style="text-align: center; color: var(--text-secondary);">No posts yet. Be the first!</div>';
        }
    } catch (err) {
        console.error(err);
        feed.innerHTML = '<div style="text-align: center; color: red;">Failed to load posts</div>';
    }
}

function createPostElement(post) {
    const div = document.createElement('div');
    div.className = 'post-card glass-panel';

    // Format Date
    const date = new Date(post.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    div.innerHTML = `
        <div class="post-header">
            <div class="post-user">
                <div class="user-avatar">${post.username[0].toUpperCase()}</div>
                <div>
                    <div style="font-weight: 600; color: white;">@${post.username}</div>
                    <div style="font-size: 0.8rem;">${date}</div>
                </div>
            </div>
        </div>
        <div class="post-content">${escapeHtml(post.content)}</div>
        <div class="post-actions">
            <button class="action-btn" onclick="repost(${post.id})">
                <ion-icon name="repeat-outline"></ion-icon> ${post.repost_count || 0} Repost
            </button>
            <button class="action-btn" onclick="toggleComments(${post.id})">
                <ion-icon name="chatbubble-outline"></ion-icon> ${post.comment_count || 0} Comments
            </button>
        </div>
        
        <div id="comments-${post.id}" class="comments-section">
            <div id="comments-list-${post.id}" style="margin-bottom: 10px;"></div>
            <div style="display: flex; gap: 10px;">
                <input type="text" id="comment-input-${post.id}" placeholder="Write a comment..." style="padding: 8px;">
                <button class="btn btn-primary" style="padding: 8px 16px;" onclick="postComment(${post.id})">Send</button>
            </div>
        </div>
    `;
    return div;
}

async function createPost() {
    const content = document.getElementById('postContent').value;
    const { token } = getAuth();

    if (!content.trim()) return;

    try {
        const res = await fetch(`${API_URL}/posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ content })
        });

        if (res.ok) {
            document.getElementById('postContent').value = '';
            loadPosts(); // Reload feed
        } else {
            alert('Failed to post');
        }
    } catch (err) {
        console.error(err);
    }
}

async function repost(postId) {
    const { token } = getAuth();
    try {
        const res = await fetch(`${API_URL}/posts/${postId}/repost`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (res.ok) {
            loadPosts();
        } else {
            const data = await res.json();
            alert(data.error || 'Failed to repost');
        }
    } catch (err) {
        console.error(err);
    }
}

async function toggleComments(postId) {
    const section = document.getElementById(`comments-${postId}`);
    const list = document.getElementById(`comments-list-${postId}`);

    if (section.classList.contains('active')) {
        section.classList.remove('active');
        return;
    }

    section.classList.add('active');

    // Load comments
    try {
        const res = await fetch(`${API_URL}/posts/${postId}/comments`);
        const comments = await res.json();

        list.innerHTML = '';
        comments.forEach(c => {
            const div = document.createElement('div');
            div.className = 'comment';
            div.innerHTML = `
                <div class="comment-header">@${c.username}</div>
                <div>${escapeHtml(c.content)}</div>
            `;
            list.appendChild(div);
        });

        if (comments.length === 0) {
            list.innerHTML = '<div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 10px;">No comments yet</div>';
        }
    } catch (err) {
        console.error(err);
    }
}

async function postComment(postId) {
    const input = document.getElementById(`comment-input-${postId}`);
    const content = input.value;
    const { token } = getAuth();

    if (!content.trim()) return;

    try {
        const res = await fetch(`${API_URL}/posts/${postId}/comment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ content })
        });

        if (res.ok) {
            input.value = '';
            // Refresh comments
            const section = document.getElementById(`comments-${postId}`);
            section.classList.remove('active'); // toggle to refresh or just call logic again.
            toggleComments(postId); // fast refresh
        } else {
            alert('Failed to comment');
        }
    } catch (err) {
        console.error(err);
    }
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
