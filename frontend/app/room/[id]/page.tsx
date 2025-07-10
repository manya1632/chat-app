"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"

interface Message {
  id: string
  text: string
  sender: string
  timestamp: string
  emoji: string
}

interface Member {
  name: string
  emoji: string
  joinedAt: string
}

interface MemberActivity {
  name: string
  emoji: string
  action: "joined" | "left"
  timestamp: string
}

export default function RoomPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.id as string
  const [currentUser, setCurrentUser] = useState("")
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [memberHistory, setMemberHistory] = useState<MemberActivity[]>([])
  const [showMembers, setShowMembers] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const userEmojis = ["😀", "😎", "🤖", "🦄", "🐱", "🐶", "🦊", "🐼", "🦁", "🐸"]

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    const user = localStorage.getItem("currentUser")
    if (!user) {
      router.push("/")
      return
    }
    setCurrentUser(user)

    // Load room data
    const roomData = localStorage.getItem(`room_${roomId}`)
    if (!roomData) {
      router.push("/")
      return
    }

    const room = JSON.parse(roomData)
    setMessages(room.messages || [])
    setMembers(room.members || [])
    setMemberHistory(room.memberHistory || [])

    // Add user to room if not already present
    const userEmoji = userEmojis[Math.floor(Math.random() * userEmojis.length)]
    const existingMember = room.members?.find((m: Member) => m.name === user)

    if (!existingMember) {
      const newMember = {
        name: user,
        emoji: userEmoji,
        joinedAt: new Date().toISOString(),
      }

      const joinActivity = {
        name: user,
        emoji: userEmoji,
        action: "joined" as const,
        timestamp: new Date().toISOString(),
      }

      const updatedRoom = {
        ...room,
        members: [...(room.members || []), newMember],
        memberHistory: [...(room.memberHistory || []), joinActivity],
      }

      localStorage.setItem(`room_${roomId}`, JSON.stringify(updatedRoom))
      setMembers(updatedRoom.members)
      setMemberHistory(updatedRoom.memberHistory)
    }
  }, [roomId, router])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = () => {
    if (!message.trim()) return

    const currentMember = members.find((m) => m.name === currentUser)
    const newMessage: Message = {
      id: Date.now().toString(),
      text: message.trim(),
      sender: currentUser,
      timestamp: new Date().toISOString(),
      emoji: currentMember?.emoji || "😀",
    }

    const updatedMessages = [...messages, newMessage]
    setMessages(updatedMessages)

    // Update localStorage
    const roomData = JSON.parse(localStorage.getItem(`room_${roomId}`) || "{}")
    roomData.messages = updatedMessages
    localStorage.setItem(`room_${roomId}`, JSON.stringify(roomData))

    setMessage("")
  }

  const leaveRoom = () => {
    const currentMember = members.find((m) => m.name === currentUser)
    if (currentMember) {
      const leaveActivity = {
        name: currentUser,
        emoji: currentMember.emoji,
        action: "left" as const,
        timestamp: new Date().toISOString(),
      }

      const updatedMembers = members.filter((m) => m.name !== currentUser)
      const updatedHistory = [...memberHistory, leaveActivity]

      const roomData = JSON.parse(localStorage.getItem(`room_${roomId}`) || "{}")
      roomData.members = updatedMembers
      roomData.memberHistory = updatedHistory
      localStorage.setItem(`room_${roomId}`, JSON.stringify(roomData))
    }

    router.push("/")
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatDateTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">Room {roomId}</h1>
            <button
              onClick={() => setShowMembers(!showMembers)}
              className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded-full text-sm transition-colors"
            >
              👥 {members.length} member{members.length !== 1 ? "s" : ""}
            </button>
          </div>
          <button onClick={leaveRoom} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors">
            🚪 Leave
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Members Sidebar */}
        {showMembers && (
          <div className="w-80 bg-gray-800 border-r border-gray-700 p-4 overflow-y-auto">
            <h3 className="font-bold mb-4">Room Activity</h3>

            <div className="mb-6">
              <h4 className="text-sm text-gray-400 mb-2">Current Members ({members.length})</h4>
              <div className="space-y-2">
                {members.map((member, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-gray-700 rounded-lg">
                    <span className="text-2xl">{member.emoji}</span>
                    <div>
                      <div className="font-medium">{member.name}</div>
                      <div className="text-xs text-gray-400">Joined {formatDateTime(member.joinedAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm text-gray-400 mb-2">Recent Activity</h4>
              <div className="space-y-2">
                {memberHistory
                  .slice(-10)
                  .reverse()
                  .map((activity, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 text-sm">
                      <span className="text-lg">{activity.emoji}</span>
                      <div>
                        <span className="font-medium">{activity.name}</span>
                        <span className={activity.action === "joined" ? "text-green-400" : "text-red-400"}>
                          {" "}
                          {activity.action}
                        </span>
                        <div className="text-xs text-gray-400">{formatDateTime(activity.timestamp)}</div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === currentUser ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-xs lg:max-w-md ${msg.sender === currentUser ? "order-2" : "order-1"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    {msg.sender !== currentUser && (
                      <>
                        <span className="text-lg">{msg.emoji}</span>
                        <span className="text-sm font-medium text-gray-300">{msg.sender}</span>
                      </>
                    )}
                    {msg.sender === currentUser && (
                      <>
                        <span className="text-sm font-medium text-gray-300">You</span>
                        <span className="text-lg">{msg.emoji}</span>
                      </>
                    )}
                    <span className="text-xs text-gray-500">{formatTime(msg.timestamp)}</span>
                  </div>
                  <div
                    className={`px-4 py-2 rounded-2xl ${
                      msg.sender === currentUser
                        ? "bg-blue-600 text-white rounded-br-md"
                        : "bg-gray-700 text-white rounded-bl-md"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="border-t border-gray-700 p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Type your message..."
                className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={sendMessage}
                disabled={!message.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
