import { useEffect, useRef, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  X,
  Send,
  Sparkles,
  Paperclip,
  Loader2,
  Bot,
  User,
  FileText,
  Wand2,
  CheckCircle2,
  Zap,
  ExternalLink,
} from 'lucide-react'
import api from '../../services/api'
import { fetchInvestigations } from '../../redux/slices/investigationSlice'

const WELCOME = {
  role: 'assistant',
  content:
    "Hi! I'm **AIVOA.ai Copilot** — the AI engine of PharmaRoot AI.\n\nPaste an incident report or attach a PDF and I'll automatically extract the details, create the investigation, run RCA (5 Whys, Fishbone, root causes), identify missing evidence, and generate CAPA recommendations — populating the Dashboard, Investigation, RCA, Evidence and CAPA pages.\n\nYou can also ask me questions, or manage data:\n- `delete RCA-2026-001` — delete an investigation\n- `edit RCA-2026-001 batch to BATCH-999` — update a field\n\nEditable fields: batch, product, title, severity, status, parameter, actual, expected, department, equipment, stage, location, description.",
}

const REPORT_PATTERN = /batch|deviation|temperature|pressure|moisture|equipment|incident|excursion|out of spec|oos|yield|contamination|calibration|failure/i

function looksLikeReport(text) {
  return text.length > 300 || REPORT_PATTERN.test(text)
}

export default function CopilotPanel({ open, onClose }) {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { current, items } = useSelector((state) => state.investigation)
  const [messages, setMessages] = useState([WELCOME])
  const [input, setInput] = useState('')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [extracted, setExtracted] = useState(null)
  const [processed, setProcessed] = useState(null)
  const [model, setModel] = useState('')
  const fileRef = useRef(null)
  const bottomRef = useRef(null)
  const lastPayload = useRef({ text: '', file: null })

  useEffect(() => {
    api.get('/ai/copilot/models').then(({ data }) => setModel(data.current)).catch(() => {})
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const pushMessage = (role, content) =>
    setMessages((prev) => [...prev, { role, content }])

  const runExtraction = async (text, attachedFile) => {
    setLoading(true)
    setExtracted(null)
    setProcessed(null)
    lastPayload.current = { text, file: attachedFile }
    pushMessage(
      'user',
      attachedFile
        ? `📄 ${attachedFile.name}`
        : text.slice(0, 200) + (text.length > 200 ? '...' : ''),
    )
    try {
      const formData = new FormData()
      if (attachedFile) formData.append('file', attachedFile)
      if (text.trim()) formData.append('text', text)
      const { data } = await api.post('/ai/copilot/extract', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setExtracted(data)
      const fieldCount = Object.values(data.extracted_fields || {}).filter(Boolean).length
      pushMessage(
        'assistant',
        `Extraction complete — **${fieldCount} fields** identified.\n\n**Summary:** ${data.ai_summary || 'N/A'}\n\nReview the extracted fields below, then open the Investigation Workspace to fill the form.`,
      )
      // Stash extraction so the workspace can auto-fill the form
      sessionStorage.setItem('pharmaroot_pending_extraction', JSON.stringify(data))
      setInput('')
      setFile(null)
      setProcessed(null)
    } catch (err) {
      pushMessage('assistant', `Extraction failed: ${err.response?.data?.detail || err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const runFullAnalysis = async () => {
    const { text, file: f } = lastPayload.current
    if ((!text?.trim() && !f) || processing) return
    setProcessing(true)
    setInput('')
    setFile(null)
    setExtracted(null)
    setProcessed(null)
    pushMessage(
      'user',
      f ? `📄 ${f.name}` : (text?.slice(0, 200) || '') + (text?.length > 200 ? '...' : ''),
    )
    try {
      const formData = new FormData()
      if (f) formData.append('file', f)
      if (text?.trim()) formData.append('text', text)
      const { data } = await api.post('/ai/copilot/process', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setProcessed(data)
      if (data.extracted_fields) {
        setExtracted({ extracted_fields: data.extracted_fields, ai_summary: data.ai_summary })
        sessionStorage.setItem('pharmaroot_pending_extraction', JSON.stringify({ extracted_fields: data.extracted_fields, ai_summary: data.ai_summary }))
      }
      dispatch(fetchInvestigations())
      const errNote = data.errors && Object.keys(data.errors).length
        ? `\n\n⚠️ Some steps had issues: ${Object.keys(data.errors).join(', ')}`
        : ''
      pushMessage(
        'assistant',
        `✅ **Full analysis complete!** Investigation **${data.investigation_number}** created and saved.\n\n- RCA analyses: 5 Whys, Fishbone, Root Cause\n- Missing evidence items: ${data.missing_evidence_count}\n- CAPA recommendations: ${data.capa_count}\n\nDashboard, Investigations, RCA and CAPA pages are now updated.${errNote}`,
      )
    } catch (err) {
      pushMessage('assistant', `Analysis failed: ${err.response?.data?.detail || err.message}`)
    } finally {
      setProcessing(false)
    }
  }

  const FIELD_ALIASES = {
    batch: 'batch_number', batch_number: 'batch_number',
    product: 'product_name', product_name: 'product_name',
    title: 'deviation_title', deviation_title: 'deviation_title',
    severity: 'severity', status: 'status',
    parameter: 'parameter', actual: 'actual_value', actual_value: 'actual_value',
    expected: 'expected_value', expected_value: 'expected_value',
    department: 'department', equipment: 'equipment_id', equipment_id: 'equipment_id',
    stage: 'manufacturing_stage', manufacturing_stage: 'manufacturing_stage',
    location: 'manufacturing_location', manufacturing_location: 'manufacturing_location',
    description: 'deviation_description', deviation_description: 'deviation_description',
  }

  const findInvestigation = async (invNumber) => {
    let list = items
    if (!list?.length) {
      const { data } = await api.get('/investigations')
      list = data
    }
    return list.find((i) => i.investigation_id === invNumber)
  }

  const handleDeleteCommand = async (text) => {
    const m = text.match(/(?:delete|remove)\s+(?:investigation\s+)?(RCA-\d{4}-\d+)/i)
    if (!m) return false
    const invNumber = m[1].toUpperCase()
    pushMessage('user', text)
    setLoading(true)
    try {
      const inv = await findInvestigation(invNumber)
      if (!inv) {
        pushMessage('assistant', `❌ Investigation **${invNumber}** not found in your account.`)
        return true
      }
      await api.delete(`/investigations/${inv.id}`)
      dispatch(fetchInvestigations())
      pushMessage('assistant', `🗑️ Investigation **${invNumber}** deleted successfully — along with its RCA, evidence, missing evidence and CAPA records.`)
    } catch (err) {
      pushMessage('assistant', `Delete failed: ${err.response?.data?.detail || err.message}`)
    } finally {
      setLoading(false)
    }
    return true
  }

  const handleEditCommand = async (text) => {
    const m = text.match(/edit\s+(?:investigation\s+)?(RCA-\d{4}-\d+)\s+(.+?)\s+(?:to|=|as)\s+(.+)/i)
    if (!m) return false
    const invNumber = m[1].toUpperCase()
    const fieldAlias = m[2].trim().toLowerCase().replace(/[\s-]+/g, '_')
    const newValue = m[3].trim()
    const field = FIELD_ALIASES[fieldAlias] || FIELD_ALIASES[m[2].trim().toLowerCase()]
    pushMessage('user', text)
    setLoading(true)
    try {
      if (!field) {
        pushMessage('assistant', `❌ Unknown field "${m[2].trim()}". You can edit: batch, product, title, severity, status, parameter, actual, expected, department, equipment, stage, location, description.`)
        return true
      }
      const inv = await findInvestigation(invNumber)
      if (!inv) {
        pushMessage('assistant', `❌ Investigation **${invNumber}** not found in your account.`)
        return true
      }
      const { data } = await api.put(`/investigations/${inv.id}`, { [field]: newValue })
      dispatch(fetchInvestigations())
      pushMessage('assistant', `✏️ Updated **${invNumber}** — ${field} is now "${newValue}".`)
    } catch (err) {
      pushMessage('assistant', `Edit failed: ${err.response?.data?.detail || err.message}`)
    } finally {
      setLoading(false)
    }
    return true
  }

  const handleChat = async (text) => {
    setInput('')
    setExtracted(null)
    setProcessed(null)
    if (await handleDeleteCommand(text)) return
    if (await handleEditCommand(text)) return
    pushMessage('user', text)
    setLoading(true)
    try {
      const { data } = await api.post('/ai/copilot/chat', {
        message: text,
        history: messages.filter((m) => m !== WELCOME),
        investigation_id: current?.id || null,
      })
      pushMessage('assistant', data.reply)
    } catch (err) {
      pushMessage('assistant', `Sorry, I encountered an error: ${err.response?.data?.detail || err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const text = input.trim()
    if (processing || loading) return
    // Delete/edit commands take priority
    if (/^(delete|remove|edit)\s/i.test(text)) {
      handleChat(text)
      return
    }
    // File attached or report-like text → run the FULL pipeline automatically
    if (file) {
      lastPayload.current = { text, file }
      runFullAnalysis()
    } else if (text && looksLikeReport(text)) {
      lastPayload.current = { text, file: null }
      runFullAnalysis()
    } else if (text) {
      handleChat(text)
    }
  }

  const handleForceExtract = () => {
    const text = input.trim()
    if (text && !loading) runExtraction(text, null)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-navy-950/40" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
        {/* Header */}
        <div className="bg-navy-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm">AIVOA.ai Copilot</h2>
              <p className="text-[11px] text-navy-300">
                {model ? `Powered by Groq · ${model}` : 'Powered by LangGraph + Groq'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-navy-800 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                m.role === 'user' ? 'bg-navy-700' : 'bg-teal-600'
              }`}>
                {m.role === 'user' ? <User className="w-3.5 h-3.5 text-white" /> : <Bot className="w-3.5 h-3.5 text-white" />}
              </div>
              <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-navy-900 text-white rounded-tr-sm'
                  : 'bg-slate-100 text-slate-800 rounded-tl-sm'
              }`}>
                {m.content}
              </div>
            </div>
          ))}

          {/* Extracted fields card */}
          {extracted && (
            <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-3">
              <div className="flex items-center gap-2 text-teal-700 text-xs font-semibold mb-2">
                <CheckCircle2 className="w-4 h-4" /> Extracted Investigation Fields
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs max-h-48 overflow-y-auto">
                {Object.entries(extracted.extracted_fields || {})
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <div key={k} className="truncate">
                      <span className="text-slate-500">{k.replace(/_/g, ' ')}:</span>{' '}
                      <span className="font-medium text-navy-900">{String(v)}</span>
                    </div>
                  ))}
              </div>
              {!processed ? (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={runFullAnalysis}
                    disabled={processing}
                    className="btn-primary flex-1 text-xs"
                  >
                    {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                    {processing ? 'Running full AI analysis...' : 'Run Full AI Analysis — populate all pages'}
                  </button>
                  <button
                    onClick={() => {
                      onClose()
                      navigate('/investigations/new')
                    }}
                    className="btn-outline text-xs"
                  >
                    <FileText className="w-3.5 h-3.5" /> Fill Form Only
                  </button>
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  <div className="text-xs font-semibold text-teal-700">
                    ✅ Saved as {processed.investigation_number} — {processed.capa_count} CAPAs, {processed.missing_evidence_count} evidence gaps
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Investigation', path: `/investigations/${processed.investigation_id}` },
                      { label: 'RCA Analysis', path: `/investigations/${processed.investigation_id}/rca` },
                      { label: 'Evidence', path: `/investigations/${processed.investigation_id}/evidence` },
                      { label: 'CAPA', path: '/capa' },
                    ].map((l) => (
                      <button
                        key={l.label}
                        onClick={() => { onClose(); navigate(l.path) }}
                        className="btn-outline text-xs justify-center"
                      >
                        <ExternalLink className="w-3 h-3" /> {l.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {(loading || processing) && (
            <div className="flex gap-2.5">
              <div className="w-7 h-7 rounded-full bg-teal-600 flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-4 py-3">
                <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                {processing && <span className="text-xs text-slate-500 ml-2">Running RCA, evidence & CAPA analysis...</span>}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="border-t border-slate-200 p-3">
          {file && (
            <div className="flex items-center gap-2 mb-2 px-1">
              <span className="flex items-center gap-1.5 text-xs bg-teal-50 border border-teal-200 text-teal-700 rounded-lg px-2 py-1">
                <FileText className="w-3.5 h-3.5" /> {file.name}
                <button type="button" onClick={() => setFile(null)} className="hover:text-red-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
              <span className="text-[10px] text-slate-400">will be sent for AI extraction</span>
            </div>
          )}
          <div className="flex gap-2 items-end">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="btn-outline p-2.5"
              title="Attach PDF or TXT for extraction"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.txt,.md"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <textarea
              className="input flex-1 resize-none text-sm"
              rows={2}
              placeholder="Ask a question, paste an incident report, or attach a PDF..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit(e)
                }
              }}
            />
            {/* Extract button — for pasted text without a file */}
            {!file && input.trim() && (
              <button
                type="button"
                onClick={handleForceExtract}
                disabled={loading}
                className="btn-outline p-2.5"
                title="Extract investigation fields from this text"
              >
                <Wand2 className="w-4 h-4 text-teal-600" />
              </button>
            )}
            <button
              type="submit"
              disabled={loading || (!input.trim() && !file)}
              className="btn-primary self-end"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 text-center">
            � Paste a report or attach a PDF → full AI analysis runs automatically · 💬 Short questions → chat
          </p>
        </form>
      </div>
    </div>
  )
}
