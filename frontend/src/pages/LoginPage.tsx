import { useState, useRef, useEffect, type FormEvent } from 'react'
import { Link, useNavigate, Navigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import type { AuthUser } from '../types/auth'
import { api } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { getSavedEmail, saveEmail } from '../lib/auth'

interface ApiError extends Error {
  statusCode?: number
}

export default function LoginPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, isLoading: isAuthLoading } = useAuth()

  // Lazy initialiser — reads localStorage once on mount, before first render (AC2)
  const [email, setEmail] = useState(() => getSavedEmail() ?? '')
  const [password, setPassword] = useState('')

  // Focus password when email is pre-filled; otherwise keep normal email-first focus.
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (email) {
      passwordRef.current?.focus()
      return
    }

    emailRef.current?.focus()
  }, [])
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Redirect already-authenticated users away from the login page
  if (isAuthLoading) return null
  if (user) return <Navigate to="/" replace />

  const validate = () => {
    let hasError = false

    setEmailError(null)
    setPasswordError(null)
    setServerError(null)

    if (!email.trim()) {
      setEmailError('Email is required')
      hasError = true
    }

    if (!password) {
      setPasswordError('Password is required')
      hasError = true
    }

    return !hasError
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!validate()) {
      return
    }

    setIsLoading(true)

    try {
      await api.post<AuthUser>('/auth/login', {
        email: email.trim(),
        password,
      })
      saveEmail(email.trim()) // persist for pre-fill on next return visit (AC1)
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      navigate('/')
    } catch (error) {
      const apiError = error as ApiError
      if (apiError.statusCode === 401) {
        // Security requirement: same message regardless of which field is wrong
        setServerError('Invalid email or password')
      } else {
        setServerError('Login failed. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-6">
      <section className="w-full max-w-sm bg-[#1c1c1c] border-2 border-[#e0e0e0] shadow-[4px_4px_0px_#e0e0e0] p-6">

        {/* App brand */}
        <p className="font-pixel text-[10px] text-[#00ff88] tracking-widest mb-2">BMAD:TODO</p>

        {/* Page heading */}
        <h1 className="font-pixel text-[10px] text-[#f0f0f0] leading-loose mb-6">
          WELCOME BACK
        </h1>

        <form onSubmit={onSubmit} noValidate className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block font-mono text-[11px] text-[#888] uppercase tracking-wider mb-1"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              ref={emailRef}
              className="w-full bg-[#0f0f0f] border-2 border-[#e0e0e0] px-3 py-2 font-mono text-[13px] text-[#f0f0f0] outline-none focus:border-[#00ff88] rounded-none"
              aria-invalid={Boolean(emailError)}
              aria-describedby={emailError ? 'email-error' : undefined}
            />
            {emailError && (
              <p id="email-error" className="mt-1 font-mono text-[11px] text-[#ff4444]">
                {emailError}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="block font-mono text-[11px] text-[#888] uppercase tracking-wider mb-1"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              ref={passwordRef}
              className="w-full bg-[#0f0f0f] border-2 border-[#e0e0e0] px-3 py-2 font-mono text-[13px] text-[#f0f0f0] outline-none focus:border-[#00ff88] rounded-none"
              aria-invalid={Boolean(passwordError)}
              aria-describedby={passwordError ? 'password-error' : undefined}
            />
            {passwordError && (
              <p id="password-error" className="mt-1 font-mono text-[11px] text-[#ff4444]">
                {passwordError}
              </p>
            )}
          </div>

          {serverError && (
            <p role="alert" className="font-mono text-[11px] text-[#ff4444]">{serverError}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 bg-[#00ff88] text-[#0f0f0f] border-2 border-[#e0e0e0] shadow-[4px_4px_0px_#e0e0e0] font-pixel text-[8px] uppercase tracking-widest py-3 px-4 cursor-pointer hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-[transform,box-shadow] duration-75 motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0px_#e0e0e0]"
          >
            {isLoading ? 'LOGGING IN...' : 'LOG IN'}
          </button>
        </form>

        <p className="mt-6 font-mono text-[11px] text-[#888]">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-[#00ff88] underline">
            Register
          </Link>
        </p>
      </section>
    </main>
  )
}

