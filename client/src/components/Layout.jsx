import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
    LayoutDashboard,
    BedDouble,
    CalendarCheck,
    PlusCircle,
    LifeBuoy,
    LogOut,
    Hotel,
    User,
    Shield,
} from 'lucide-react'

function buildNavItems(isAdmin) {
    const items = [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/rooms', label: 'Rooms', icon: BedDouble },
        { to: '/bookings', label: 'Bookings', icon: CalendarCheck },
        { to: '/bookings/new', label: 'New Booking', icon: PlusCircle },
    ]

    if (isAdmin) {
        items.push({ to: '/support', label: 'Guest Support', icon: LifeBuoy })
    }

    return items
}

function matchesPath(currentPath, targetPath) {
    if (targetPath === '/dashboard') {
        return currentPath === targetPath
    }

    return currentPath === targetPath || currentPath.startsWith(`${targetPath}/`)
}

export default function Layout() {
    const { user, logout, isAdmin } = useAuth()
    const location = useLocation()
    const navItems = buildNavItems(isAdmin)
    const activeItem = navItems.find((item) => matchesPath(location.pathname, item.to)) || navItems[0]

    return (
        <div className="min-h-screen bg-hotel-canvas text-slate-900">
            <div className="mx-auto min-h-screen max-w-[1680px] lg:grid lg:grid-cols-[320px_minmax(0,1fr)]">
                <aside className="hidden border-r border-hotel-line bg-white lg:flex lg:min-h-screen lg:flex-col">
                    <div className="px-8 pb-8 pt-10">
                        <div className="flex items-center gap-4">
                            <div className="relative flex h-16 w-16 items-center justify-center rounded-[22px] bg-slate-950 shadow-float">
                                <Hotel size={24} className="text-white" />
                                <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white bg-primary-500" />
                            </div>
                            <div>
                                <h1 className="text-xl font-extrabold tracking-[-0.03em] text-slate-900"> Hotel Management</h1>
                                <p className="mt-1 text-sm text-slate-500">to manage bookings easily</p>
                            </div>
                        </div>
                    </div>

                    <nav className="flex-1 space-y-3 px-6 pb-8">
                        {navItems.map(({ to, label, icon: Icon }) => {
                            const isActive = matchesPath(location.pathname, to)

                            return (
                                <NavLink
                                    key={to}
                                    to={to}
                                    className={`group flex items-center gap-4 rounded-[24px] px-4 py-4 transition-all duration-200 ${isActive
                                        ? 'bg-primary-50 text-primary-700 shadow-[0_18px_30px_-26px_rgba(37,99,235,0.45)]'
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                        }`}
                                >
                                    <span className={`flex h-12 w-12 items-center justify-center rounded-[18px] transition-colors ${isActive ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-900 group-hover:text-white'}`}>
                                        <Icon size={18} />
                                    </span>
                                    <span className="text-base font-semibold text-inherit">{label}</span>
                                </NavLink>
                            )
                        })}
                    </nav>

                    <div className="mt-auto border-t border-hotel-line px-8 py-8">
                        <div className="rounded-[24px] bg-slate-50 p-5">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-white text-slate-900 shadow-panel">
                                    {isAdmin ? <Shield size={18} /> : <User size={18} />}
                                </div>
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-slate-900">{user?.username}</p>
                                    <p className="mt-1 text-sm text-slate-500">{user?.role === 'admin' ? 'A D M I N I S T R A T O R' : user?.role}</p>
                                </div>
                            </div>
                            <button onClick={logout} className="btn-secondary mt-5 w-full justify-center">
                                <LogOut size={16} />
                                Sign out
                            </button>
                        </div>
                    </div>
                </aside>

                <div className="flex min-h-screen flex-col">
                    <header className="sticky top-0 z-30 border-b border-hotel-line bg-white/95 backdrop-blur lg:hidden">
                        <div className="px-4 py-4 sm:px-6">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-panel">
                                        <Hotel size={18} />
                                        <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-primary-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">Hotel</p>
                                        <p className="mt-1 text-xs text-slate-500">{activeItem.label}</p>
                                    </div>
                                </div>
                                <button onClick={logout} className="btn-secondary px-3 py-2 text-xs">
                                    <LogOut size={14} />
                                    Sign out
                                </button>
                            </div>

                            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                                {navItems.map(({ to, label, icon: Icon }) => {
                                    const isActive = matchesPath(location.pathname, to)

                                    return (
                                        <NavLink
                                            key={to}
                                            to={to}
                                            className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${isActive
                                                ? 'bg-primary-50 text-primary-700'
                                                : 'bg-slate-50 text-slate-600'
                                                }`}
                                        >
                                            <Icon size={15} />
                                            {label}
                                        </NavLink>
                                    )
                                })}
                            </div>
                        </div>
                    </header>

                    <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
                        <Outlet />
                    </main>
                </div>
            </div>
        </div>
    )
}

