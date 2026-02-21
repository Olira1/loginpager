import { useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function Converter({ token, user, onLogout, onViewHistory }) {
  const [value, setValue] = useState('')
  const [fromUnit, setFromUnit] = useState('celsius')
  const [toUnit, setToUnit] = useState('fahrenheit')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleConvert = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch(`${API_URL}/api/convert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ value, from: fromUnit, to: toUnit })
      })
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          onLogout()
          return
        }
        const data = await response.json()
        throw new Error(data.error || 'Conversion failed')
      }
      
      const data = await response.json()
      setResult(data.converted.value)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-gray-600">Welcome, {user.email}</p>
          <div className="flex gap-3">
            <button
              onClick={onViewHistory}
              className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
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

        <h1 className="text-4xl font-bold text-blue-600 mb-2 text-center">🌡️</h1>
        <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Temperature Converter</h2>
        
        <form onSubmit={handleConvert} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Temperature Value
            </label>
            <input
              type="number"
              step="0.01"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter temperature"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From
              </label>
              <select
                value={fromUnit}
                onChange={(e) => setFromUnit(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="celsius">Celsius (°C)</option>
                <option value="fahrenheit">Fahrenheit (°F)</option>
                <option value="kelvin">Kelvin (K)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To
              </label>
              <select
                value={toUnit}
                onChange={(e) => setToUnit(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="celsius">Celsius (°C)</option>
                <option value="fahrenheit">Fahrenheit (°F)</option>
                <option value="kelvin">Kelvin (K)</option>
              </select>
            </div>
          </div>

          {result !== null && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-blue-700">
                {result}° {toUnit === 'celsius' ? 'C' : toUnit === 'fahrenheit' ? 'F' : 'K'}
              </p>
            </div>
          )}

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition-colors duration-200"
          >
            {loading ? 'Converting...' : 'Convert'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Converter
