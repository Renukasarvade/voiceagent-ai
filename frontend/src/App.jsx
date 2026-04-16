import { useState, useRef, useEffect } from 'react'

// ── FIX: Always use /health not / for status check
// ── FIX: API base is empty string (same-origin), works for both local and Render
const API = ''

const COLORS = {
  write_code:  '#a78bfa',
  create_file: '#38bdf8',
  summarize:   '#34d399',
  chat:        '#94a3b8',
}
const ICONS = {
  write_code:  '💻',
  create_file: '📁',
  summarize:   '📝',
  chat:        '💬',
}

const ACTION_LABELS = {
  write_code:  '💻 Code generated and saved',
  create_file: '📁 File created',
  summarize:   '📝 Summary generated',
  chat:        '💬 Response generated',
}

const styles = {
  root: {
    minHeight: '100vh',
    background: '#0a0a0a',
    color: '#e2e8f0',
    fontFamily: "'Space Grotesk', sans-serif",
    padding: '0',
    margin: '0',
  },
  header: {
    borderBottom: '1px solid #1e1e1e',
    padding: '18px 32px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: '#0d0d0d',
  },
  logo: {
    fontSize: '22px',
    fontWeight: '700',
    background: 'linear-gradient(90deg, #a78bfa, #38bdf8)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '-0.5px',
  },
  badge: {
    background: '#1a1a1a',
    border: '1px solid #2a2a2a',
    borderRadius: '6px',
    padding: '3px 10px',
    fontSize: '11px',
    color: '#64748b',
    letterSpacing: '0.1em',
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: '340px 1fr',
    height: 'calc(100vh - 57px)',
  },
  left: {
    borderRight: '1px solid #1e1e1e',
    padding: '24px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    background: '#0d0d0d',
    overflowY: 'auto',
  },
  right: {
    padding: '28px 32px',
    overflowY: 'auto',
    background: '#0a0a0a',
  },
  sectionLabel: {
    fontSize: '10px',
    fontWeight: '600',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    color: '#475569',
    marginBottom: '10px',
  },
  uploadBox: {
    border: '2px dashed #1e1e1e',
    borderRadius: '12px',
    padding: '20px 16px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'border-color 0.2s',
    background: '#111',
  },
  uploadBoxActive: { borderColor: '#a78bfa' },
  uploadIcon: { fontSize: '28px', marginBottom: '8px' },
  uploadText: { fontSize: '13px', color: '#64748b', lineHeight: '1.5' },
  textarea: {
    width: '100%',
    background: '#111',
    border: '1px solid #1e1e1e',
    borderRadius: '10px',
    color: '#e2e8f0',
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: '13px',
    padding: '12px',
    resize: 'vertical',
    minHeight: '80px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  btn: {
    width: '100%',
    padding: '11px',
    border: 'none',
    borderRadius: '9px',
    background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
    color: '#fff',
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'opacity 0.2s, transform 0.1s',
  },
  btnSm: {
    padding: '7px 14px',
    border: '1px solid #2a2a2a',
    borderRadius: '7px',
    background: '#151515',
    color: '#94a3b8',
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: '12px',
    cursor: 'pointer',
  },
  btnDanger: {
    padding: '7px 14px',
    border: '1px solid #3f1111',
    borderRadius: '7px',
    background: '#1a0a0a',
    color: '#f87171',
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: '12px',
    cursor: 'pointer',
  },
  btnDownload: {
    padding: '6px 12px',
    border: '1px solid #1a3a1a',
    borderRadius: '7px',
    background: '#0d1a0d',
    color: '#34d399',
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: '11px',
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  },
  btnDelete: {
    padding: '6px 10px',
    border: '1px solid #3f1111',
    borderRadius: '7px',
    background: '#1a0a0a',
    color: '#f87171',
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: '11px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  },
  btnRegen: {
    padding: '9px 18px',
    border: '1px solid #334155',
    borderRadius: '9px',
    background: '#151515',
    color: '#e2e8f0',
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  },
  btnMic: (recording) => ({
    width: '100%',
    padding: '11px',
    border: `2px solid ${recording ? '#f87171' : '#2a2a2a'}`,
    borderRadius: '9px',
    background: recording ? '#2a0a0a' : '#151515',
    color: recording ? '#f87171' : '#94a3b8',
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  }),
  pipelineGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '20px',
  },
  card: {
    background: '#111',
    border: '1px solid #1e1e1e',
    borderRadius: '12px',
    padding: '16px',
    position: 'relative',
    overflow: 'hidden',
  },
  cardAccent:  { position: 'absolute', top: 0, left: 0, right: 0, height: '2px' },
  cardLabel: {
    fontSize: '10px',
    fontWeight: '600',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    marginBottom: '8px',
  },
  cardContent: {
    fontSize: '13px',
    color: '#cbd5e1',
    lineHeight: '1.6',
    wordBreak: 'break-word',
  },
  codeBlockWrap: {
    background: '#0d0d0d',
    border: '1px solid #1e1e1e',
    borderRadius: '10px',
    overflow: 'hidden',
    marginTop: '8px',
  },
  codeBlockHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 14px',
    background: '#111',
    borderBottom: '1px solid #1e1e1e',
  },
  codeBlock: {
    padding: '16px',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '12px',
    color: '#a5f3fc',
    overflowX: 'auto',
    whiteSpace: 'pre',
    maxHeight: '380px',
    overflowY: 'auto',
    lineHeight: '1.7',
    margin: 0,
  },
  chatBox: {
    background: '#0d1a0d',
    border: '1px solid #1a3a1a',
    borderRadius: '10px',
    padding: '16px',
    fontSize: '13px',
    lineHeight: '1.8',
    color: '#86efac',
    marginTop: '8px',
    whiteSpace: 'pre-wrap',
  },
  summaryBox: {
    background: '#0d1220',
    border: '1px solid #1a2a4a',
    borderRadius: '10px',
    padding: '16px',
    fontSize: '13px',
    lineHeight: '1.8',
    color: '#93c5fd',
    marginTop: '8px',
    whiteSpace: 'pre-wrap',
  },
  intentBadge: (intent) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '4px 10px',
    borderRadius: '999px',
    fontSize: '11px',
    fontWeight: '600',
    background: (COLORS[intent] || '#64748b') + '18',
    color: COLORS[intent] || '#64748b',
    border: `1px solid ${(COLORS[intent] || '#64748b')}33`,
    letterSpacing: '0.03em',
  }),
  historyItem: {
    background: '#0f0f0f',
    border: '1px solid #1a1a1a',
    borderLeft: '3px solid #7c3aed',
    borderRadius: '0 8px 8px 0',
    padding: '10px 12px',
    marginBottom: '8px',
    fontSize: '12px',
    color: '#94a3b8',
    cursor: 'pointer',
  },
  fileItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 0',
    borderBottom: '1px solid #151515',
    fontSize: '12px',
    color: '#64748b',
    gap: '8px',
  },
  dot: (ok) => ({
    width: '7px', height: '7px',
    borderRadius: '50%',
    background: ok ? '#34d399' : '#f87171',
    display: 'inline-block',
    marginRight: '6px',
    boxShadow: ok ? '0 0 5px #34d399' : 'none',
  }),
  spinner: {
    display: 'inline-block',
    width: '14px', height: '14px',
    border: '2px solid #2a2a2a',
    borderTop: '2px solid #a78bfa',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    marginRight: '8px',
    verticalAlign: 'middle',
  },
  divider:    { border: 'none', borderTop: '1px solid #1a1a1a', margin: '4px 0' },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '60%',
    color: '#2a2a2a',
    gap: '12px',
    textAlign: 'center',
  },
  confirmBar: {
    background: '#1a1200',
    border: '1px solid #713f12',
    borderRadius: '10px',
    padding: '14px 16px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap',
  },
  tab: (active) => ({
    padding: '6px 14px',
    border: 'none',
    borderRadius: '7px',
    background: active ? '#1e1e1e' : 'transparent',
    color: active ? '#e2e8f0' : '#475569',
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: '12px',
    fontWeight: active ? '600' : '400',
    cursor: 'pointer',
  }),
  recDot: {
    width: '8px', height: '8px',
    borderRadius: '50%',
    background: '#f87171',
    display: 'inline-block',
    animation: 'pulse 1s ease-in-out infinite',
  },
}

// Inject keyframe animations once
const styleEl = document.createElement('style')
styleEl.textContent = `
  @keyframes spin  { to { transform: rotate(360deg); } }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
`
document.head.appendChild(styleEl)

// ── Sub-components ─────────────────────────────────────────

function StepCard({ label, content, color = '#a78bfa', mono = false }) {
  return (
    <div style={styles.card}>
      <div style={{ ...styles.cardAccent, background: color }} />
      <div style={{ ...styles.cardLabel, color }}>{label}</div>
      <div style={{
        ...styles.cardContent,
        fontFamily: mono ? "'JetBrains Mono', monospace" : 'inherit',
        fontSize: mono ? '12px' : '13px',
      }}>
        {content || <span style={{ color: '#2a2a2a' }}>—</span>}
      </div>
    </div>
  )
}

function CodePreview({ code, language, filename }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  function downloadCode() {
    const blob = new Blob([code], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = filename || 'code.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={styles.codeBlockWrap}>
      <div style={styles.codeBlockHeader}>
        <span style={{ fontSize: '11px', color: '#475569', fontFamily: "'JetBrains Mono', monospace" }}>
          {language || 'code'}{filename ? ` · ${filename}` : ''}
        </span>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button style={{ ...styles.btnSm, padding: '3px 10px', fontSize: '11px' }} onClick={copy}>
            {copied ? '✅ Copied' : '📋 Copy'}
          </button>
          <button style={{ ...styles.btnSm, padding: '3px 10px', fontSize: '11px', color: '#34d399', borderColor: '#1a3a1a' }} onClick={downloadCode}>
            ⬇ Download
          </button>
        </div>
      </div>
      <pre style={styles.codeBlock}>{code}</pre>
    </div>
  )
}

const EXAMPLES = [
  { label: '💻 Write Code',  text: 'Write a Python function with exponential backoff retry logic and save it to retry.py' },
  { label: '📁 Create File', text: 'Create a new file called config.json' },
  { label: '📝 Summarize',   text: 'Summarize: Artificial intelligence is transforming every industry worldwide. From healthcare to finance, AI models automate tasks, improve accuracy, and reduce costs. However, ethical concerns and job displacement remain major challenges that society must address urgently.' },
  { label: '💬 Chat',        text: 'What is the difference between REST and GraphQL?' },
]

// ── Main App ───────────────────────────────────────────────

export default function App() {
  const [inputMode,       setInputMode]       = useState('text')
  const [textInput,       setTextInput]       = useState('')
  const [audioFile,       setAudioFile]       = useState(null)
  const [loading,         setLoading]         = useState(false)
  const [loadingStep,     setLoadingStep]     = useState('')
  const [result,          setResult]          = useState(null)
  const [history,         setHistory]         = useState([])
  const [outputFiles,     setOutputFiles]     = useState([])
  const [confirmPending,  setConfirmPending]  = useState(null)
  const [requireConfirm,  setRequireConfirm]  = useState(true)
  const [apiStatus,       setApiStatus]       = useState({ groq: false, openrouter: false })
  const [isRecording,     setIsRecording]     = useState(false)
  const [recSeconds,      setRecSeconds]      = useState(0)

  const fileInputRef = useRef(null)
  const txtFileRef   = useRef(null)
  const mediaRecRef  = useRef(null)
  const chunksRef    = useRef([])
  const recTimerRef  = useRef(null)

  useEffect(() => {
    // ── FIX: Call /health (returns JSON) instead of / (returns HTML)
    fetch(`${API}/health`)
      .then(r => r.json())
      .then(d => setApiStatus(d))
      .catch(() => {})
    fetchFiles()
  }, [])

  async function fetchFiles() {
    try {
      const r = await fetch(`${API}/files`)
      const d = await r.json()
      setOutputFiles(d.files || [])
    } catch { }
  }

  // ── Recording ────────────────────────────────────────────
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      chunksRef.current = []

      // ── FIX: Detect supported mimeType at runtime (cross-browser/OS safe)
      let mimeType = 'audio/webm'
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus'
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm'
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus'
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4'
      }

      const mr = new MediaRecorder(stream, { mimeType })

      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: mimeType })

        // ── FIX: Pass correct extension based on actual mimeType used
        let ext = 'webm'
        if (mimeType.includes('ogg')) ext = 'ogg'
        else if (mimeType.includes('mp4')) ext = 'mp4'
        else ext = 'webm'

        runPipeline('', blob, `recording.${ext}`)
      }

      mr.start()
      mediaRecRef.current = mr
      setIsRecording(true)
      setRecSeconds(0)
      recTimerRef.current = setInterval(() => setRecSeconds(s => s + 1), 1000)
    } catch (err) {
      alert('Microphone access denied: ' + err.message)
    }
  }

  function stopRecording() {
    if (mediaRecRef.current && isRecording) {
      mediaRecRef.current.stop()
      setIsRecording(false)
      clearInterval(recTimerRef.current)
      setRecSeconds(0)
    }
  }

  // ── File upload handlers ─────────────────────────────────
  function handleTxtUpload(e) {
    const f = e.target.files[0]
    if (!f) return
    if (f.name.endsWith('.pdf') || f.type === 'application/pdf') {
      alert('❌ PDF files are not supported. Please paste plain text into the command box.')
      e.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target.result.trim()
      const nonPrintable = [...text.slice(0, 200)].filter(
        c => c.charCodeAt(0) > 127 || (c.charCodeAt(0) < 32 && !'\n\r\t'.includes(c))
      ).length
      if (nonPrintable / Math.min(text.length, 200) > 0.2) {
        alert('❌ This file appears to contain binary data. Please use a plain .txt file.')
        e.target.value = ''
        return
      }
      if (text) {
        setTextInput(`Summarize: ${text.slice(0, 3000)}`)
        setInputMode('text')
      }
    }
    reader.readAsText(f)
    e.target.value = ''
  }

  function handleAudioUpload(e) {
    const f = e.target.files[0]
    if (f) setAudioFile(f)
  }

  // ── Pipeline ─────────────────────────────────────────────
  async function runPipeline(text, audioBlob = null, filename = 'audio.webm') {
     console.log("INPUT SENT:", text) 
    setLoading(true)
    setResult(null)
    setConfirmPending(null)
    let transcribed = text

    try {
      // Step 1: Transcribe if audio
      if (audioBlob) {
        setLoadingStep('Transcribing audio...')
        const form = new FormData()
        form.append('file', audioBlob, filename)
        const r = await fetch(`${API}/transcribe`, { method: 'POST', body: form })
        if (!r.ok) {
          const errText = await r.text()
          throw new Error(`Transcription failed: ${errText}`)
        }
        const d = await r.json()
        transcribed = d.text
           console.log("TRANSCRIBED TEXT:", transcribed)
        if (!transcribed) throw new Error('Transcription returned empty text.')
      }

      // Step 2: Classify intent
      setLoadingStep('Classifying intent...')
      const ir = await fetch(`${API}/intent`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text: transcribed }),
      })
      if (!ir.ok) throw new Error('Intent classification failed')
      const intentData = await ir.json()

      // Confirm gate for file-writing operations
      const fileOps = ['write_code', 'create_file']
      if (fileOps.includes(intentData.intent) && requireConfirm) {
        setLoading(false)
        setLoadingStep('')
        setConfirmPending({ text: transcribed, intentData })
        setResult({ text: transcribed, intentData, executionResult: null })
        return
      }

      await doExecute(transcribed, intentData)
    } catch (err) {
      setResult({ error: err.message || 'Unknown error occurred' })
    } finally {
      setLoading(false)
      setLoadingStep('')
    }
  }

  async function doExecute(text, intentData, isRegenerate = false) {
    setLoadingStep(isRegenerate ? 'Regenerating...' : 'Executing action...')
    setLoading(true)
    try {
      const er = await fetch(`${API}/execute`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          text,
          intent:     intentData.intent,
          params:     intentData.params || {},
          confirmed:  true,
          regenerate: isRegenerate,
        }),
      })
      if (!er.ok) throw new Error('Execution request failed')
      const executionResult = await er.json()
      const run = { text, intentData, executionResult, ts: new Date().toLocaleTimeString() }
      setResult(run)
      setHistory(h => isRegenerate ? [run, ...h.slice(1)] : [run, ...h.slice(0, 9)])
      setConfirmPending(null)
      fetchFiles()
    } catch (err) {
      setResult({ error: err.message || 'Execution failed' })
    } finally {
      setLoading(false)
      setLoadingStep('')
    }
  }



  function downloadOutputFile(filename) {
    const url = `${API}/files/download/${encodeURIComponent(filename)}`
    const a   = document.createElement('a')
    a.href    = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  async function deleteOutputFile(filename) {
    if (!window.confirm(`Delete "${filename}" from output folder?`)) return
    try {
      const r = await fetch(`${API}/files/${encodeURIComponent(filename)}`, { method: 'DELETE' })
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        alert(`❌ Could not delete file: ${err.detail || r.statusText}`)
        return
      }
      fetchFiles()
    } catch (e) {
      alert('❌ Delete failed: ' + e.message)
    }
  }

  const intent = result?.intentData?.intent

  // ── Render ───────────────────────────────────────────────
  return (
    <div style={styles.root}>

      {/* Header */}
      <div style={styles.header}>
        <span style={{ fontSize: '20px' }}>🎙️</span>
        <span style={styles.logo}>VoiceAgent</span>
        <span style={styles.badge}>AI</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px' }}><span style={styles.dot(apiStatus.groq)} />Groq</span>
          <span style={{ fontSize: '12px' }}><span style={styles.dot(apiStatus.openrouter)} />OpenRouter</span>
        </div>
      </div>

      <div style={styles.layout}>

        {/* ── LEFT PANEL ── */}
        <div style={styles.left}>

          {/* Input mode tabs */}
          <div>
            <div style={styles.sectionLabel}>Input Mode</div>
            <div style={{ display: 'flex', gap: '6px', background: '#0d0d0d', padding: '4px', borderRadius: '8px', border: '1px solid #1a1a1a' }}>
              <button style={styles.tab(inputMode === 'text')}  onClick={() => setInputMode('text')}>⌨️ Text</button>
              <button style={styles.tab(inputMode === 'audio')} onClick={() => setInputMode('audio')}>🎤 Audio</button>
            </div>
          </div>

          {/* Text input */}
          {inputMode === 'text' && (
            <div>
              <div style={styles.sectionLabel}>Your Command</div>
              <textarea
                style={styles.textarea}
                placeholder="e.g. Write a Python retry function and save it to retry.py"
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && e.ctrlKey && handleSubmit()}
              />
              <div style={{ fontSize: '11px', color: '#334155', marginTop: '4px' }}>Ctrl+Enter to run</div>
              <div style={{ marginTop: '10px' }}>
                <div style={{ fontSize: '11px', color: '#334155', marginBottom: '5px' }}>Or upload a .txt file to summarize:</div>
                <button style={{ ...styles.btnSm, width: '100%' }} onClick={() => txtFileRef.current?.click()}>
                  📄 Upload .txt File
                </button>
                <input ref={txtFileRef} type="file" accept=".txt" style={{ display: 'none' }} onChange={handleTxtUpload} />
              </div>
            </div>
          )}

          {/* Audio input */}
          {inputMode === 'audio' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <div style={styles.sectionLabel}>🎙 Record from Microphone</div>
                <button style={styles.btnMic(isRecording)} onClick={isRecording ? stopRecording : startRecording}>
                  {isRecording
                    ? <><span style={styles.recDot} /> Stop Recording ({recSeconds}s)</>
                    : <>🎤 Start Recording</>}
                </button>
                {isRecording && (
                  <div style={{ fontSize: '11px', color: '#f87171', marginTop: '4px', textAlign: 'center' }}>
                    Recording… click Stop when done
                  </div>
                )}
              </div>
              <div style={{ fontSize: '11px', color: '#334155', textAlign: 'center' }}>— or upload a file —</div>
              <div>
                <div style={styles.sectionLabel}>Upload Audio File</div>
                <div
                  style={{ ...styles.uploadBox, ...(audioFile ? styles.uploadBoxActive : {}) }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div style={styles.uploadIcon}>{audioFile ? '✅' : '🎤'}</div>
                  <div style={styles.uploadText}>
                    {audioFile ? audioFile.name : 'Click to upload\n.wav, .mp3, .m4a, .ogg'}
                  </div>
                </div>
                <input ref={fileInputRef} type="file" accept=".wav,.mp3,.m4a,.ogg,.flac,.webm" style={{ display: 'none' }} onChange={handleAudioUpload} />
                {audioFile && (
                  <button style={{ ...styles.btnSm, marginTop: '8px', width: '100%' }} onClick={() => setAudioFile(null)}>
                    ✕ Remove
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Run button */}
          {(inputMode === 'text' || (inputMode === 'audio' && audioFile)) && (
            <button style={{ ...styles.btn, opacity: loading ? 0.6 : 1 }} onClick={handleSubmit} disabled={loading}>
              {loading ? <><span style={styles.spinner} />{loadingStep}</> : '▶ Run Agent'}
            </button>
          )}

          {/* Confirm toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#475569' }}>
            <input type="checkbox" id="confirm" checked={requireConfirm} onChange={e => setRequireConfirm(e.target.checked)} />
            <label htmlFor="confirm" style={{ cursor: 'pointer' }}>
              Confirm before file ops {requireConfirm ? '(ON)' : '(OFF)'}
            </label>
          </div>

          <hr style={styles.divider} />

          {/* Quick examples */}
          <div>
            <div style={styles.sectionLabel}>Quick Examples</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {EXAMPLES.map(ex => (
                <button key={ex.label} style={styles.btnSm} onClick={() => { setInputMode('text'); setTextInput(ex.text) }}>
                  {ex.label}
                </button>
              ))}
            </div>
          </div>

          <hr style={styles.divider} />

          {/* Output files */}
          <div>
            <div style={{ ...styles.sectionLabel, display: 'flex', justifyContent: 'space-between' }}>
              <span>Output Files</span>
              <span style={{ cursor: 'pointer', color: '#334155' }} onClick={fetchFiles}>↻</span>
            </div>
            {outputFiles.length === 0
              ? <div style={{ fontSize: '12px', color: '#2a2a2a' }}>No files yet</div>
              : outputFiles.map(f => (
                <div key={f.name} style={styles.fileItem}>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    📄 {f.name}
                  </span>
                  <span style={{ flexShrink: 0 }}>{f.size}B</span>
                  <button
                    style={{ ...styles.btnDownload, flexShrink: 0 }}
                    onClick={() => downloadOutputFile(f.name)}
                    title={`Download ${f.name}`}
                  >
                    ⬇
                  </button>
                  <button
                    style={{ ...styles.btnDelete, flexShrink: 0 }}
                    onClick={() => deleteOutputFile(f.name)}
                    title={`Delete ${f.name}`}
                  >
                    🗑
                  </button>
                </div>
              ))
            }
          </div>

          <hr style={styles.divider} />

          {/* History */}
          <div>
            <div style={{ ...styles.sectionLabel, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>History ({history.length})</span>
              {history.length > 0 && <button style={styles.btnDanger} onClick={() => setHistory([])}>Clear</button>}
            </div>
            {history.map((h, i) => (
              <div key={i} style={styles.historyItem} onClick={() => setResult(h)}>
                <span>{ICONS[h.intentData?.intent] || '🔹'} </span>
                {h.text?.slice(0, 55)}{h.text?.length > 55 ? '…' : ''}
                <div style={{ color: '#334155', marginTop: '2px', fontSize: '11px' }}>{h.ts}</div>
              </div>
            ))}
          </div>

        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={styles.right}>

          {/* Confirm bar */}
          {confirmPending && (
            <div style={styles.confirmBar}>
              <div style={{ fontSize: '13px', color: '#fbbf24', flex: 1 }}>
                ⚠️ <strong>Confirm action:</strong> Intent:{' '}
                <code style={{ background: '#2a1800', padding: '1px 5px', borderRadius: '4px' }}>
                  {confirmPending.intentData?.intent}
                </code>{' '}
                — will write to{' '}
                <code style={{ background: '#2a1800', padding: '1px 5px', borderRadius: '4px' }}>output/</code>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  style={{ ...styles.btn, width: 'auto', padding: '8px 18px', background: 'linear-gradient(135deg,#065f46,#0891b2)' }}
                  onClick={() => doExecute(confirmPending.text, confirmPending.intentData)}
                >
                  ✅ Confirm
                </button>
                <button style={{ ...styles.btnDanger, padding: '8px 14px' }} onClick={() => { setConfirmPending(null); setResult(null) }}>
                  ✕ Cancel
                </button>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!result && !loading && (
            <div style={styles.emptyState}>
              <div style={{ fontSize: '48px' }}>🎙️</div>
              <div style={{ fontSize: '20px', color: '#1e1e1e', fontWeight: '700' }}>Ready</div>
              <div style={{ fontSize: '13px', color: '#1a1a1a', maxWidth: '260px' }}>
                Type a command, record audio, or upload a file.
              </div>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div style={styles.emptyState}>
              <div style={{ fontSize: '36px' }}>⚡</div>
              <div style={{ fontSize: '14px', color: '#475569' }}>
                <span style={styles.spinner} />{loadingStep}
              </div>
            </div>
          )}

          {/* Error state */}
          {result?.error && (
            <div style={{ background: '#1a0a0a', border: '1px solid #7f1d1d', borderRadius: '10px', padding: '16px', color: '#f87171', fontSize: '13px' }}>
              ❌ {result.error}
            </div>
          )}

          {/* Result */}
          {result && !result.error && !loading && (
            <>
              <div style={{ marginBottom: '20px' }}>
                <div style={styles.sectionLabel}>Pipeline Output</div>
              </div>

              {/* 4-step pipeline grid */}
              <div style={styles.pipelineGrid}>

                <StepCard
                  label="Step 1 · Input"
                  content={result.text}
                  color="#38bdf8"
                />

                <div style={styles.card}>
                  <div style={{ ...styles.cardAccent, background: COLORS[intent] || '#64748b' }} />
                  <div style={{ ...styles.cardLabel, color: COLORS[intent] || '#64748b' }}>Step 2 · Intent</div>
                  <div style={{ marginBottom: '8px' }}>
                    <span style={styles.intentBadge(intent)}>
                      {ICONS[intent]} {intent}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#475569' }}>
                    Confidence: {Math.round((result.intentData?.confidence || 0) * 100)}%
                    {result.intentData?.fallback && ' · fallback'}
                  </div>
                  {result.intentData?.params?.language && (
                    <div style={{ fontSize: '11px', color: '#475569', marginTop: '4px' }}>
                      Language: {result.intentData.params.language}
                    </div>
                  )}
                </div>

                <StepCard
                  label="Step 3 · Action"
                  content={
                    confirmPending
                      ? '⏳ Awaiting confirmation'
                      : result.executionResult
                        ? ACTION_LABELS[intent] || '⚙️ Action completed'
                        : '—'
                  }
                  color="#a78bfa"
                />

                <StepCard
                  label="Step 4 · Status"
                  content={
                    result.executionResult?.error
                      ? `❌ ${result.executionResult.error}`
                      : result.executionResult
                        ? '✅ Success'
                        : confirmPending ? '⏳ Pending' : '—'
                  }
                  color={result.executionResult?.error ? '#f87171' : '#34d399'}
                />
              </div>

              {/* Code output */}
              {result.executionResult?.code && (
                <div style={{ marginTop: '8px' }}>
                  <div style={styles.sectionLabel}>
                    Generated Code · {result.executionResult.language}
                    {result.executionResult.filename && (
                      <span style={{ marginLeft: '8px', color: '#334155' }}>→ {result.executionResult.filename}</span>
                    )}
                  </div>
                  <CodePreview
                    code={result.executionResult.code}
                    language={result.executionResult.language}
                    filename={result.executionResult.filename}
                  />
                  {result.executionResult.filename && (
                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                      <button
                        style={{ ...styles.btnDownload, fontSize: '12px', padding: '7px 14px' }}
                        onClick={() => downloadOutputFile(result.executionResult.filename)}
                      >
                        ⬇ Download {result.executionResult.filename}
                      </button>
                      <button
                        style={{ ...styles.btnDelete, fontSize: '12px', padding: '7px 14px' }}
                        onClick={() => deleteOutputFile(result.executionResult.filename)}
                      >
                        🗑 Delete {result.executionResult.filename}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Summary output */}
              {result.executionResult?.action === 'summarize' && result.executionResult?.output && (
                <div style={{ marginTop: '8px' }}>
                  <div style={styles.sectionLabel}>📝 Summary</div>
                  <div style={styles.summaryBox}>{result.executionResult.output}</div>
                </div>
              )}

              {/* Chat output */}
              {result.executionResult?.action === 'chat' && result.executionResult?.output && (
                <div style={{ marginTop: '8px' }}>
                  <div style={styles.sectionLabel}>💬 Response</div>
                  <div style={styles.chatBox}>{result.executionResult.output}</div>
                </div>
              )}

              {/* Created file download + delete */}
              {result.executionResult?.action === 'create_file' && result.executionResult?.filename && !result.executionResult?.error && (
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                  <button
                    style={{ ...styles.btnDownload, fontSize: '12px', padding: '7px 14px' }}
                    onClick={() => downloadOutputFile(result.executionResult.filename)}
                  >
                    ⬇ Download {result.executionResult.filename}
                  </button>
                  <button
                    style={{ ...styles.btnDelete, fontSize: '12px', padding: '7px 14px' }}
                    onClick={() => deleteOutputFile(result.executionResult.filename)}
                  >
                    🗑 Delete {result.executionResult.filename}
                  </button>
                </div>
              )}

              {/* Regenerate button */}
              {['chat', 'summarize', 'write_code'].includes(intent)
                && result.executionResult
                && !result.executionResult.error
                && !confirmPending && (
                <div style={{ marginTop: '16px' }}>
                  <button
                    style={styles.btnRegen}
                    onClick={() => doExecute(result.text, result.intentData, true)}
                    disabled={loading}
                  >
                    🔄 Regenerate
                  </button>
                </div>
              )}

            </>
          )}
        </div>
      </div>
    </div>
  )
}