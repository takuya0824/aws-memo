import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserSession,
} from 'amazon-cognito-identity-js'

const userPool = new CognitoUserPool({
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
})

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  token: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  signUp: (email: string, password: string) => Promise<void>
  confirmSignUp: (email: string, code: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const user = userPool.getCurrentUser()
    if (user) {
      user.getSession((err: Error | null, session: CognitoUserSession | null) => {
        if (!err && session?.isValid()) {
          setIsAuthenticated(true)
          setToken(session.getIdToken().getJwtToken())
        }
        setIsLoading(false)
      })
    } else {
      setIsLoading(false)
    }
  }, [])

  const login = (email: string, password: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const user = new CognitoUser({ Username: email, Pool: userPool })
      const auth = new AuthenticationDetails({ Username: email, Password: password })
      user.authenticateUser(auth, {
        onSuccess: (session) => {
          setIsAuthenticated(true)
          setToken(session.getIdToken().getJwtToken())
          resolve()
        },
        onFailure: reject,
      })
    })
  }

  const signUp = (email: string, password: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      userPool.signUp(email, password, [], [], (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }

  const confirmSignUp = (email: string, code: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const user = new CognitoUser({ Username: email, Pool: userPool })
      user.confirmRegistration(code, true, (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }

  const logout = () => {
    userPool.getCurrentUser()?.signOut()
    setIsAuthenticated(false)
    setToken(null)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, token, login, logout, signUp, confirmSignUp }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
