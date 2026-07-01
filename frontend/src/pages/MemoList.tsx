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

type Filter = 'all' | 'draft' | 'published'

const FILTERS: { label: string; value: Filter }[] = [
  { label: 'すべて', value: 'all' },
  { label: '下書き', value: 'draft' },
  { label: '投稿済み', value: 'published' },
]

export default function MemoList() {
  const [memos, setMemos] = useState<Memo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const navigate = useNavigate()
  const api = useApi()

  useEffect(() => {
    setLoading(true)
    const params = filter === 'all' ? '' : `?published=${filter === 'published'}`
    api.get(`/api/memos/${params}`)
      .then(res => setMemos(res.data))
      .catch(() => setError('メモの取得に失敗しました'))
      .finally(() => setLoading(false))
  }, [filter])

  return (
    <>
      <Header />
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">メモ一覧</h1>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{memos.length} 件</span>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {FILTERS.map(f => (
            <button
              key={f.value}
              className={`btn ${filter === f.value ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
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
