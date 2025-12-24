# Extrator de Currículos com IA

Projeto desafio do curso de Full Stack.

Este projeto extrai dados de currículos (PDF) usando a IA do Google Gemini e salva no Supabase.

## Configuração

1. **Renomeie** o arquivo `.env.example` para `.env` (ou crie um novo).
2. Adicione suas chaves:
   - `VITE_SUPABASE_URL`: Sua URL do projeto Supabase.
   - `VITE_SUPABASE_ANON_KEY`: Sua chave pública (anon) do Supabase.
   - `VITE_GEMINI_API_KEY`: Sua chave de API do Google Gemini AI.

3. **Crie a tabela no Supabase** se ainda não existir. Vá ao SQL Editor do Supabase e rode:

```sql
create table if not exists candidatos (
  id uuid default gen_random_uuid() primary key,
  nome text,
  email text,
  telefone text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

## Rodando o Projeto

1. Instale as dependências com:
   ```bash
   npm install
   ```

2. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

3. Acesse `http://localhost:5173`.
