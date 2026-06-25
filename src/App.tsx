import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { AppRouter } from '@/router/AppRouter'
import { Toaster } from 'sonner'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
        {/* Notificações toast globais */}
        <Toaster
          position="top-right"
          richColors
          toastOptions={{
            style: {
              fontSize: '16px',
              padding: '16px 20px',
              borderRadius: '12px',
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  )
}
