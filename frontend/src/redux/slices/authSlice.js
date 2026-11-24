import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  user: JSON.parse(localStorage.getItem('pharmaroot_user') || 'null'),
  token: localStorage.getItem('pharmaroot_token') || null,
  status: 'idle',
  error: null,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart(state) {
      state.status = 'loading'
      state.error = null
    },
    loginSuccess(state, action) {
      state.status = 'succeeded'
      state.user = action.payload.user
      state.token = action.payload.token
      localStorage.setItem('pharmaroot_token', action.payload.token)
      localStorage.setItem('pharmaroot_user', JSON.stringify(action.payload.user))
    },
    loginFailure(state, action) {
      state.status = 'failed'
      state.error = action.payload
    },
    logout(state) {
      state.user = null
      state.token = null
      localStorage.removeItem('pharmaroot_token')
      localStorage.removeItem('pharmaroot_user')
    },
  },
})

export const { loginStart, loginSuccess, loginFailure, logout } = authSlice.actions
export default authSlice.reducer
