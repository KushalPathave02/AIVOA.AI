import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'
import { loginSuccess, logout } from './authSlice'

export const runExtraction = createAsyncThunk('rca/extract', async ({ text, file }) => {
  const formData = new FormData()
  if (file) formData.append('file', file)
  if (text) formData.append('text', text)
  const { data } = await api.post('/ai/extract', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
})

export const runFiveWhys = createAsyncThunk('rca/fiveWhys', async (investigationId) => {
  const { data } = await api.post('/ai/five-whys', { investigation_id: investigationId })
  return data
})

export const runFishbone = createAsyncThunk('rca/fishbone', async (investigationId) => {
  const { data } = await api.post('/ai/fishbone', { investigation_id: investigationId })
  return data
})

export const runRootCause = createAsyncThunk('rca/rootCause', async (investigationId) => {
  const { data } = await api.post('/ai/rca', { investigation_id: investigationId })
  return data
})

export const runMissingEvidence = createAsyncThunk('rca/missingEvidence', async (investigationId) => {
  const { data } = await api.post('/ai/missing-evidence', { investigation_id: investigationId })
  return data
})

export const runCAPA = createAsyncThunk('rca/capa', async (investigationId) => {
  const { data } = await api.post('/ai/capa', { investigation_id: investigationId })
  return data
})

export const fetchAnalyses = createAsyncThunk('rca/fetchAnalyses', async (investigationId) => {
  const { data } = await api.get(`/ai/analyses/${investigationId}`)
  return data
})

const initialState = {
  extracted: null,
  fiveWhys: null,
  fishbone: null,
  rootCauses: [],
  missingEvidence: [],
  capa: null,
  status: 'idle',
  error: null,
  activeAnalysis: null,
}

const rcaSlice = createSlice({
  name: 'rca',
  initialState,
  reducers: {
    resetRca(state) {
      return { ...initialState }
    },
    setExtracted(state, action) {
      state.extracted = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(runExtraction.pending, (state) => { state.status = 'loading'; state.activeAnalysis = 'extract' })
      .addCase(runExtraction.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.activeAnalysis = null
        state.extracted = action.payload
      })
      .addCase(runExtraction.rejected, (state, action) => {
        state.status = 'failed'
        state.activeAnalysis = null
        state.error = action.error.message
      })
      .addCase(runFiveWhys.fulfilled, (state, action) => { state.fiveWhys = action.payload })
      .addCase(runFishbone.fulfilled, (state, action) => { state.fishbone = action.payload })
      .addCase(runRootCause.fulfilled, (state, action) => { state.rootCauses = action.payload })
      .addCase(runMissingEvidence.fulfilled, (state, action) => { state.missingEvidence = action.payload })
      .addCase(runCAPA.fulfilled, (state, action) => { state.capa = action.payload })
      .addCase(fetchAnalyses.fulfilled, (state, action) => {
        const d = action.payload || {}
        if (d.five_whys) state.fiveWhys = d.five_whys
        if (d.fishbone) state.fishbone = d.fishbone
        if (d.root_causes?.length) state.rootCauses = d.root_causes
        if (d.missing_evidence?.length) state.missingEvidence = d.missing_evidence
        if (d.capa_recommendations && (d.capa_recommendations.corrective_actions?.length || d.capa_recommendations.preventive_actions?.length)) {
          state.capa = d.capa_recommendations
        }
      })
      .addCase(loginSuccess, () => ({ ...initialState }))
      .addCase(logout, () => ({ ...initialState }))
  },
})

export const { resetRca, setExtracted } = rcaSlice.actions
export default rcaSlice.reducer
