import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Lock, Mail, User, Phone } from 'lucide-react'

const registerSchema = z.object({
    username: z.string().min(1, 'Name is required').max(100),
    email: z.string().email('Please enter a valid email address'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Must contain an uppercase letter')
        .regex(/[a-z]/, 'Must contain a lowercase letter')
        .regex(/[0-9]/, 'Must contain a number')
        .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Must contain a special character'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    phone: z.string().regex(/^\+?[\d\s\-()]{7,20}$/, 'Invalid phone number').optional().or(z.literal('')),
}).refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
})

const heroImage = 'https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1400&q=80'

export default function RegisterPage() {
    const { login } = useAuth()
    const navigate = useNavigate()
    const [showPass, setShowPass] = useState(false)
    const [loading, setLoading] = useState(false)

    const {
        register: reg,
        handleSubmit,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(registerSchema),
    })

    const onSubmit = async (data) => {
        setLoading(true)
        try {
            const res = await api.post('/auth/register', {
                username: data.username,
                email: data.email,
                password: data.password,
                phone: data.phone || null,
            })
            login(res.data.user)
            toast.success('Account created successfully!')
            navigate('/user/dashboard', { replace: true })
        } catch (err) {
            const msg = err.response?.data?.message || 'Registration failed. Please try again.'
            toast.error(msg)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-white">
            <div className="grid min-h-screen lg:grid-cols-2">
                <section
                    className="relative hidden overflow-hidden lg:block"
                    style={{
                        backgroundImage: `linear-gradient(180deg, rgba(15, 23, 42, 0.08), rgba(15, 23, 42, 0.62)), url(${heroImage})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }}
                >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.24),transparent_34%)]" />
                    <div className="relative flex h-full flex-col justify-between p-10 xl:p-14">
                        <div className="inline-flex w-fit items-center rounded-full border border-white/35 bg-white/12 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/92 backdrop-blur-md">
                            Hotel Management System
                        </div>

                        <div className="max-w-xl">
                            <h1 className="max-w-lg text-5xl font-bold leading-[1.02] tracking-[-0.04em] text-white xl:text-[4.25rem]">
                                Book your perfect stay</h1>
                            <p className="mt-5 max-w-md text-base leading-7 text-white/82 xl:text-[17px]">
                                Create an account to browse rooms and book your next luxury experience.
                            </p>

                            <div className="mt-8 grid max-w-lg grid-cols-3 gap-3">
                                {[
                                    { label: 'Suites', value: '48+' },
                                    { label: 'Cities', value: '12' },
                                    { label: 'Guest score', value: '4.9' },
                                ].map((item) => (
                                    <div key={item.label} className="rounded-[22px] border border-white/18 bg-white/10 p-4 backdrop-blur-md">
                                        <p className="text-[1.65rem] font-semibold tracking-[-0.03em] text-white">{item.value}</p>
                                        <p className="mt-1 text-[11px] uppercase tracking-[0.24em] text-white/68">{item.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <section className="relative flex items-center justify-center overflow-hidden bg-[#FFFFFF] px-5 py-10 sm:px-8 lg:px-14 xl:px-20">
                    <div className="relative w-full max-w-xl">
                        <div className="mb-8 lg:hidden">
                            <div
                                className="overflow-hidden rounded-[24px]"
                                style={{
                                    backgroundImage: `linear-gradient(180deg, rgba(15, 23, 42, 0.08), rgba(15, 23, 42, 0.62)), url(${heroImage})`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                }}
                            >
                                <div className="p-6">
                                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/75">Luxury Collection</p>
                                    <h2 className="mt-3 text-3xl font-bold text-white">Create Your Account</h2>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6 rounded-[24px] border border-[#EEF2F7] bg-white p-7 shadow-[0_24px_70px_-58px_rgba(15,23,42,0.28)] sm:p-10">
                            <div className="space-y-5">
                                <div className="inline-flex items-center rounded-full border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.26em] text-[#2563EB]">
                                    New Guest | Create account
                                </div>
                                <h1 className="text-3xl font-bold tracking-[-0.04em] text-slate-900 sm:text-4xl">Create your account</h1>
                            </div>

                            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
                                <div>
                                    <label className="mb-2.5 block text-[11px] font-semibold uppercase tracking-[0.26em] text-[#64748B]">Full name</label>
                                    <div className="relative">
                                        <User size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            {...reg('username')}
                                            type="text"
                                            placeholder="John Doe"
                                            className={`w-full rounded-[16px] border border-[#E2E8F0] bg-white py-3.5 pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-4 focus:ring-slate-100 ${errors.username ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : ''}`}
                                        />
                                    </div>
                                    {errors.username && <p className="mt-2 text-sm text-red-500">{errors.username.message}</p>}
                                </div>

                                <div>
                                    <label className="mb-2.5 block text-[11px] font-semibold uppercase tracking-[0.26em] text-[#64748B]">Email address</label>
                                    <div className="relative">
                                        <Mail size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            {...reg('email')}
                                            type="email"
                                            autoComplete="email"
                                            placeholder="example@gmail.com"
                                            className={`w-full rounded-[16px] border border-[#E2E8F0] bg-white py-3.5 pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-4 focus:ring-slate-100 ${errors.email ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : ''}`}
                                        />
                                    </div>
                                    {errors.email && <p className="mt-2 text-sm text-red-500">{errors.email.message}</p>}
                                </div>

                                <div>
                                    <label className="mb-2.5 block text-[11px] font-semibold uppercase tracking-[0.26em] text-[#64748B]">Phone number</label>
                                    <div className="relative">
                                        <Phone size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            {...reg('phone')}
                                            type="tel"
                                            placeholder="+91 98765 43210"
                                            className={`w-full rounded-[16px] border border-[#E2E8F0] bg-white py-3.5 pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-4 focus:ring-slate-100 ${errors.phone ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : ''}`}
                                        />
                                    </div>
                                    {errors.phone && <p className="mt-2 text-sm text-red-500">{errors.phone.message}</p>}
                                </div>

                                <div>
                                    <label className="mb-2.5 block text-[11px] font-semibold uppercase tracking-[0.26em] text-[#64748B]">Password</label>
                                    <div className="relative">
                                        <Lock size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            {...reg('password')}
                                            type={showPass ? 'text' : 'password'}
                                            placeholder="Min 8 chars, upper, lower, number, special"
                                            className={`w-full rounded-[16px] border border-[#E2E8F0] bg-white py-3.5 pl-12 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-4 focus:ring-slate-100 ${errors.password ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : ''}`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPass((v) => !v)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-900"
                                        >
                                            {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                    {errors.password && <p className="mt-2 text-sm text-red-500">{errors.password.message}</p>}
                                </div>

                                <div>
                                    <label className="mb-2.5 block text-[11px] font-semibold uppercase tracking-[0.26em] text-[#64748B]">Confirm password</label>
                                    <div className="relative">
                                        <Lock size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            {...reg('confirmPassword')}
                                            type="password"
                                            placeholder="Re-enter your password"
                                            className={`w-full rounded-[16px] border border-[#E2E8F0] bg-white py-3.5 pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-4 focus:ring-slate-100 ${errors.confirmPassword ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : ''}`}
                                        />
                                    </div>
                                    {errors.confirmPassword && <p className="mt-2 text-sm text-red-500">{errors.confirmPassword.message}</p>}
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-[14px] bg-black px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {loading ? (
                                        <>
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                            Creating account...
                                        </>
                                    ) : 'Create account'}
                                </button>
                            </form>

                            <p className="text-center text-sm text-slate-500">
                                Already have an account?{' '}
                                <Link to="/login" className="font-semibold text-slate-900 hover:text-primary-600 transition-colors">Sign in</Link>
                            </p>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    )
}
