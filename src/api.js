export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem('finance-token')
  const headers = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers || {}),
  }
  if (token) headers.Authorization = `Bearer ${token}`

  let response
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers })
  } catch {
    throw {
      message: 'Cannot reach the server. Check your connection and try again.',
      code: 'NETWORK_ERROR',
      fieldErrors: {},
    }
  }

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('finance-token')
      window.dispatchEvent(new CustomEvent('ledgerly:unauthorized'))
    }
    throw data?.error || {
      message: data?.message || 'The request could not be completed.',
      code: 'REQUEST_ERROR',
      fieldErrors: {},
    }
  }
  return data
}
