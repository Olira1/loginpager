import { useState } from 'react'

function App() {
  const [fortune, setFortune] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const getFortune = async () => {
    setLoading(true)
    setError('')
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
      const response = await fetch(`${apiUrl}/api/fortune`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch fortune')
      }
      
      const data = await response.json()
      setFortune(data.fortune)
    } catch (err) {
      setError('Could not get fortune. Make sure backend is running!')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
        <h1 className="text-4xl font-bold text-amber-600 mb-2">🥠</h1>
        <h2 className="text-3xl font-bold text-gray-800 mb-6">Fortune Cookie</h2>
        
        <div className="min-h-32 flex items-center justify-center mb-6">
          {fortune ? (
            <p className="text-xl text-gray-700 italic">"{fortune}"</p>
          ) : (
            <p className="text-gray-400">Click the button to reveal your fortune</p>
          )}
        </div>

        {error && (
          <p className="text-red-500 text-sm mb-4">{error}</p>
        )}

        <button
          onClick={getFortune}
          disabled={loading}
          className="bg-amber-500 hover:bg-amber-600 disabled:bg-gray-400 text-white font-semibold py-3 px-8 rounded-full transition-colors duration-200 shadow-lg hover:shadow-xl"
        >
          {loading ? 'Opening...' : 'Get Fortune'}
        </button>
      </div>
    </div>
  )
}

export default App
