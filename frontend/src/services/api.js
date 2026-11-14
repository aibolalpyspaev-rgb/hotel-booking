import axios from 'axios'

/**
 * Единый HTTP-клиент для Laravel REST API.
 * Токен Sanctum хранится в localStorage и добавляется в заголовок Authorization.
 */
export const TOKEN_KEY = 'hb_token'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { Accept: 'application/json' },
  timeout: 30000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && localStorage.getItem(TOKEN_KEY)) {
      localStorage.removeItem(TOKEN_KEY)
      window.dispatchEvent(new Event('auth:expired'))
    }
    return Promise.reject(error)
  },
)

/** Текст ошибки из единого формата API { success:false, message, errors } */
export function errorMessage(error, fallback = 'Что-то пошло не так. Попробуйте ещё раз.') {
  if (!error?.response) return 'Сервер недоступен. Проверьте, что backend запущен.'
  return error.response.data?.message || fallback
}

/** Ошибки валидации по полям: { field: 'текст' } */
export function fieldErrors(error) {
  const errors = error?.response?.data?.errors || {}
  return Object.fromEntries(Object.entries(errors).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]))
}

/** Убирает пустые параметры запроса */
export function cleanParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0)),
  )
}

// ---------- Авторизация ----------
export const authApi = {
  register: (data) => api.post('/register', data).then((r) => r.data),
  login: (data) => api.post('/login', data).then((r) => r.data),
  logout: () => api.post('/logout').then((r) => r.data),
  me: () => api.get('/user').then((r) => r.data.data),
  updateProfile: (data) => api.put('/user', data).then((r) => r.data),
}

// ---------- Отели ----------
const arr = (params) => {
  const p = { ...params }
  if (Array.isArray(p.stars)) p.stars = p.stars.join(',')
  if (Array.isArray(p.amenities)) p.amenities = p.amenities.join(',')
  return cleanParams(p)
}

export const hotelsApi = {
  list: (params) => api.get('/hotels', { params: arr(params) }).then((r) => r.data),
  get: (id, params) => api.get(`/hotels/${id}`, { params: cleanParams(params) }).then((r) => r.data.data),
  create: (data) => api.post('/hotels', data).then((r) => r.data),
  update: (id, data) => api.put(`/hotels/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/hotels/${id}`).then((r) => r.data),
  cities: () => api.get('/cities').then((r) => r.data.data),
}

// ---------- Номера ----------
export const roomsApi = {
  list: (params) => api.get('/rooms', { params: cleanParams(params) }).then((r) => r.data),
  get: (id) => api.get(`/rooms/${id}`).then((r) => r.data),
  availability: (id, params) => api.get(`/rooms/${id}/availability`, { params }).then((r) => r.data.data),
  create: (data) => api.post('/rooms', data).then((r) => r.data),
  update: (id, data) => api.put(`/rooms/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/rooms/${id}`).then((r) => r.data),
}

// ---------- Бронирования ----------
export const bookingsApi = {
  list: (params) => api.get('/bookings', { params: cleanParams(params) }).then((r) => r.data),
  get: (id) => api.get(`/bookings/${id}`).then((r) => r.data.data),
  create: (data) => api.post('/bookings', data).then((r) => r.data),
  confirm: (id) => api.patch(`/bookings/${id}/confirm`).then((r) => r.data),
  cancel: (id) => api.patch(`/bookings/${id}/cancel`).then((r) => r.data),
}

// ---------- Отзывы ----------
export const reviewsApi = {
  list: (params) => api.get('/reviews', { params: cleanParams(params) }).then((r) => r.data),
  create: (data) => api.post('/reviews', data).then((r) => r.data),
  update: (id, data) => api.put(`/reviews/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/reviews/${id}`).then((r) => r.data),
}

// ---------- Удобства ----------
export const amenitiesApi = {
  list: () => api.get('/amenities').then((r) => r.data.data),
  create: (data) => api.post('/amenities', data).then((r) => r.data),
  update: (id, data) => api.put(`/amenities/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/amenities/${id}`).then((r) => r.data),
}

// ---------- AI-помощник ----------
export const chatApi = {
  send: (message, sessionId) => api.post('/chat', { message, session_id: sessionId || null }).then((r) => r.data.data),
  history: (sessionId) => api.get(`/chat/${sessionId}`).then((r) => r.data.data),
}

// ---------- Администрирование ----------
export const adminApi = {
  stats: () => api.get('/admin/stats').then((r) => r.data.data),
  bookings: (params) => api.get('/admin/bookings', { params: cleanParams(params) }).then((r) => r.data),
  setBookingStatus: (id, status) => api.patch(`/admin/bookings/${id}/status`, { status }).then((r) => r.data),
  users: (params) => api.get('/admin/users', { params: cleanParams(params) }).then((r) => r.data),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data).then((r) => r.data),
  removeUser: (id) => api.delete(`/admin/users/${id}`).then((r) => r.data),
}

export const publicApi = {
  stats: () => api.get('/stats').then((r) => r.data.data),
}

export default api
