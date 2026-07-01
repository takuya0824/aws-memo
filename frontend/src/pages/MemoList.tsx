import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import { useApi } from '../hooks/useApi'

type Memo = {
  id: number
  title: string
  published: boolean
  updated_at: string
}

export default function MemoList() {
  const [memos, setMemos] = useState<Memo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const api = useApi()

  useEffect(() => {
    api.get('/api/memos/')
      .then(res => setMemos(res.data))
      .catch(() => setError('メモの取得に失敗しました'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <Header />
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">メモ一覧</h1>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{memos.length} 件</span>
        </div>

        {loading && <div className="loading">読み込み中...</div>}

        {error && <div className="form-error">{error}</div>}

        {!loading && !error && memos.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">📝</div>
            <p className="empty-state-text">メモがまだありません</p>
            <button className="btn btn-primary" onClick={() => navigate('/memos/new')}>
              最初のメモを作成
            </button>
          </div>
        )}

        <ul className="memo-list" style={{ listStyle: 'none', padding: 0 }}>
          {memos.map(memo => (
            <li
              key={memo.id}
              className="memo-card"
              onClick={() => navigate(`/memos/${memo.id}`)}
            >
              <div className="memo-card-header">
                <span className="memo-card-title">{memo.title || '無題'}</span>
                <span className={`badge ${memo.published ? 'badge-published' : 'badge-draft'}`}>
                  {memo.published ? '投稿済み' : '下書き'}
                </span>
              </div>
              <div className="memo-card-date">
                最終更新: {new Date(memo.updated_at).toLocaleString('ja-JP')}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
