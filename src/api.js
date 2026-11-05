export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem('finance-token')
  const headers = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers || {}),
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      credentials: 'omit',
      signal: controller.signal,
    })
    const contentType = response.headers.get('content-type') || ''
    const data = contentType.includes('application/json')
      ? await response.json().catch(() => null)
      : null

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('finance-token')
        window.dispatchEvent(new CustomEvent('ledgerly:unauthorized'))
      }
      throw data?.error || {
        message: data?.message || `The request failed (${response.status}).`,
        code: 'REQUEST_ERROR',
        fieldErrors: {},
      }
    }
    return data
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw {
        message: 'The server took too long to respond. Please try again.',
        code: 'TIMEOUT_ERROR',
        fieldErrors: {},
      }
    }
    if (error?.code && error?.message) throw error
    throw {
      message: 'Cannot reach the server. Check your connection and try again.',
      code: 'NETWORK_ERROR',
      fieldErrors: {},
    }
  } finally {
    clearTimeout(timeoutId)
  }
}
