import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <AuthProvider>
                <App />
                <Toaster
                    position="top-right"
                    toastOptions={{
                        style: {
                            background: '#ffffff',
                            color: '#111827',
                            border: '1px solid #ece7f6',
                            borderRadius: '18px',
                            fontSize: '14px',
                            boxShadow: '0 24px 50px -34px rgba(15, 23, 42, 0.24)',
                        },
                        success: { iconTheme: { primary: '#16a34a', secondary: '#ffffff' } },
                        error: { iconTheme: { primary: '#dc2626', secondary: '#ffffff' } },
                        duration: 4000,
                    }}
                />
            </AuthProvider>
        </BrowserRouter>
    </React.StrictMode>,
)
