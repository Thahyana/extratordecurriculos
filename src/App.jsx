
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { extractResumeData } from './lib/gemini'
import { extractTextFromPDF } from './lib/pdf-utils'
import { Sun, Moon, Upload, FileText, Loader2, Trash2, AlertCircle, X } from 'lucide-react'

function App() {
  const [theme, setTheme] = useState('light')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [candidates, setCandidates] = useState([])
  const [selectedCandidates, setSelectedCandidates] = useState([])
  const [openaiKey, setOpenaiKey] = useState('') // Actually using Gemini, but standard naming for "AI Key" sometimes, let's stick to Gemini
  const [geminiKey] = useState(import.meta.env.VITE_GEMINI_API_KEY || '')
  const [error, setError] = useState(null)

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
      // Don't block UI, just log. 
      // Maybe table doesn't exist yet.
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setError(null)
    }
  }

  const handleProcess = async () => {
    if (!file) return
    if (!geminiKey) {
      if (!geminiKey) {
        setError('Por favor, configure a chave da API Gemini no arquivo .env.')
        return
      }
    }

    setLoading(true)
    setError(null)

    try {
      // 1. Extract Text
      let text = ""
      if (file.type === 'application/pdf') {
        text = await extractTextFromPDF(file)
      } else {
        // Fallback for text files
        text = await file.text()
      }

      if (!text.trim()) {
        throw new Error('Não foi possível extrair texto do arquivo.')
      }

      // 2. Extract Data with Gemini
      const extractedData = await extractResumeData(text, geminiKey)

      // 3. Save to Supabase (or fallback to local state if not configured)
      let newCandidate = null

      const hasSupabase = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY

      if (!hasSupabase) {
        console.warn('Supabase não configurado. Executando em modo offline (apenas visualização).')
        newCandidate = {
          id: `temp-${Date.now()}`,
          created_at: new Date().toISOString(),
          nome: extractedData.nome,
          email: extractedData.email,
          telefone: extractedData.telefone
        }
      } else {

        try {
          const { data, error: dbError } = await supabase
            .from('candidatos')
            .insert([
              {
                nome: extractedData.nome,
                email: extractedData.email,
                telefone: extractedData.telefone
              }
            ])
            .select()

          if (dbError) throw dbError
          newCandidate = data[0]
        } catch (dbErr) {
          console.error("Falha ao salvar no Supabase (ignorando e usando modo local):", dbErr)
          // Fallback if Supabase call fails completely (e.g. client misconfiguration)
          newCandidate = {
            id: `local-error-${Date.now()}`,
            created_at: new Date().toISOString(),
            nome: extractedData.nome,
            email: extractedData.email,
            telefone: extractedData.telefone
          }
        }
      }

      // 4. Update UI
      if (newCandidate) {
        setCandidates([newCandidate, ...candidates])
      }
      setFile(null)
      // Reset file input manually if needed
      document.getElementById('file-upload').value = ''

    } catch (err) {
      console.error(err)
      setError(err.message || 'Ocorreu um erro ao processar o currículo.')
    } finally {
      setLoading(false)
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
            onChange={handleFileChange}
            className="hidden"
          />

          {!file ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
              <div className="upload-icon">
                <Upload size={32} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <h3 className="text-xl font-semibold mb-2">Upload do Currículo</h3>
                <p className="text-muted mb-4">Selecione um arquivo PDF para processar</p>
              </div>
              <label htmlFor="file-upload" className="btn btn-primary cursor-pointer" style={{ fontSize: '1rem', padding: '1rem 2.5rem' }}>
                <Upload size={20} />
                Escolher Arquivo
              </label>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 fade-in">
              <div className="file-preview" style={{ position: 'relative', paddingRight: '2.5rem' }}>
                <FileText size={20} className="file-icon" />
                <span className="font-medium">{file.name}</span>
                <button
                  onClick={() => {
                    setFile(null);
                    setError(null);
                    document.getElementById('file-upload').value = '';
                  }}
                  className="btn-outline"
                  style={{
                    position: 'absolute',
                    right: '0.5rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    padding: '0.375rem',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)'
                  }}
                  title="Remover arquivo"
                >
                  <X size={16} />
                </button>
              </div>
              <button onClick={handleProcess} disabled={loading} className="btn btn-primary" style={{ fontSize: '1.125rem', padding: '1.25rem 3rem' }}>
                {loading ? <><Loader2 className="animate-spin" /> Processando...</> : 'Processar Extração'}
              </button>
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
