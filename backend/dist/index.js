"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const wss = new ws_1.WebSocketServer({ port: 8080 });
let userCount = 0;
let allSockets = [];
//whenever there is a new connection - to the websocket sever
wss.on("connection", (socket) => {
    userCount++;
    console.log("User connected #" + userCount);
    // if the socket or connection on server receives a msg from the client
    socket.on("message", (msg) => {
        const parsedMessage = JSON.parse(msg);
        if (parsedMessage.type === "join") {
            console.log("User wants to join room " + parsedMessage.payload.roomId);
            allSockets.push({
                socket,
                room: parsedMessage.payload.roomId
            });
        }
        if (parsedMessage.type === "chat") {
            //since socket is unique
            const currUser = allSockets.find(x => x.socket == socket);
            const currUserRoom = currUser === null || currUser === void 0 ? void 0 : currUser.room;
            // send to all users in that room
            for (let i = 0; i < allSockets.length; i++) {
                if (allSockets[i].room == currUserRoom) {
                    allSockets[i].socket.send(parsedMessage.payload.message);
                }
            }
        }
    });
    socket.on("disconnect", () => {
        allSockets = allSockets.filter((x) => { x.socket != socket; });
    });
});
