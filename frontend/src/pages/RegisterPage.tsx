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
    <main className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-6">
      <section className="w-full max-w-md border-4 border-neutral-700 bg-neutral-900 p-6 sm:p-8">
        <h1 className="text-2xl mb-2 font-bold tracking-wide">Register</h1>
        <p className="text-sm text-neutral-300 mb-6">Create your account to start managing tasks.</p>

        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              className="w-full border-2 border-neutral-600 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-neutral-300"
              aria-invalid={Boolean(emailError)}
              aria-describedby={emailError ? 'email-error' : undefined}
            />
            {emailError && (
              <p id="email-error" className="mt-1 text-sm text-red-400">
                {emailError}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              className="w-full border-2 border-neutral-600 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-neutral-300"
              aria-invalid={Boolean(passwordError)}
              aria-describedby={`password-hint${passwordError ? ' password-error' : ''}`}
            />
            <p id="password-hint" className="mt-1 text-xs text-neutral-400">
              Minimum 8 characters.
            </p>
            {passwordError && (
              <p id="password-error" className="mt-1 text-sm text-red-400">
                {passwordError}
              </p>
            )}
          </div>

          {serverError && <p className="text-sm text-red-400">{serverError}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full border-2 border-neutral-500 bg-neutral-800 px-3 py-2 text-sm font-semibold uppercase tracking-wide hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-sm text-neutral-300">
          Already have an account?{' '}
          <Link to="/login" className="underline underline-offset-2 hover:text-white">
            Log in
          </Link>
        </p>
      </section>
    </main>
  )
}
