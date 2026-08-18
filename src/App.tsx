import { BrowserRouter, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/AppLayout'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import TrainingPage from './pages/TrainingPage'
import NutritionPage from './pages/NutritionPage'
import BodyPage from './pages/BodyPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout>
                <HomePage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/training"
          element={
            <ProtectedRoute>
              <AppLayout>
                <TrainingPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/nutrition"
          element={
            <ProtectedRoute>
              <AppLayout>
                <NutritionPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/body"
          element={
            <ProtectedRoute>
              <AppLayout>
                <BodyPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
