export type ServiceErrorKind = 'quota' | 'not_found' | 'missing_key' | 'invalid' | 'network' | 'aborted'

export class ServiceError extends Error {
  readonly kind: ServiceErrorKind

  constructor(kind: ServiceErrorKind, message: string) {
    super(message)
    this.name = 'ServiceError'
    this.kind = kind
  }
}

const KIND_BY_CODE: Record<string, ServiceErrorKind> = {
  quota: 'quota',
  not_found: 'not_found',
  missing_key: 'missing_key',
  query_too_short: 'invalid',
  query_too_long: 'invalid',
  missing_fields: 'invalid',
}

export async function getJson<T>(path: string, params: Record<string, string>, signal?: AbortSignal): Promise<T> {
  const url = `${path}?${new URLSearchParams(params).toString()}`
  let response: Response
  try {
    response = await fetch(url, signal ? { signal } : {})
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ServiceError('aborted', 'Request was cancelled')
    }
    throw new ServiceError('network', 'Could not reach the server')
  }
  const data = (await response.json().catch(() => ({}))) as { error?: string }
  if (!response.ok) {
    const kind = KIND_BY_CODE[data.error ?? ''] ?? 'network'
    throw new ServiceError(kind, data.error ?? `Request failed with ${response.status}`)
  }
  return data as T
}
