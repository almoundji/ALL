import { Route, Routes } from 'react-router-dom'
import Shell from './components/Shell'
import Launchpad from './pages/Launchpad'
import ListReport from './pages/ListReport'
import ObjectPage from './pages/ObjectPage'
import Docs from './pages/Docs'

export default function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Launchpad />} />
        <Route path="/documentation" element={<Docs />} />
        <Route path="/m/:module" element={<ListReport />} />
        <Route path="/m/:module/:id" element={<ObjectPage />} />
      </Route>
    </Routes>
  )
}
