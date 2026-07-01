import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Confirm from './pages/Confirm'
import MemoList from './pages/MemoList'
import MemoEditor from './pages/MemoEditor'
import { useAuth } from './contexts/AuthContext'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return null
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/confirm" element={<Confirm />} />
        <Route path="/" element={<PrivateRoute><MemoList /></PrivateRoute>} />
        <Route path="/memos/new" element={<PrivateRoute><MemoEditor /></PrivateRoute>} />
        <Route path="/memos/:id" element={<PrivateRoute><MemoEditor /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  )
}
