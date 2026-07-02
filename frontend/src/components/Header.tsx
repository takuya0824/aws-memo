import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Header() {
  const { logout, email } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="header">
      <span className="header-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
        AWS Memo
      </span>
      <div className="header-actions">
        {email && <span className="header-email">{email}</span>}
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/memos/new')}>
          + 新規作成
        </button>
        <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
          ログアウト
        </button>
      </div>
    </header>
  )
}
