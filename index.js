const express = require("express"); // Express: un marco web para Node.js
const { createServer } = require("http"); // Crear servidor HTTP nativo de Node.js
const { Server } = require("socket.io"); // Biblioteca para agregar funcionalidades de WebSocket
const mongoose = require("mongoose"); // Mongoose: una biblioteca de modelado de MongoDB

// Crear una aplicación Express
const app = express();
const httpServer = createServer(app); // Crear un servidor HTTP utilizando la aplicación Express
const io = new Server(httpServer, {
  cors: {
    origin: "*"
  }
}); // Inicializar el servidor de Socket.io para gestionar conexiones WebSocket

const conexion = "mongodb+srv://senaproyecto020:EADuG1AU8UiErYDd@reserva.2aw88hj.mongodb.net/?retryWrites=true&w=majority&appName=reserva";

// Conéctate a MongoDB
mongoose.connect(conexion, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "Error de conexión a MongoDB:"));
db.once("open", () => {
  console.log("Conectado a MongoDB");
});

// Definir un modelo para los mensajes
const messageSchema = new mongoose.Schema({
  type: String,
  username: String,
  userid: String,
  otherid: String,
  content: String,
  timestamp: { type: Date, default: Date.now },
});

const Message = mongoose.model("Message", messageSchema);

// Configurar una ruta en la aplicación Express para el punto de acceso raíz
app.route("/").get((req, res) => {
  res.json("¡Hola! Bienvenido de nuevo al canal Dev Stack 👋👋👋");
});

// Configurar manejadores de eventos para conexiones WebSocket
io.on("connection", (socket) => {
  socket.join("anonymous_group"); // Unir el socket a una sala llamada "anonymous_group"
  console.log("Conexión al backend establecida");

  // Enviar mensajes guardados al cliente cuando se conecta
  Message.find({}, (err, messages) => {
    if (err) throw err;
    socket.emit("loadMessages", messages);
  });

  socket.on("getMessages", async ({ userid, otherid }) => {
    try {
      const messages = await Message.find({
        $or: [
          { userid, otherid },
          { userid: otherid, otherid: userid },
        ],
      });

      // Emitir los mensajes al cliente
      socket.emit("loadMessages", messages);
    } catch (error) {
      console.error("Error al obtener mensajes:", error);
    }
  });

  socket.on("sendMsg", (msg) => {
    console.log("msg", msg);

    // Guardar el mensaje en MongoDB
    const newMessage = new Message({
      type: msg.type,
      username: msg.senderName,
      userid: msg.userId,
      otherid: msg.otherId,
      content: msg.msg,
    });

    newMessage.save((err) => {
      if (err) throw err;
      // Emitir el mensaje a todos los clientes
      io.to("anonymous_group").emit("sendMsgServer", {
        ...msg,
        type: "otherMsg",
      });
    });
  });

  // Manejar la eliminación de la conversación
  socket.on("deleteConversation", async ({ userid, otherid }) => {
    try {
      // Eliminar todos los mensajes que coincidan con las condiciones
      await Message.deleteMany({
        $or: [
          { userid, otherid },
          { userid: otherid, otherid: userid },
        ],
      });

      console.log("Conversación eliminada");

      // Emitir evento para actualizar la interfaz del cliente
      io.to("anonymous_group").emit("conversationDeleted");
    } catch (error) {
      console.error("Error al eliminar conversación:", error);
    }
  });

});

// Iniciar el servidor HTTP en el puerto 3000 y mostrar un mensaje en la consola
httpServer.listen(8000, () => {
  console.log("El servidor está ejecutándose en el puerto 8000");
});
