import { useAuth } from '../auth/AuthContext'
import MyRestaurantsPage from './MyRestaurantsPage'
import RestaurantListPage from './RestaurantListPage'

// Each role has its own home page at "/".
export default function HomePage() {
  const { user } = useAuth()
  return user?.role === 'Owner' ? <MyRestaurantsPage /> : <RestaurantListPage />
}
