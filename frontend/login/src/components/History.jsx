import { useState, useEffect } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function History({ token, onBack }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    try {
      const response = await fetch(`${API_URL}/api/fortune/history`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch history')
      }

      const data = await response.json()
      setHistory(data.history)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-gray-800">Fortune History</h2>
          <button
            onClick={onBack}
            className="text-amber-600 hover:text-amber-700 font-semibold"
          >
            ← Back
          </button>
        </div>

        {loading ? (
          <p className="text-center text-gray-500">Loading history...</p>
        ) : error ? (
          <p className="text-center text-red-500">{error}</p>
        ) : history.length === 0 ? (
          <p className="text-center text-gray-500">No fortunes yet. Get your first fortune!</p>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {history.map((item) => (
              <div
                key={item.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-amber-50 transition-colors"
              >
                <p className="text-gray-700 italic mb-2">"{item.fortune}"</p>
                <p className="text-sm text-gray-500">{formatDate(item.created_at)}</p>
              </div>
            ))}
          </div>
        )}

        {!loading && history.length > 0 && (
          <p className="text-center text-gray-500 mt-4 text-sm">
            Total fortunes: {history.length}
          </p>
        )}
      </div>
    </div>
  )
}

export default History
