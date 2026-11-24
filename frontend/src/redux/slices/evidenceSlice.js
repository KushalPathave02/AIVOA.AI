import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'
import { loginSuccess, logout } from './authSlice'

export const fetchEvidence = createAsyncThunk('evidence/fetchAll', async (investigationId) => {
  const { data } = await api.get(`/evidence?investigation_id=${investigationId}`)
  return data
})

export const uploadEvidence = createAsyncThunk('evidence/upload', async ({ investigationId, file, evidenceType }) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('investigation_id', investigationId)
  formData.append('evidence_type', evidenceType)
  const { data } = await api.post('/evidence/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
})

export const analyzeEvidence = createAsyncThunk('evidence/analyze', async (evidenceId) => {
  const { data } = await api.post(`/ai/analyze-evidence/${evidenceId}`)
  return data
})

const initialState = {
  items: [],
  status: 'idle',
  error: null,
  analyzingId: null,
}

const evidenceSlice = createSlice({
  name: 'evidence',
  initialState,
  reducers: {
    clearEvidence(state) {
      state.items = []
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEvidence.fulfilled, (state, action) => {
        state.items = action.payload
      })
      .addCase(uploadEvidence.fulfilled, (state, action) => {
        state.items.push(action.payload)
      })
      .addCase(analyzeEvidence.pending, (state, action) => {
        state.analyzingId = action.meta.arg
      })
      .addCase(analyzeEvidence.fulfilled, (state, action) => {
        state.analyzingId = null
        const idx = state.items.findIndex((e) => e.id === action.payload.id)
        if (idx !== -1) state.items[idx] = action.payload
      })
      .addCase(analyzeEvidence.rejected, (state) => {
        state.analyzingId = null
      })
      .addCase(loginSuccess, () => ({ ...initialState }))
      .addCase(logout, () => ({ ...initialState }))
  },
})

export const { clearEvidence } = evidenceSlice.actions
export default evidenceSlice.reducer
