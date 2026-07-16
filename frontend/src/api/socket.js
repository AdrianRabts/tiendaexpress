export function connectOrdersSocket(accessToken, onMessage) {
  const wsBaseUrl = import.meta.env.VITE_API_URL.replace(/^http/, 'ws')
  const socket = new WebSocket(`${wsBaseUrl}/ws/orders/?token=${accessToken}`)
  socket.onmessage = (event) => onMessage(JSON.parse(event.data))
  return socket
}
