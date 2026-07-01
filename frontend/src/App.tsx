import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'

const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Confirm = lazy(() => import('./pages/Confirm'))
const MemoList = lazy(() => import('./pages/MemoList'))
const MemoEditor = lazy(() => import('./pages/MemoEditor'))

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return null
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/confirm" element={<Confirm />} />
          <Route path="/" element={<PrivateRoute><MemoList /></PrivateRoute>} />
          <Route path="/memos/new" element={<PrivateRoute><MemoEditor /></PrivateRoute>} />
          <Route path="/memos/:id" element={<PrivateRoute><MemoEditor /></PrivateRoute>} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
