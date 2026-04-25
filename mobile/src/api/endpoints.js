import api from './client';

/**
 * Thin wrappers around each backend endpoint.
 * Keeps screen code free of URL strings.
 */

// ---------- auth ----------
export const authApi = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  me: () => api.get('/auth/me'),
};

// ---------- employees ----------
export const employeeApi = {
  list: (params) => api.get('/employees', { params }),
  get: (id) => api.get(`/employees/${id}`),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  remove: (id) => api.delete(`/employees/${id}`),
};

// ---------- attendance ----------
export const attendanceApi = {
  checkIn: (employee_id) =>
    api.post('/attendance/checkin', employee_id ? { employee_id } : {}),
  checkOut: (employee_id) =>
    api.post('/attendance/checkout', employee_id ? { employee_id } : {}),
  me: () => api.get('/attendance/me'),
  today: () => api.get('/attendance/today'),
  history: (employeeId, month) =>
    api.get(`/attendance/employee/${employeeId}`, {
      params: month ? { month } : undefined,
    }),
};

// ---------- salary ----------
export const salaryApi = {
  byEmployee: (employeeId) => api.get(`/salary/employee/${employeeId}`),
  byMonth: (month) => api.get(`/salary/month/${month}`),
  generate: (body) => api.post('/salary/generate', body || {}),
  updateStatus: (id, status) => api.put(`/salary/${id}/status`, { status }),
};

// ---------- borrowed petrol ----------
export const borrowedApi = {
  list: (status) => api.get('/borrowed-petrol', { params: status ? { status } : undefined }),
  pending: () => api.get('/borrowed-petrol/pending'),
  get: (id) => api.get(`/borrowed-petrol/${id}`),
  create: (data) => api.post('/borrowed-petrol', data),
  update: (id, data) => api.put(`/borrowed-petrol/${id}`, data),
  addPayment: (id, amount) => api.post(`/borrowed-petrol/${id}/payment`, { amount }),
};

// ---------- alerts ----------
export const alertApi = {
  list: (unread) => api.get('/alerts', { params: unread ? { unread: 'true' } : undefined }),
  markRead: (id) => api.put(`/alerts/${id}/read`),
  markAllRead: () => api.put('/alerts/read-all'),
  runScan: () => api.post('/alerts/run-scan'),
};
