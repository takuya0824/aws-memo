import axios from 'axios'
import { useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'

export function useApi() {
  const { token } = useAuth()
  return useMemo(() => axios.create({
    headers: { Authorization: `Bearer ${token}` },
  }), [token])
}
