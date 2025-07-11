"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const wss = new ws_1.WebSocketServer({ port: 8080 });
let userCount = 0;
let allSockets = [];
const userEmojis = ["😀", "😎", "🤖", "🦄", "🐱", "🐶", "🦊", "🐼", "🦁", "🐸"];
const rooms = new Map();
function generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}
function getRandomEmoji() {
    return userEmojis[Math.floor(Math.random() * userEmojis.length)];
}
function getRoomData(roomId) {
    return rooms.get(roomId) || null;
}
function broadcastToRoom(roomId, message, excludeSocket) {
    const roomUsers = allSockets.filter((user) => user.room === roomId);
    roomUsers.forEach((user) => {
        if (user.socket !== excludeSocket && user.socket.readyState === ws_1.WebSocket.OPEN) {
            user.socket.send(JSON.stringify(message));
        }
    });
}
function updateRoomMembers(roomId) {
    const room = rooms.get(roomId);
    if (!room)
        return;
    const currentMembers = allSockets.filter((user) => user.room === roomId)
        .map((user) => ({
        name: user.name,
        emoji: user.emoji,
        joinedAt: user.joinedAt,
    }));
    room.members = currentMembers;
    rooms.set(roomId, room);
    broadcastToRoom(roomId, {
        type: "memberUpdate",
        payload: {
            members: currentMembers,
            memberCount: currentMembers.length
        }
    });
}
//whenever there is a new connection - to the websocket sever
wss.on("connection", (socket) => {
    userCount++;
    console.log("User connected #", userCount);
    socket.on("message", (msg) => {
        try {
            const parsedMessage = JSON.parse(msg);
            console.log("Received message: ", parsedMessage);
            switch (parsedMessage.type) {
                case "createRoom": {
                    const roomId = generateRoomId();
                    const name = parsedMessage.payload;
                    const emoji = getRandomEmoji();
                    const joinedAt = new Date().toISOString();
                    const newRoom = {
                        id: roomId,
                        members: [],
                        messages: [],
                        memberHistory: []
                    };
                    rooms.set(roomId, newRoom);
                    allSockets.push({
                        socket,
                        room: roomId,
                        name,
                        emoji,
                        joinedAt
                    });
                    newRoom.memberHistory.push({
                        name,
                        emoji,
                        action: "joined",
                        timestamp: joinedAt
                    });
                    updateRoomMembers(roomId);
                    socket.send(JSON.stringify({
                        type: "roomCreated",
                        payload: {
                            roomId,
                            name,
                            emoji,
                            room: newRoom
                        }
                    }));
                    console.log(`User ${name} created room ${roomId}`);
                    break;
                }
                case "joinRoom": {
                    const { roomId, name } = parsedMessage.payload;
                    const room = getRoomData(roomId);
                    if (!room) {
                        socket.send(JSON.stringify({
                            type: "error",
                            payload: {
                                message: "Room does not exist"
                            }
                        }));
                        return;
                    }
                    const emoji = getRandomEmoji();
                    const joinedAt = new Date().toISOString();
                    allSockets.push({
                        socket,
                        room: roomId,
                        name,
                        emoji,
                        joinedAt
                    });
                    room.memberHistory.push({
                        name,
                        emoji,
                        action: "joined",
                        timestamp: joinedAt
                    });
                    updateRoomMembers(roomId);
                    socket.send(JSON.stringify({
                        type: "roomJoined",
                        payload: {
                            roomId,
                            name,
                            emoji,
                            room
                        }
                    }));
                    broadcastToRoom(roomId, {
                        type: "userJoined",
                        payload: {
                            name,
                            emoji,
                            timestamp: joinedAt
                        }
                    }, socket);
                    console.log(`User ${name} joined room ${roomId}`);
                    break;
                }
                case "chat": {
                    const currUser = allSockets.find((x) => x.socket === socket);
                    if (!currUser)
                        return;
                    const { message } = parsedMessage.payload;
                    const room = getRoomData(currUser.room);
                    if (!room)
                        return;
                    const chatMessage = {
                        id: Date.now().toString(),
                        text: message,
                        sender: currUser.name,
                        timestamp: new Date().toISOString(),
                        emoji: currUser.emoji
                    };
                    room.messages.push(chatMessage);
                    rooms.set(currUser.room, room);
                    broadcastToRoom(currUser.room, {
                        type: "newMessage",
                        payload: chatMessage
                    });
                    console.log(`Message from ${currUser.name} in room ${currUser.room}: ${message}`);
                    break;
                }
                case "leaveRoom": {
                    const currUser = allSockets.find((x) => x.socket === socket);
                    if (!currUser)
                        return;
                    const room = getRoomData(currUser.room);
                    if (room) {
                        room.memberHistory.push({
                            name: currUser.name,
                            emoji: currUser.emoji,
                            action: "left",
                            timestamp: new Date().toISOString(),
                        });
                        allSockets = allSockets.filter((x) => x.socket !== socket);
                        updateRoomMembers(currUser.room);
                        broadcastToRoom(currUser.room, {
                            type: "userLeft",
                            payload: {
                                name: currUser.name,
                                emoji: currUser.emoji,
                                timestamp: new Date().toISOString(),
                            }
                        });
                        console.log(`User ${currUser.name} left room ${currUser.room}`);
                        break;
                    }
                }
            }
        }
        catch (error) {
            console.log("Error parsing message : ", error);
        }
    });
    socket.on("close", () => {
        const currUser = allSockets.find((x) => x.socket === socket);
        if (currUser) {
            const room = getRoomData(currUser.room);
            if (room) {
                room.memberHistory.push({
                    name: currUser.name,
                    emoji: currUser.emoji,
                    action: "left",
                    timestamp: new Date().toISOString()
                });
            }
            allSockets = allSockets.filter((x) => x.socket !== socket);
            updateRoomMembers(currUser.room);
            broadcastToRoom(currUser.room, {
                type: "userLeft",
                payload: {
                    name: currUser.name,
                    emoji: currUser.emoji,
                    timestamp: new Date().toISOString()
                }
            });
            console.log(`User ${currUser.name} disconnected from room ${currUser.room}`);
        }
        userCount--;
        console.log("User disconnected. Total users:", userCount);
    });
});
console.log("WebSocket server running on port 8080");
