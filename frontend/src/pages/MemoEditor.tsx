import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import MDEditor from '@uiw/react-md-editor'
import Header from '../components/Header'
import { useApi } from '../hooks/useApi'

export default function MemoEditor() {
  const { id } = useParams()
  const isNew = !id
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [published, setPublished] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const api = useApi()

  useEffect(() => {
    if (!isNew) {
      api.get(`/api/memos/${id}`)
        .then(res => {
          setTitle(res.data.title)
          setContent(res.data.content)
          setPublished(res.data.published)
        })
        .catch(() => setError('メモの取得に失敗しました'))
    }
  }, [id])

  const handleSave = async () => {
    if (!title.trim()) { setError('タイトルを入力してください'); return }
    setError('')
    setSaving(true)
    try {
      const payload = { title, content, published }
      if (isNew) {
        await api.post('/api/memos/', payload)
      } else {
        await api.put(`/api/memos/${id}`, payload)
      }
      navigate('/')
    } catch {
      setError('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('このメモを削除しますか？')) return
    try {
      await api.delete(`/api/memos/${id}`)
      navigate('/')
    } catch {
      setError('削除に失敗しました')
    }
  }

  return (
    <>
      <Header />
      <div className="editor-toolbar">
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/')}>← 戻る</button>
        <input
          className="editor-title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="タイトルを入力..."
        />
        <label className="editor-toggle">
          <input
            type="checkbox"
            checked={published}
            onChange={e => setPublished(e.target.checked)}
          />
          投稿済み
        </label>
        <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
          {saving ? '保存中...' : '保存'}
        </button>
        {!isNew && (
          <button className="btn btn-danger btn-sm" onClick={handleDelete}>削除</button>
        )}
      </div>
      {error && <div className="form-error" style={{ margin: '8px 24px' }}>{error}</div>}
      <div className="editor-body" data-color-mode="light">
        <MDEditor value={content} onChange={v => setContent(v ?? '')} height="calc(100vh - 120px)" />
      </div>
    </>
  )
}
