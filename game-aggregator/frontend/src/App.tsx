import { Route, Routes } from 'react-router-dom'
import Shell from './components/Shell'
import Launchpad from './pages/Launchpad'
import ListReport from './pages/ListReport'
import ObjectPage from './pages/ObjectPage'
import Docs from './pages/Docs'
import Login from './pages/Login'
import Games from './pages/Games'
import GamePage from './pages/GamePage'
import Players from './pages/Players'
import PlayerPage from './pages/PlayerPage'
import Play from './pages/Play'

export default function App() {
  return (
    <Routes>
      <Route path="/play/:token" element={<Play />} />
      <Route element={<Shell />}>
        <Route path="/login" element={<Login />} />
        <Route index element={<Launchpad />} />
        <Route path="/documentation" element={<Docs />} />
        <Route path="/m/catalog" element={<Games />} />
        <Route path="/m/catalog/:id" element={<GamePage />} />
        <Route path="/m/players" element={<Players />} />
        <Route path="/m/players/:id" element={<PlayerPage />} />
        <Route path="/m/:module" element={<ListReport />} />
        <Route path="/m/:module/:id" element={<ObjectPage />} />
      </Route>
    </Routes>
  )
}
