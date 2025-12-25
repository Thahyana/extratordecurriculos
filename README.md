# 📄 Extrator de Currículos

Uma aplicação web moderna e inteligente para extrair dados de currículos em PDF utilizando IA (Google Gemini) e armazenar as informações em banco de dados (Supabase).

![React](https://img.shields.io/badge/React-19.2.0-61DAFB?style=flat&logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7.2.4-646CFF?style=flat&logo=vite&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-2.89.0-3ECF8E?style=flat&logo=supabase&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Google_Gemini-AI-4285F4?style=flat&logo=google&logoColor=white)

## ✨ Funcionalidades

- 📤 **Upload de Currículos**: Suporte para arquivos PDF
- 🤖 **Extração Inteligente**: Utiliza Google Gemini AI para extrair dados automaticamente
- 💾 **Armazenamento**: Salva informações no Supabase (PostgreSQL)
- 📊 **Visualização**: Tabela interativa com todos os candidatos processados
- 🗑️ **Gerenciamento**: Seleção múltipla e exclusão em lote de candidatos
- 🌓 **Tema Dark/Light**: Switch elegante para alternar entre temas
- 📱 **Responsivo**: Interface adaptável para diferentes tamanhos de tela
- ⚡ **Performance**: Construído com Vite para desenvolvimento rápido

## 🎯 Dados Extraídos

A aplicação extrai automaticamente as seguintes informações dos currículos:

- **Nome** do candidato
- **Email** de contato
- **Telefone** de contato

## 🚀 Tecnologias Utilizadas

### Frontend
- **React 19.2.0** - Biblioteca JavaScript para construção de interfaces
- **Vite 7.2.4** - Build tool e dev server ultrarrápido
- **Lucide React** - Ícones modernos e elegantes
- **CSS Vanilla** - Estilização customizada com variáveis CSS

### Backend & IA
- **Supabase** - Backend as a Service (PostgreSQL + API REST)
- **Google Gemini AI** - Modelo de IA para extração de dados
- **PDF.js** - Biblioteca para leitura de arquivos PDF

## 📋 Pré-requisitos

Antes de começar, você precisará ter instalado:

- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- [npm](https://www.npmjs.com/) ou [yarn](https://yarnpkg.com/)
- Uma conta no [Supabase](https://supabase.com/)
- Uma chave de API do [Google AI Studio](https://makersuite.google.com/app/apikey)

## 🔧 Instalação

1. **Clone o repositório**
```bash
git clone https://github.com/seu-usuario/extratordecurriculos.git
cd extratordecurriculos
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
# Google Gemini AI
VITE_GEMINI_API_KEY=sua_chave_gemini_aqui

# Supabase
VITE_SUPABASE_URL=sua_url_supabase_aqui
VITE_SUPABASE_ANON_KEY=sua_chave_anon_supabase_aqui
```

4. **Configure o banco de dados no Supabase**

Execute o seguinte SQL no editor SQL do Supabase:

```sql
-- Criar tabela de candidatos
CREATE TABLE candidatos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT
);

-- Criar índice para melhor performance
CREATE INDEX idx_candidatos_created_at ON candidatos(created_at DESC);

-- Habilitar Row Level Security (RLS)
ALTER TABLE candidatos ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir todas as operações (ajuste conforme necessário)
CREATE POLICY "Enable all operations for authenticated users" ON candidatos
  FOR ALL USING (true);
```

## 🎮 Como Usar

1. **Inicie o servidor de desenvolvimento**
```bash
npm run dev
```

2. **Acesse a aplicação**
Abra seu navegador em `http://localhost:5173`

3. **Processe currículos**
   - Clique em "Escolher Arquivo" e selecione um currículo em PDF
   - Clique em "Processar Extração"
   - Aguarde a IA extrair os dados
   - Visualize o candidato na tabela abaixo

4. **Gerencie candidatos**
   - Selecione candidatos usando os checkboxes
   - Clique em "Excluir Selecionados" para remover em lote

## 🏗️ Build para Produção

Para criar uma versão otimizada para produção:

```bash
npm run build
```

Os arquivos otimizados serão gerados na pasta `dist/`.

Para testar a build de produção localmente:

```bash
npm run preview
```

## 📁 Estrutura do Projeto

```
extratordecurriculos/
├── src/
│   ├── lib/
│   │   ├── gemini.js          # Integração com Google Gemini AI
│   │   ├── supabase.js        # Cliente Supabase
│   │   └── pdf-utils.js       # Utilitários para leitura de PDF
│   ├── App.jsx                # Componente principal
│   ├── main.jsx               # Ponto de entrada React
│   └── index.css              # Estilos globais
├── public/                    # Arquivos estáticos
├── .env                       # Variáveis de ambiente (não commitado)
├── .gitignore                 # Arquivos ignorados pelo Git
├── index.html                 # HTML principal
├── package.json               # Dependências e scripts
├── vite.config.js             # Configuração do Vite
└── README.md                  # Este arquivo
```

## 🔐 Segurança

⚠️ **IMPORTANTE**: 
- Nunca commite o arquivo `.env` com suas chaves de API
- O arquivo `.env` já está incluído no `.gitignore`
- Use variáveis de ambiente no seu serviço de hospedagem para produção
- Configure adequadamente as políticas RLS do Supabase para seu caso de uso

## 🎨 Personalização

### Temas
A aplicação suporta temas claro e escuro. As cores podem ser personalizadas editando as variáveis CSS em `src/index.css`:

```css
:root {
  --primary: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --primary-solid: #667eea;
  /* ... outras variáveis */
}
```

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para:

1. Fazer um Fork do projeto
2. Criar uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abrir um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 👤 Autor

Desenvolvido com ❤️ por [Seu Nome]

## 🙏 Agradecimentos

- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [Supabase](https://supabase.com/)
- [Google Gemini](https://ai.google.dev/)
- [Lucide Icons](https://lucide.dev/)
- [PDF.js](https://mozilla.github.io/pdf.js/)

---

⭐ Se este projeto foi útil para você, considere dar uma estrela no repositório!
