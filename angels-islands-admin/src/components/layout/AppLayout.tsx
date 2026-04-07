import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar'

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-[#f8f9fc]">
      <header className="fixed top-0 left-0 right-0 z-40 flex items-center h-12 px-4 bg-[#0f1117] md:hidden">
        <button onClick={() => setSidebarOpen(true)} className="text-white p-1">
          <Menu size={20} />
        </button>
        <span className="ml-3 text-white font-semibold text-sm tracking-wide">Angels Islands</span>
      </header>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 overflow-auto pt-12 md:pt-0">
        <Outlet />
      </main>
    </div>
  )
}
