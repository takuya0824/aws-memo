import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Confirm() {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { confirmSignUp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const email = (location.state as { email: string })?.email ?? ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await confirmSignUp(email, code)
      navigate('/login')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '確認に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">AWS Memo</div>
        <div className="auth-subtitle">メール確認</div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
          <strong>{email}</strong> に確認コードを送信しました。
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">確認コード</label>
            <input
              className="form-input"
              type="text"
              value={code}
              onChange={e => setCode(e.target.value)}
              required
              autoFocus
              placeholder="6桁のコード"
              style={{ letterSpacing: '0.2em', fontSize: 18 }}
            />
          </div>
          {error && <div className="form-error">{error}</div>}
          <button className="btn btn-primary btn-full" type="submit" disabled={loading} style={{ marginTop: 20 }}>
            {loading ? '確認中...' : '確認する'}
          </button>
        </form>
      </div>
    </div>
  )
}
