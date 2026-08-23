import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/AppLayout'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import TrainingPage from './pages/TrainingPage'
import NutritionPage from './pages/NutritionPage'
import BodyPage from './pages/BodyPage'
import NutritionEntriesPage from './pages/NutritionEntriesPage'
import ProfilePage from './pages/ProfilePage'
import TrainingPlansPage from './pages/TrainingPlansPage'
import TrainingPlanEditPage from './pages/TrainingPlanEditPage'
import ExercisesPage from './pages/ExercisesPage'
import WorkoutSessionPage from './pages/WorkoutSessionPage'
import TrainingHistoryPage from './pages/TrainingHistoryPage'
import TrainingHistoryDetailPage from './pages/TrainingHistoryDetailPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout>
                <Outlet />
              </AppLayout>
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<HomePage />} />
          <Route path="/training" element={<TrainingPage />} />
          <Route path="/training/plans" element={<TrainingPlansPage />} />
          <Route path="/training/plans/:planId" element={<TrainingPlanEditPage />} />
          <Route path="/training/exercises" element={<ExercisesPage />} />
          <Route path="/training/session/:sessionId" element={<WorkoutSessionPage />} />
          <Route path="/training/history" element={<TrainingHistoryPage />} />
          <Route path="/training/history/:sessionId" element={<TrainingHistoryDetailPage />} />
          <Route path="/nutrition" element={<NutritionPage />} />
          <Route path="/nutrition/entries" element={<NutritionEntriesPage />} />
          <Route path="/body" element={<BodyPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
