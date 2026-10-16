import { Route, Routes } from 'react-router'
import { AuthProvider } from './auth/AuthProvider'
import { RequireAuth } from './auth/RequireAuth'
import { RequireRole } from './auth/RequireRole'
import { AppLayout } from './components/AppLayout'
import EditRestaurantPage from './pages/EditRestaurantPage'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import NewRestaurantPage from './pages/NewRestaurantPage'
import NotFoundPage from './pages/NotFoundPage'
import RegisterPage from './pages/RegisterPage'
import RestaurantDetailPage from './pages/RestaurantDetailPage'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route index element={<HomePage />} />
          <Route
            path="restaurants/new"
            element={
              <RequireRole role="Owner">
                <NewRestaurantPage />
              </RequireRole>
            }
          />
          <Route path="restaurants/:id" element={<RestaurantDetailPage />} />
          <Route
            path="restaurants/:id/edit"
            element={
              <RequireRole role="Owner">
                <EditRestaurantPage />
              </RequireRole>
            }
          />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  )
}
