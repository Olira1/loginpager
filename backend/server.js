import express from 'express'
import cors from 'cors'

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors())
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

// API Routes
app.get('/api/fortune', (req, res) => {
  const randomIndex = Math.floor(Math.random() * fortunes.length)
  const fortune = fortunes[randomIndex]
  
  res.json({
    fortune,
    timestamp: new Date().toISOString()
  })
})

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Fortune Cookie API is running' })
})

app.listen(PORT, () => {
  console.log(`🥠 Fortune Cookie API running on port ${PORT}`)
})
