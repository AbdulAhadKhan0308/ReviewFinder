const CSRF_COOKIE = 'XSRF-TOKEN'
const CSRF_HEADER = 'X-XSRF-TOKEN'

export type FieldErrors = Record<string, string[]>
// contains FormErrors and FieldErrors
type ServerValidationErrors = Record<string, string[]>
type ProblemDetails = { title?: string; detail?: string; errors?: ServerValidationErrors }
type RequestOptions = { method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; body?: unknown; signal?: AbortSignal }

export class ApiError extends Error {
  readonly status: number
  readonly fieldErrors: FieldErrors
  readonly formErrors: string[]

  constructor(status: number, message: string, fieldErrors: FieldErrors = {}, formErrors: string[] = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
    this.formErrors = formErrors
  }

  // The message to show above a form. Field errors are shown beside their fields instead.
  get formMessage(): string | null {
    if (this.formErrors.length > 0) return this.formErrors.join(' ')
    return Object.keys(this.fieldErrors).length > 0 ? null : this.message
  }
}

let unauthorizedHandler: (() => void) | null = null

// Lets the auth state react when any request reveals the session has ended.
export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler
}

function readCookie(name: string) {
  const prefix = `${name}=`
  const cookie = document.cookie.split('; ').find((c) => c.startsWith(prefix))
  return cookie === undefined ? undefined : decodeURIComponent(cookie.slice(prefix.length))
}

export async function apiFetch<T>(path: string, { method = 'GET', body, signal }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (method !== 'GET') {
    const token = readCookie(CSRF_COOKIE)
    if (token) headers[CSRF_HEADER] = token
  }

  let response: Response
  try {
    response = await fetch(path, {
      method,
      headers,
      body: JSON.stringify(body),
      signal,
      credentials: 'same-origin',
    })
  } catch (err) {
    if (signal?.aborted) throw err
    throw new ApiError(0, "Couldn't reach the server. Check your connection and try again.")
  }

  if (response.status === 401) unauthorizedHandler?.()
  if (!response.ok) throw await toApiError(response)

  const isJson = response.headers.get('Content-Type')?.includes('json')
  return (isJson ? await response.json() : undefined) as T
}

async function toApiError(response: Response): Promise<ApiError> {
  let problem: ProblemDetails = {}
  try {
    if (response.headers.get('Content-Type')?.includes('json')) problem = await response.json()
  } catch {
    // Keep the generic message below.
  }

  // Errors under the "" key apply to the whole form rather than one field.
  const { '': formErrors = [], ...fieldErrors } = problem.errors ?? {}
  const message =
    formErrors.join(' ') || problem.detail || problem.title || `Request failed with status ${response.status}.`
  return new ApiError(response.status, message, fieldErrors, formErrors)
}

// Fetches a fresh CSRF token. Returns false if the browser refused to store the cookie.
export async function refreshCsrfToken(signal?: AbortSignal) {
  await apiFetch<void>('/api/auth/csrf', { signal })
  return readCookie(CSRF_COOKIE) !== undefined
}
