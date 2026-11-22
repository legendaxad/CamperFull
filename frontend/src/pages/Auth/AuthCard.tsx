import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import googleIcon from '@/assets/icons/google.svg'
import kakaoIcon from '@/assets/icons/kakao.svg'
import naverIcon from '@/assets/icons/naver.svg'
import { useAppDispatch } from '@/app/hooks'
import { showToast } from '@/features/ui/uiSlice'

/** Centered auth card (Figma "sign in" / "registrate": 375px wide, 20px radius, hairline border). */
export function AuthCard({ title, children, closable = false }: { title: string; children: ReactNode; closable?: boolean }) {
  const navigate = useNavigate()
  return (
    <div className="flex min-h-[calc(100dvh-64px)] items-start justify-center px-4 py-10 sm:items-center lg:min-h-[calc(100dvh-90px)]">
      <div className="w-full max-w-[420px] animate-slide-up rounded-[20px] border border-[#ececec] bg-white px-6 py-8 shadow-card sm:px-8">
        <div className="flex items-start justify-between">
          <h1 className="text-[28px] font-bold text-ink">{title}</h1>
          {closable && (
            <button type="button" onClick={() => navigate(-1)} className="-mr-2 rounded-full p-2 hover:bg-black/5" aria-label="Close">
              <X className="size-5" />
            </button>
          )}
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  )
}

const PROVIDERS = [
  { name: 'Naver', icon: naverIcon, bg: '#039600', w: 21, h: 18 },
  { name: 'Google', icon: googleIcon, bg: '#BC0000', w: 22, h: 23 },
  { name: 'Kakao', icon: kakaoIcon, bg: '#FFC700', w: 32, h: 32 },
]

/** "OR" divider + Naver / Google / Kakao circles from the Figma sign-in frame. */
export function SocialLogin() {
  const dispatch = useAppDispatch()
  return (
    <div className="mt-6">
      <div className="flex items-center gap-4 px-8 text-xs font-medium text-muted">
        <span className="h-px flex-1 bg-ink/15" />
        OR
        <span className="h-px flex-1 bg-ink/15" />
      </div>
      <div className="mt-4 flex justify-center gap-3">
        {PROVIDERS.map((p) => (
          <button
            key={p.name}
            type="button"
            aria-label={`Continue with ${p.name}`}
            onClick={() => dispatch(showToast(`${p.name} sign-in is not available yet. Please use your email and password.`, 'info'))}
            className="flex size-[46px] items-center justify-center rounded-full transition hover:scale-105"
            style={{ backgroundColor: p.bg }}
          >
            <img src={p.icon} alt="" width={p.w} height={p.h} />
          </button>
        ))}
      </div>
    </div>
  )
}
