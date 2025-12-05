// server.js - Face Recognition Demo Server
const express = require('express');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'users.json');
// Initialize empty users file if it doesn't exist
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({}));
}

const app = express();
app.use(express.json());
app.use(express.static('public'));

// Add CORS headers to allow requests from any origin
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

function loadUsers() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Error loading users:', error);
    return {};
  }
}

function saveUsers(users) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving users:', error);
    return false;
  }
}

app.post('/enroll', (req, res) => {
  const { username, descriptor } = req.body;
  if (!username || !descriptor) return res.json({ ok:false, error:'missing' });
  const users = loadUsers();
  // Prevent duplicate enrollment of the same face under different names
  try {
    let best = { username:null, distance: Infinity };
    for (const [u,info] of Object.entries(users)){
      const d = dist(descriptor, info.descriptor);
      if (d < best.distance) best = { username: u, distance: d };
    }
    const DUP_THRESH = 0.5; // same as match threshold
    if (best.username && best.distance <= DUP_THRESH && best.username !== username) {
      return res.json({ ok:false, error:'already_enrolled', username: best.username, distance: best.distance });
    }
  } catch(e) {
    // ignore check failures and proceed
  }
  users[username] = { descriptor };
  saveUsers(users);
  res.json({ ok:true });
});

// simple Euclidean distance
function dist(a,b){
  let s=0;
  for (let i=0;i<a.length;i++){
    const d = a[i]-b[i];
    s += d*d;
  }
  return Math.sqrt(s);
}

app.post('/match', (req, res) => {
  const { descriptor } = req.body;
  if (!descriptor) return res.json({ ok:false, error:'missing' });
  const users = loadUsers();
  let best = { username:null, distance: Infinity };
  for (const [u,info] of Object.entries(users)){
    const d = dist(descriptor, info.descriptor);
    if (d < best.distance) best = { username: u, distance: d };
  }
  // threshold: lower is closer. 0.4-0.6 typical; tune per your models.
  const THRESH = 0.5;
  if (best.distance <= THRESH) return res.json({ ok:true, username: best.username, distance: best.distance });
  return res.json({ ok:false, closest: best.username, distance: best.distance });
});

// Delete user endpoint
app.post('/delete', (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ ok: false, error: 'Username is required' });
  }
  
  const users = loadUsers();
  if (!users[username]) {
    return res.status(404).json({ ok: false, error: 'User not found' });
  }
  
  delete users[username];
  const success = saveUsers(users);
  
  if (success) {
    res.json({ ok: true, message: `User '${username}' deleted successfully` });
  } else {
    res.status(500).json({ ok: false, error: 'Failed to delete user' });
  }
});

// List all users endpoint (for debugging)
app.get('/users', (req, res) => {
  const users = loadUsers();
  res.json({ users: Object.keys(users) });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Users file: ${DATA_FILE}`);
});
