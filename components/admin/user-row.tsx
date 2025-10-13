"use client"

import { Button } from "@/components/ui/button"
import { Ban, UserX, Trash2 } from "lucide-react"

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

type UserRowProps = {
  user: User
  onBan: (userId: number, currentlyBanned: boolean) => Promise<void>
  onDelete: (userId: number) => Promise<void>
  disabled: boolean
}

export function UserRow({ user, onBan, onDelete, disabled }: UserRowProps) {
  return (
    <tr className="border-b border-border hover:bg-muted/50">
      <td className="p-3">
        <div>
          <p className="text-sm font-medium">{user.email}</p>
          {user.is_admin ? (
            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">Admin</span>
          ) : (
            <span className="text-xs bg-muted text-foreground/70 px-2 py-0.5 rounded">User</span>
          )}
        </div>
      </td>
      <td className="p-3 text-sm">{user.post_count}</td>
      <td className="p-3 text-sm">{user.copied_count}</td>
      <td className="p-3">
        {user.banned_id ? (
          <span className="text-xs bg-destructive/20 text-destructive px-2 py-1 rounded">Banned</span>
        ) : (
          <span className="text-xs bg-green-500/20 text-green-600 px-2 py-1 rounded">Active</span>
        )}
      </td>
      <td className="p-3 text-sm text-muted-foreground">{new Date(user.created_at).toLocaleDateString()}</td>
      <td className="p-3">
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onBan(user.id, !!user.banned_id)}
            disabled={user.is_admin || disabled}
          >
            {user.banned_id ? (
              <>
                <UserX className="w-4 h-4 mr-1" />
                Unban
              </>
            ) : (
              <>
                <Ban className="w-4 h-4 mr-1" />
                Ban
              </>
            )}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete(user.id)}
            disabled={user.is_admin || disabled}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </td>
    </tr>
  )
}
