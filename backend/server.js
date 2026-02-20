import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import pool from './db.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean)

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}))
app.use(express.json())

// Fortune cookie messages
const fortunes = [
  "A beautiful, smart, and loving person will be coming into your life.",
  "Your ability to juggle many tasks will take you far.",
  "A dubious friend may be an enemy in camouflage.",
  "Good news will come to you by mail.",
  "The fortune you seek is in another cookie.",
  "A smile is your passport into the hearts of others.",
  "You will be hungry again in one hour.",
  "Your road to glory will be rocky, but fulfilling.",
  "An exciting opportunity lies ahead of you.",
  "You will make many changes before settling satisfactorily.",
  "Adventure can be real happiness.",
  "All your hard work will soon pay off.",
  "Believe in yourself and others will too.",
  "Courage is not the absence of fear; it is the conquest of it.",
  "Determination is what you need today.",
  "Every exit is an entry somewhere else.",
  "Good things come to those who wait.",
  "Happiness is not a destination, it is a way of life.",
  "If you think you can, you can.",
  "Keep your face to the sunshine and you will never see shadows."
]

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: 'Access token required' })
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' })
    }
    req.user = user
    next()
  })
}

// Auth Routes
app.post('/api/signup', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' })
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10)
    
    const [result] = await pool.query(
      'INSERT INTO users (email, password) VALUES (?, ?)',
      [email, hashedPassword]
    )

    const token = jwt.sign(
      { id: result.insertId, email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: { id: result.insertId, email }
    })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Email already exists' })
    }
    console.error('Signup error:', error)
    res.status(500).json({ error: 'Failed to create user' })
  }
})

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  try {
    const [users] = await pool.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    )

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const user = users[0]
    const validPassword = await bcrypt.compare(password, user.password)

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, email: user.email }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Failed to login' })
  }
})

// Protected Fortune Route
app.get('/api/fortune', authenticateToken, async (req, res) => {
  try {
    const randomIndex = Math.floor(Math.random() * fortunes.length)
    const fortune = fortunes[randomIndex]
    
    // Save to fortune history
    await pool.query(
      'INSERT INTO fortune_history (user_id, fortune) VALUES (?, ?)',
      [req.user.id, fortune]
    )
    
    res.json({
      fortune,
      timestamp: new Date().toISOString(),
      user: req.user.email
    })
  } catch (error) {
    console.error('Fortune error:', error)
    res.status(500).json({ error: 'Failed to get fortune' })
  }
})

// Get Fortune History
app.get('/api/fortune/history', authenticateToken, async (req, res) => {
  try {
    const [history] = await pool.query(
      'SELECT id, fortune, created_at FROM fortune_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    )
    
    res.json({ history })
  } catch (error) {
    console.error('History error:', error)
    res.status(500).json({ error: 'Failed to get history' })
  }
})

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Fortune Cookie API is running' })
})

app.listen(PORT, () => {
  console.log(`🥠 Fortune Cookie API running on port ${PORT}`)
})
