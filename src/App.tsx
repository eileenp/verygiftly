import { Routes, Route } from 'react-router'
import Home from './pages/Home'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ListManage from './pages/ListManage'
import ListView from './pages/ListView'
import ListAccess from './pages/ListAccess'
import PeopleAccess from './pages/PeopleAccess'
import Settings from './pages/Settings'
import Privacy from './pages/Privacy'
import Unclaim from './pages/Unclaim'
import MarkPurchased from './pages/MarkPurchased'
import ContributionManage from './pages/ContributionManage'
import MasterList from './pages/MasterList'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/dashboard/items" element={<Dashboard tab="items" />} />
      <Route path="/lists/:id" element={<ListManage />} />
      <Route path="/lists/:id/people" element={<PeopleAccess />} />
      <Route path="/lists/:id/access" element={<ListAccess />} />
      <Route path="/lists/:id/view" element={<ListView />} />
      <Route path="/master" element={<MasterList />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/claim/:claimId" element={<Unclaim />} />
      <Route path="/purchased/:claimId" element={<MarkPurchased />} />
      <Route path="/contribution/:contributionId" element={<ContributionManage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
