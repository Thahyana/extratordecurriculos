
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { extractResumeData } from './lib/gemini'
import { extractTextFromPDF } from './lib/pdf-utils'
import { Sun, Moon, Upload, FileText, Loader2, Trash2, AlertCircle, X } from 'lucide-react'

function App() {
  const [theme, setTheme] = useState('light')
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [candidates, setCandidates] = useState([])
  const [selectedCandidates, setSelectedCandidates] = useState([])
  const [geminiKey] = useState(import.meta.env.VITE_GEMINI_API_KEY || '')
  const [error, setError] = useState(null)
  const [currentProgress, setCurrentProgress] = useState({ current: 0, total: 0 })

  useEffect(() => {
    // Theme setup
    const savedTheme = localStorage.getItem('theme') || 'light'
    setTheme(savedTheme)
    document.documentElement.classList.toggle('dark', savedTheme === 'dark')

    fetchCandidates()
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
  }

  const fetchCandidates = async () => {
    try {
      const { data, error } = await supabase
        .from('candidatos')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setCandidates(data || [])
    } catch (err) {
      console.error('Error fetching candidates:', err)
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)

      if (files.length + newFiles.length > 100) {
        setError('O limite máximo é de 100 currículos por vez.')
        return
      }

      setFiles(prev => [...prev, ...newFiles])
      setError(null)
    }
  }

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleProcess = async () => {
    if (files.length === 0) return
    if (!geminiKey) {
      setError('Por favor, configure a chave da API Gemini no arquivo .env.')
      return
    }

    setLoading(true)
    setError(null)
    setCurrentProgress({ current: 0, total: files.length })

    const processedCandidates = []

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        setCurrentProgress(prev => ({ ...prev, current: i + 1 }))

        try {
          // 1. Extract Text
          let text = ""
          if (file.type === 'application/pdf') {
            text = await extractTextFromPDF(file)
          } else {
            text = await file.text()
          }

          if (!text.trim()) continue

          // 2. Extract Data with Gemini
          const extractedData = await extractResumeData(text, geminiKey)

          // 3. Save to Supabase
          const hasSupabase = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY

          if (hasSupabase) {
            const { data, error: dbError } = await supabase
              .from('candidatos')
              .insert([{
                nome: extractedData.nome,
                email: extractedData.email,
                telefone: extractedData.telefone
              }])
              .select()

            if (!dbError && data) {
              processedCandidates.push(data[0])
            }
          } else {
            processedCandidates.push({
              id: `temp-${Date.now()}-${i}`,
              created_at: new Date().toISOString(),
              nome: extractedData.nome,
              email: extractedData.email,
              telefone: extractedData.telefone
            })
          }
        } catch (fileErr) {
          console.error(`Erro ao processar arquivo ${file.name}:`, fileErr)
          // Continua para o próximo arquivo mesmo em caso de erro individual
        }
      }

      // 4. Update UI
      setCandidates(prev => [...processedCandidates, ...prev])
      setFiles([])
      document.getElementById('file-upload').value = ''

    } catch (err) {
      console.error(err)
      setError(err.message || 'Ocorreu um erro ao processar os currículos.')
    } finally {
      setLoading(false)
      setCurrentProgress({ current: 0, total: 0 })
    }
  }

  const handleDelete = async (id) => {
    const { error } = await supabase.from('candidatos').delete().match({ id })
    if (!error) {
      setCandidates(candidates.filter(c => c.id !== id))
    }
  }

  const toggleSelectCandidate = (id) => {
    setSelectedCandidates(prev =>
      prev.includes(id)
        ? prev.filter(cId => cId !== id)
        : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedCandidates.length === candidates.length) {
      setSelectedCandidates([])
    } else {
      setSelectedCandidates(candidates.map(c => c.id))
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedCandidates.length === 0) return

    const { error } = await supabase
      .from('candidatos')
      .delete()
      .in('id', selectedCandidates)

    if (!error) {
      setCandidates(candidates.filter(c => !selectedCandidates.includes(c.id)))
      setSelectedCandidates([])
    }
  }


  return (
    <div className="min-h-screen p-6 transition-colors duration-300">
      <div className="container">
        {/* Header */}
        <header className="flex items-center justify-between mb-10">
          <div>
            <h1 className="title">Extrator de Currículos</h1>
          </div>
          <div className="flex gap-3">
            <label className="theme-switch" title="Alternar Tema">
              <input
                type="checkbox"
                checked={theme === 'dark'}
                onChange={toggleTheme}
              />
              <span className="switch-track">
                <span className="switch-thumb">
                  {theme === 'light' ? <Sun size={14} className="switch-icon" /> : <Moon size={14} className="switch-icon" />}
                </span>
              </span>
            </label>
          </div>
        </header>

        {/* Upload Area */}
        <div className={`card upload-area ${loading ? 'loading' : ''}`}>
          <input
            id="file-upload"
            type="file"
            accept=".pdf,.txt"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />

          {files.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
              <div className="upload-icon">
                <Upload size={32} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <h3 className="text-xl font-semibold mb-2">Upload de Currículos</h3>
                <p className="text-muted mb-4">Selecione até 100 arquivos PDF para processar</p>
              </div>
              <label htmlFor="file-upload" className="btn btn-primary cursor-pointer" style={{ fontSize: '1rem', padding: '1rem 2.5rem' }}>
                <Upload size={20} />
                Escolher Arquivos
              </label>
            </div>
          ) : (
            <div className="flex flex-col gap-6 fade-in">
              <div className="files-grid">
                {files.map((f, index) => (
                  <div key={index} className="file-item">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FileText size={18} className="file-icon shrink-0" />
                      <span className="truncate text-sm font-medium">{f.name}</span>
                    </div>
                    {!loading && (
                      <button
                        onClick={() => removeFile(index)}
                        className="remove-file-btn"
                        title="Remover"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex flex-col items-center gap-4 mt-2">
                <button
                  onClick={handleProcess}
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ fontSize: '1.125rem', padding: '1.25rem 3.5rem', width: '100%', maxWidth: '400px' }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Processando {currentProgress.current}/{currentProgress.total}...
                    </>
                  ) : (
                    `Processar ${files.length} Currículo${files.length > 1 ? 's' : ''}`
                  )}
                </button>

                {!loading && (
                  <button
                    onClick={() => {
                      setFiles([]);
                      document.getElementById('file-upload').value = '';
                    }}
                    className="text-muted hover:text-error transition-colors text-sm font-medium"
                  >
                    Limpar Seleção
                  </button>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="alert alert-error">
              <AlertCircle size={16} /> {error}
            </div>
          )}
        </div>

        {/* Results Table */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 className="text-xl font-bold">Candidatos Processados</h3>
            {selectedCandidates.length > 0 && (
              <button
                onClick={handleDeleteSelected}
                className="btn btn-outline"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--error)' }}
              >
                <Trash2 size={18} />
                Excluir Selecionados ({selectedCandidates.length})
              </button>
            )}
          </div>
          <div className="card table-container p-0 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr>
                  <th style={{ width: '50px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={candidates.length > 0 && selectedCandidates.length === candidates.length}
                      onChange={toggleSelectAll}
                      style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                    />
                  </th>
                  <th className="text-left">Nome</th>
                  <th className="text-left">Email</th>
                  <th className="text-left">Telefone</th>
                </tr>
              </thead>
              <tbody>
                {candidates.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-muted">
                      Nenhum candidato processado ainda.
                    </td>
                  </tr>
                ) : (
                  candidates.map((c) => (
                    <tr key={c.id}>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={selectedCandidates.includes(c.id)}
                          onChange={() => toggleSelectCandidate(c.id)}
                          style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                        />
                      </td>
                      <td>{c.nome}</td>
                      <td>{c.email}</td>
                      <td>{c.telefone}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}

export default App
