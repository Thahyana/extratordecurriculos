import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let supabaseClient

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase keys are missing. Please check your .env file.')
  // Fallback client to prevent app crash on load
  supabaseClient = {
    from: () => ({
      select: () => ({
        order: () => Promise.resolve({ data: [], error: { message: 'Supabase não configurado corretamente. Verifique as chaves de API.' } }),
        then: (resolve) => resolve({ data: [], error: { message: 'Supabase não configurado corretamente. Verifique as chaves de API.' } })
      }),
      insert: () => ({
        select: () => Promise.resolve({ data: [], error: { message: 'Supabase não configurado corretamente. Verifique as chaves de API.' } })
      }),
      delete: () => ({
        match: () => Promise.resolve({ error: { message: 'Supabase não configurado corretamente.' } }),
        in: () => Promise.resolve({ error: { message: 'Supabase não configurado corretamente.' } })
      })
    })
  }
} else {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
}

export const supabase = supabaseClient
