import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import investigationReducer from './slices/investigationSlice'
import evidenceReducer from './slices/evidenceSlice'
import rcaReducer from './slices/rcaSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    investigation: investigationReducer,
    evidence: evidenceReducer,
    rca: rcaReducer,
  },
})
