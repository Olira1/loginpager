import { useState } from 'react'
import Login from './components/Login'
import Signup from './components/Signup'
import Converter from './components/Converter'
import ConversionHistory from './components/ConversionHistory'

function App() {
  const [currentView, setCurrentView] = useState('login')
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'))

  const handleLoginSuccess = (token, user) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    setToken(token)
    setUser(user)
    setCurrentView('converter')
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
    setCurrentView('login')
  }

  if (token && user) {
    if (currentView === 'history') {
      return (
        <ConversionHistory 
          token={token}
          onBack={() => setCurrentView('converter')}
        />
      )
    }
    
    return (
      <Converter 
        token={token} 
        user={user} 
        onLogout={handleLogout}
        onViewHistory={() => setCurrentView('history')}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      {currentView === 'login' ? (
        <Login 
          onSuccess={handleLoginSuccess}
          onSwitchToSignup={() => setCurrentView('signup')}
        />
      ) : (
        <Signup 
          onSuccess={handleLoginSuccess}
          onSwitchToLogin={() => setCurrentView('login')}
        />
      )}
    </div>
  )
}

export default App
