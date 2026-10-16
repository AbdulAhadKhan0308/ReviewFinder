import { useAuth } from '../auth/AuthContext'
import MyRestaurantsPage from './MyRestaurantsPage'
import ReviewerHomePage from './ReviewerHomePage'

// Each role has its own home page at "/".
export default function HomePage() {
  const { user } = useAuth()
  return user?.role === 'Owner' ? <MyRestaurantsPage /> : <ReviewerHomePage />
}
