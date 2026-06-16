import { Routes, Route } from 'react-router-dom'
import Home from './views/Home.jsx'
import Cashier from './views/Cashier.jsx'
import Pickup from './views/Pickup.jsx'
import Kitchen from './views/Kitchen.jsx'
import Reports from './views/Reports.jsx'
import Menu from './views/Menu.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/cashier" element={<Cashier />} />
      <Route path="/pickup" element={<Pickup />} />
      <Route path="/kitchen" element={<Kitchen />} />
      <Route path="/menu" element={<Menu />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="*" element={<Home />} />
    </Routes>
  )
}
