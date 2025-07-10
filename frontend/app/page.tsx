'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const [roomId, setRoomId] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const router = useRouter()

  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }

  const createRoom = () => {
    if (!username.trim()) {
      setError('Please enter your name')
      return
    }
    
    setIsCreating(true)
    const newRoomId = generateRoomId()
    
    // Store room data in localStorage
    const roomData = {
      id: newRoomId,
      createdAt: new Date().toISOString(),
      members: [],
      messages: [],
      memberHistory: []
    }
    
    localStorage.setItem(`room_${newRoomId}`, JSON.stringify(roomData))
    localStorage.setItem('currentUser', username)
    
    setTimeout(() => {
      router.push(`/room/${newRoomId}`)
    }, 1000)
  }

  const joinRoom = () => {
    if (!username.trim()) {
      setError('Please enter your name')
      return
    }
    
    if (!roomId.trim()) {
      setError('Please enter a room ID')
      return
    }

    const roomData = localStorage.getItem(`room_${roomId.toUpperCase()}`)
    
    if (!roomData) {
      setError('This room ID does not exist')
      return
    }

    localStorage.setItem('currentUser', username)
    router.push(`/room/${roomId.toUpperCase()}`)
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-md shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">💬 Chat Rooms</h1>
          <p className="text-gray-400">Connect with friends in real-time</p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Your Name</label>
            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value)
                setError('')
              }}
              placeholder="Enter your name"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <button
              onClick={createRoom}
              disabled={isCreating}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Creating Room...
                </>
              ) : (
                <>
                  ✨ Create New Room
                </>
              )}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-800 text-gray-400">or</span>
              </div>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                value={roomId}
                onChange={(e) => {
                  setRoomId(e.target.value.toUpperCase())
                  setError('')
                }}
                placeholder="Enter Room ID"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent uppercase tracking-wider"
              />
              <button
                onClick={joinRoom}
                className="w-full bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg font-medium transition-colors"
              >
                🚪 Join Room
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
