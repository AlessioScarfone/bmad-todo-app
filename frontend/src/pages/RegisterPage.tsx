import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { AuthUser } from '../types/auth'
import { api } from '../lib/api'

interface ApiError extends Error {
  statusCode?: number
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const validate = () => {
    let hasError = false

    setEmailError(null)
    setPasswordError(null)
    setServerError(null)

    if (!email.trim()) {
      setEmailError('Email is required')
      hasError = true
    } else if (!email.includes('@')) {
      setEmailError('Enter a valid email address')
      hasError = true
    }

    if (!password) {
      setPasswordError('Password is required')
      hasError = true
    } else if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters')
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
      await api.post<AuthUser>('/auth/register', {
        email: email.trim(),
        password,
      })
      navigate('/')
    } catch (error) {
      const apiError = error as ApiError
      if (apiError.statusCode === 409) {
        setServerError('An account with this email already exists')
      } else {
        setServerError('Registration failed. Please try again.')
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
          CREATE ACCOUNT
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
              autoComplete="new-password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              className="w-full bg-[#0f0f0f] border-2 border-[#e0e0e0] px-3 py-2 font-mono text-[13px] text-[#f0f0f0] outline-none focus:border-[#00ff88] rounded-none"
              aria-invalid={Boolean(passwordError)}
              aria-describedby={`password-hint${passwordError ? ' password-error' : ''}`}
            />
            <p id="password-hint" className="mt-1 font-mono text-[11px] text-[#555]">
              Minimum 8 characters.
            </p>
            {passwordError && (
              <p id="password-error" className="mt-1 font-mono text-[11px] text-[#ff4444]">
                {passwordError}
              </p>
            )}
          </div>

          {serverError && (
            <p className="font-mono text-[11px] text-[#ff4444]">{serverError}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 bg-[#00ff88] text-[#0f0f0f] border-2 border-[#e0e0e0] shadow-[4px_4px_0px_#e0e0e0] font-pixel text-[8px] uppercase tracking-widest py-3 px-4 cursor-pointer hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-[transform,box-shadow] duration-75 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0px_#e0e0e0]"
          >
            {isLoading ? 'CREATING...' : 'CREATE ACCOUNT'}
          </button>
        </form>

        <p className="mt-6 font-mono text-[11px] text-[#888]">
          Already have an account?{' '}
          <Link to="/login" className="text-[#00ff88] hover:underline">
            Log in
          </Link>
        </p>
      </section>
    </main>
  )
}
