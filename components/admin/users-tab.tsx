"use client"

import { Card } from "@/components/ui/card"
import { Users } from "lucide-react"
import { UserRow } from "./user-row"

type User = {
  id: number
  email: string
  is_admin: boolean
  email_verified: boolean
  created_at: string
  post_count: number
  copied_count: number
  banned_id: number | null
  ban_reason: string | null
  banned_at: string | null
}

type UsersTabProps = {
  users: User[]
  onBanUser: (userId: number, currentlyBanned: boolean) => Promise<void>
  onDeleteUser: (userId: number) => Promise<void>
  disabled: boolean
}

export function UsersTab({ users, onBanUser, onDeleteUser, disabled }: UsersTabProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5" />
        <h2 className="text-xl font-semibold">User Management</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-3 text-sm font-medium">Email</th>
              <th className="text-left p-3 text-sm font-medium">Posts</th>
              <th className="text-left p-3 text-sm font-medium">Copied</th>
              <th className="text-left p-3 text-sm font-medium">Status</th>
              <th className="text-left p-3 text-sm font-medium">Joined</th>
              <th className="text-right p-3 text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <UserRow key={user.id} user={user} onBan={onBanUser} onDelete={onDeleteUser} disabled={disabled} />
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
