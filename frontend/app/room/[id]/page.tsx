"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"

interface Message {
  id: string
  text: string
  sender: string
  timestamp: string
  emoji: string
  type?: "system" | "chat" // Add type for system messages
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
  const [connectionStatus, setConnectionStatus] = useState("Connecting...")
  const [actualRoomId, setActualRoomId] = useState(roomId)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const hasConnectedRef = useRef(false)
  const isLeavingRef = useRef(false)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Add system message to chat
  const addSystemMessage = (text: string) => {
    const systemMessage: Message = {
      id: `system-${Date.now()}`,
      text,
      sender: "System",
      timestamp: new Date().toISOString(),
      emoji: "🤖",
      type: "system",
    }
    setMessages((prev) => [...prev, systemMessage])
  }

  const connectWebSocket = () => {
    const username = localStorage.getItem("username")
    const action = localStorage.getItem("action")

    if (!username) {
      router.push("/")
      return
    }

    setCurrentUser(username)

    // Clear any existing connection
    if (wsRef.current) {
      wsRef.current.close()
    }

    try {
      console.log("Attempting to connect to WebSocket server...")
      const websocket = new WebSocket(process.env.NEXT_PUBLIC_WS_URL!)
      wsRef.current = websocket

      websocket.onopen = () => {
        setConnectionStatus("Connected")
        hasConnectedRef.current = true
        console.log("Connected to WebSocket server")

        if (action === "create" || roomId === "new") {
          console.log("Sending createRoom message")
          websocket.send(
            JSON.stringify({
              type: "createRoom",
              payload: username,
            }),
          )
        } else if (action === "join") {
          const targetRoomId = localStorage.getItem("targetRoomId") || roomId
          console.log("Sending joinRoom message for room:", targetRoomId)
          websocket.send(
            JSON.stringify({
              type: "joinRoom",
              payload: { roomId: targetRoomId, name: username },
            }),
          )
        }
      }

      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log("Received:", data)

          switch (data.type) {
            case "roomCreated":
              setActualRoomId(data.payload.roomId)
              setMessages(data.payload.room.messages || [])
              setMembers(data.payload.room.members || [])
              setMemberHistory(data.payload.room.memberHistory || [])
              window.history.replaceState({}, "", `/room/${data.payload.roomId}`)
              addSystemMessage(`Welcome to room ${data.payload.roomId}! You created this room.`)
              break

            case "roomJoined":
              setActualRoomId(data.payload.roomId)
              setMessages(data.payload.room.messages || [])
              setMembers(data.payload.room.members || [])
              setMemberHistory(data.payload.room.memberHistory || [])
              addSystemMessage(`You joined room ${data.payload.roomId}`)
              break

            case "newMessage":
              setMessages((prev) => [...prev, data.payload])
              break

            case "memberUpdate":
              setMembers(data.payload.members)
              break

            case "userJoined":
              setMemberHistory((prev) => [
                ...prev,
                {
                  name: data.payload.name,
                  emoji: data.payload.emoji,
                  action: "joined",
                  timestamp: data.payload.timestamp,
                },
              ])
              // Add system message for user joining (but not for current user)
              if (data.payload.name !== currentUser) {
                addSystemMessage(`${data.payload.emoji} ${data.payload.name} joined the room`)
              }
              break

            case "userLeft":
              setMemberHistory((prev) => [
                ...prev,
                {
                  name: data.payload.name,
                  emoji: data.payload.emoji,
                  action: "left",
                  timestamp: data.payload.timestamp,
                },
              ])
              // Add system message for user leaving (but not for current user)
              if (data.payload.name !== currentUser) {
                addSystemMessage(`${data.payload.emoji} ${data.payload.name} left the room`)
              }
              break

            case "error":
              console.error("Server error:", data.payload.message)
              setConnectionStatus("Error: " + data.payload.message)
              setTimeout(() => {
                router.push("/")
              }, 3000)
              break

            default:
              console.log("Unknown message type:", data.type)
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error)
        }
      }

      websocket.onclose = (event) => {
        console.log("WebSocket closed:", event.code, event.reason)

        if (!isLeavingRef.current) {
          setConnectionStatus("Disconnected")

          // Only attempt reconnection if it wasn't a clean close and we haven't exceeded attempts
          // if (event.code !== 1000 && reconnectAttempts < 5) {
          //   setConnectionStatus(`Reconnecting... (${reconnectAttempts + 1}/5)`)
          //   reconnectTimeoutRef.current = setTimeout(
          //     () => {
          //       connectWebSocket()
          //     },
          //     2000 * (reconnectAttempts + 1),
          //   )
          // } else if (reconnectAttempts >= 5) {
          //   setConnectionStatus("Connection failed")
          // }
        }
      }

      // websocket.onerror = (error) => {
      //   console.error("WebSocket error:", error)
      //   if (!isLeavingRef.current) {
      //     setConnectionStatus("Connection Error")
      //   }
      // }
    } catch (error) {
      // console.error("Failed to create WebSocket connection:", error)
      // setConnectionStatus("Failed to connect")
    }
  }

  useEffect(() => {
    connectWebSocket()

    return () => {
      // console.log("Component cleanup")
      // isLeavingRef.current = true

      // // Cleanup function
      // if (reconnectTimeoutRef.current) {
      //   clearTimeout(reconnectTimeoutRef.current)
      // }

      // // Only send leaveRoom if we've connected and it's not already leaving
      // if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && hasConnectedRef.current) {
      //   console.log("Sending leaveRoom on cleanup")
      //   wsRef.current.send(JSON.stringify({ type: "leaveRoom" }))
      //   wsRef.current.close(1000, "Component unmounting")
      // } else if (wsRef.current) {
      //   wsRef.current.close(1000, "Component unmounting before connection")
      // }

      // localStorage.removeItem("username")
      // localStorage.removeItem("action")
      // localStorage.removeItem("targetRoomId")
    }
  })

  const sendMessage = () => {
    if (!message.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.log("Cannot send message:", {
        messageEmpty: !message.trim(),
        wsNull: !wsRef.current,
        wsNotOpen: wsRef.current?.readyState !== WebSocket.OPEN,
      })
      return
    }

    console.log("Sending message:", message.trim())

    try {
      wsRef.current.send(
        JSON.stringify({
          type: "chat",
          payload: { message: message.trim() },
        }),
      )
      setMessage("")
    } catch (error) {
      console.error("Error sending message:", error)
    }
  }

  const leaveRoom = () => {
    console.log("User manually leaving room")
    isLeavingRef.current = true

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "leaveRoom" }))
      wsRef.current.close(1000, "User left room")
    }
    router.push("/")
  }

  const retryConnection = () => {
    setConnectionStatus("Connecting...")
    hasConnectedRef.current = false
    isLeavingRef.current = false
    connectWebSocket()
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

  // Show connection error screen
  if (connectionStatus.includes("Error") || connectionStatus === "Connection failed") {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-md text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-4">Connection Error</h2>
          <p className="text-gray-400 mb-6">
            {connectionStatus.includes("Error")
              ? connectionStatus
              : "Unable to connect to the chat server. Please make sure the server is running on port 8080."}
          </p>
          <div className="space-y-3">
            <button
              onClick={retryConnection}
              className="w-full bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-medium transition-colors"
            >
              🔄 Retry Connection
            </button>
            <button
              onClick={() => router.push("/")}
              className="w-full bg-gray-600 hover:bg-gray-700 px-6 py-3 rounded-lg font-medium transition-colors"
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">Room {actualRoomId}</h1>
            <button
              onClick={() => setShowMembers(!showMembers)}
              className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded-full text-sm transition-colors"
            >
              👥 {members.length} member{members.length !== 1 ? "s" : ""}
            </button>
            <div
              className={`px-2 py-1 rounded-full text-xs ${
                connectionStatus === "Connected"
                  ? "bg-green-900 text-green-200"
                  : connectionStatus.includes("Connecting") || connectionStatus.includes("Reconnecting")
                    ? "bg-yellow-900 text-yellow-200"
                    : "bg-red-900 text-red-200"
              }`}
            >
              {connectionStatus}
            </div>
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
                      <div className="font-medium">
                        {member.name}
                        {member.name === currentUser && <span className="text-blue-400 text-sm ml-1">(You)</span>}
                      </div>
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
            {connectionStatus === "Connected" && messages.length === 0 && (
              <div className="text-center text-gray-400 py-8">
                <div className="text-4xl mb-2">💬</div>
                <p>No messages yet. Start the conversation!</p>
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === currentUser ? "justify-end" : msg.type === "system" ? "justify-center" : "justify-start"}`}
              >
                {msg.type === "system" ? (
                  // System message styling
                  <div className="bg-gray-700/50 px-3 py-2 rounded-full text-sm text-gray-300 border border-gray-600">
                    {msg.text}
                  </div>
                ) : (
                  // Regular message styling
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
                )}
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
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    sendMessage()
                  }
                }}
                placeholder={connectionStatus === "Connected" ? "Type your message..." : "Connecting to server..."}
                disabled={connectionStatus !== "Connected"}
                className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              />
              <button
                onClick={sendMessage}
                disabled={!message.trim() || connectionStatus !== "Connected"}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Send
              </button>
            </div>
            {connectionStatus !== "Connected" && (
              <div className="text-xs text-gray-400 mt-2">
                {connectionStatus === "Connecting..." ? "Connecting to server..." : connectionStatus}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
