let accessToken = localStorage.getItem('access_token')
let refreshToken = localStorage.getItem('refresh_token')

export function getAccessToken() {
  return accessToken
}

export function getRefreshToken() {
  return refreshToken
}

export function setTokens({ access, refresh }) {
  accessToken = access
  localStorage.setItem('access_token', access)

  if (refresh) {
    refreshToken = refresh
    localStorage.setItem('refresh_token', refresh)
  }
}

export function clearTokens() {
  accessToken = null
  refreshToken = null
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}
