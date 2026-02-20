import { useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function Fortune({ token, user, onLogout, onViewHistory }) {
  const [fortune, setFortune] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const getFortune = async () => {
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch(`${API_URL}/api/fortune`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          onLogout()
          return
        }
        throw new Error('Failed to fetch fortune')
      }
      
      const data = await response.json()
      setFortune(data.fortune)
    } catch (err) {
      setError('Could not get fortune. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-gray-600">Welcome, {user.email}</p>
          <div className="flex gap-3">
            <button
              onClick={onViewHistory}
              className="text-sm text-amber-600 hover:text-amber-700 font-semibold"
            >
              History
            </button>
            <button
              onClick={onLogout}
              className="text-sm text-red-600 hover:text-red-700 font-semibold"
            >
              Logout
            </button>
          </div>
        </div>

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

export default Fortune
