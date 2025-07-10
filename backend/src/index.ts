import { WebSocket, WebSocketServer } from "ws";

const wss = new WebSocketServer({port : 8080});

interface User {
    socket : WebSocket;
    room : string;
}

let userCount = 0; 
let allSockets : User[]= [];

//whenever there is a new connection - to the websocket sever
wss.on("connection", (socket : WebSocket) => {
    userCount++;
    console.log("User connected #"+userCount);

    // if the socket or connection on server receives a msg from the client
    socket.on("message", (msg : string) => {
        const parsedMessage = JSON.parse(msg);
    
        if(parsedMessage.type === "join"){
            console.log("User wants to join room "+parsedMessage.payload.roomId);
            allSockets.push({
                socket,
                room : parsedMessage.payload.roomId
            })
        }

        if(parsedMessage.type === "chat"){
            //since socket is unique
            const currUser = allSockets.find( x => x.socket == socket);
            const currUserRoom = currUser?.room;

            // send to all users in that room
            for(let i  = 0; i < allSockets.length; i++){
                if(allSockets[i].room == currUserRoom){
                    allSockets[i].socket.send(parsedMessage.payload.message);
                }
            }
        }
    })

    socket.on("disconnect", () => {
        allSockets = allSockets.filter((x)=>{x.socket != socket});
    })
})