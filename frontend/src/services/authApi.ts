import type { Member, MemberPayload } from '@/types/api'
import { getData, patchData, postData, putData } from './api/apiClient'
import { ENDPOINTS } from './api/endpoints'

export interface RegisterRequest {
  firstName: string
  lastName: string
  email: string
  phone?: string
  password: string
  confirmPassword?: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface ProfileUpdateRequest {
  firstName?: string
  lastName?: string
  /** `null` removes the phone number. */
  phone?: string | null
}

/** Customer authentication & profile — backend/src/routes/auth.routes.ts, member.routes.ts */
export const authApi = {
  async register(body: RegisterRequest): Promise<Member> {
    return (await postData<MemberPayload>(ENDPOINTS.auth.register, body)).member
  },
  async login(body: LoginRequest): Promise<Member> {
    return (await postData<MemberPayload>(ENDPOINTS.auth.login, body)).member
  },
  async logout(): Promise<void> {
    await postData<null>(ENDPOINTS.auth.logout)
  },
  async me(): Promise<Member> {
    return (await getData<MemberPayload>(ENDPOINTS.auth.me)).member
  },
  async forgotPassword(email: string): Promise<void> {
    await postData<null>(ENDPOINTS.auth.forgotPassword, { email })
  },
  async resetPassword(token: string, password: string): Promise<void> {
    await postData<null>(ENDPOINTS.auth.resetPassword, { token, password })
  },
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await patchData<null>(ENDPOINTS.auth.changePassword, { currentPassword, newPassword })
  },
  async updateProfile(body: ProfileUpdateRequest): Promise<Member> {
    return (await patchData<MemberPayload>(ENDPOINTS.members.me, body)).member
  },
  async uploadAvatar(file: File): Promise<Member> {
    const form = new FormData()
    form.append('avatar', file)
    return (await putData<MemberPayload>(ENDPOINTS.members.avatar, form)).member
  },
}
