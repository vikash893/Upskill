import { io } from 'socket.io-client'
import { API_URL, getToken } from './request'

let socket = null

/**
 * Returns a singleton Socket.io client connected to /realtime namespace
 */
export function getRealtimeSocket() {
  const token = getToken()
  if (!token) return null

  if (socket && socket.connected) {
    return socket
  }

  // Derive Socket server URL from API_URL (e.g. https://api.uptrails.in/api -> https://api.uptrails.in)
  const baseUrl = API_URL.replace(/\/api\/?$/, '')

  socket = io(`${baseUrl}/realtime`, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  })

  return socket
}

export function disconnectRealtimeSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
