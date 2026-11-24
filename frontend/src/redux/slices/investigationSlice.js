import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'
import { loginSuccess, logout } from './authSlice'

export const fetchInvestigations = createAsyncThunk('investigation/fetchAll', async () => {
  const { data } = await api.get('/investigations')
  return data
})

export const fetchInvestigation = createAsyncThunk('investigation/fetchOne', async (id) => {
  const { data } = await api.get(`/investigations/${id}`)
  return data
})

export const createInvestigation = createAsyncThunk('investigation/create', async (payload) => {
  const { data } = await api.post('/investigations', payload)
  return data
})

export const updateInvestigation = createAsyncThunk('investigation/update', async ({ id, payload }) => {
  const { data } = await api.put(`/investigations/${id}`, payload)
  return data
})

const initialState = {
  items: [],
  current: null,
  status: 'idle',
  error: null,
}

const investigationSlice = createSlice({
  name: 'investigation',
  initialState,
  reducers: {
    clearCurrent(state) {
      state.current = null
    },
    setCurrent(state, action) {
      state.current = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInvestigations.pending, (state) => { state.status = 'loading' })
      .addCase(fetchInvestigations.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.items = action.payload
      })
      .addCase(fetchInvestigations.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message
      })
      .addCase(fetchInvestigation.fulfilled, (state, action) => {
        state.current = action.payload
      })
      .addCase(createInvestigation.fulfilled, (state, action) => {
        state.items.unshift(action.payload)
      })
      .addCase(updateInvestigation.fulfilled, (state, action) => {
        const idx = state.items.findIndex((i) => i.id === action.payload.id)
        if (idx !== -1) state.items[idx] = action.payload
        if (state.current?.id === action.payload.id) state.current = action.payload
      })
      .addCase(loginSuccess, () => ({ ...initialState }))
      .addCase(logout, () => ({ ...initialState }))
  },
})

export const { clearCurrent, setCurrent } = investigationSlice.actions
export default investigationSlice.reducer
