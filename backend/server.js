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

// Temperature conversion functions
const celsiusToFahrenheit = (c) => (c * 9/5) + 32
const celsiusToKelvin = (c) => c + 273.15
const fahrenheitToCelsius = (f) => (f - 32) * 5/9
const fahrenheitToKelvin = (f) => ((f - 32) * 5/9) + 273.15
const kelvinToCelsius = (k) => k - 273.15
const kelvinToFahrenheit = (k) => ((k - 273.15) * 9/5) + 32

// Convert Temperature
app.post('/api/convert', authenticateToken, async (req, res) => {
  try {
    const { value, from, to } = req.body

    if (!value || !from || !to) {
      return res.status(400).json({ error: 'Value, from, and to units are required' })
    }

    const temp = parseFloat(value)
    if (isNaN(temp)) {
      return res.status(400).json({ error: 'Invalid temperature value' })
    }

    let result
    
    // Convert based on from/to units
    if (from === to) {
      result = temp
    } else if (from === 'celsius') {
      result = to === 'fahrenheit' ? celsiusToFahrenheit(temp) : celsiusToKelvin(temp)
    } else if (from === 'fahrenheit') {
      result = to === 'celsius' ? fahrenheitToCelsius(temp) : fahrenheitToKelvin(temp)
    } else if (from === 'kelvin') {
      result = to === 'celsius' ? kelvinToCelsius(temp) : kelvinToFahrenheit(temp)
    }

    // Save to conversion history
    await pool.query(
      'INSERT INTO conversion_history (user_id, value, from_unit, to_unit, result) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, temp, from, to, result]
    )

    res.json({
      original: { value: temp, unit: from },
      converted: { value: parseFloat(result.toFixed(2)), unit: to },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Conversion error:', error)
    res.status(500).json({ error: 'Failed to convert temperature' })
  }
})

// Get Conversion History
app.get('/api/convert/history', authenticateToken, async (req, res) => {
  try {
    const [history] = await pool.query(
      'SELECT id, value, from_unit, to_unit, result, created_at FROM conversion_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
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
