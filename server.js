import express from "express"
import dotenv from "dotenv"
import {create} from "express-handlebars"
import path from "path"
import session from "express-session"
import passport from "passport"
import MongoStore from "connect-mongo"
import {createServer} from "http"
import {Server} from "socket.io"

///---
import productosRouter from "./routes/ApiProductosRouter.js"
import loginRouter from "./routes/loginRouter.js"
import processRouter from "./routes/processInfoRouter.js"
///---
import productosSocket from "./routes/web-sockets/wsProductos.js"
import mensajesSocket from "./routes/web-sockets/wsMensajes.js"
import config from "./config.js"
import connectDB from "./utils/getMongo.js"

///////------ Configuración Passport
import "./passport-facebook.js"

//////////////////////////////////////-----
// servidor api
const app = express()
dotenv.config()
const httpServer = createServer(app)
const io = new Server(httpServer)

//SOCKET IO
///---- se definen los sockets para productos y mensajes
io.on("connection", async (socket) => {
   productosSocket(socket, io.sockets)
   mensajesSocket(socket, io.sockets)
})

///---- handlebars
const hbs = create({
   extname: ".hbs", //extension
   defaultLayout: "main",
   layoutsDir: path.join(app.get("views"), "layouts"),
   partialsDir: path.join(app.get("views"), "partials"),
})
app.use(express.static("./public"))

app.set("view engine", "handlebars")
app.set("views", "./views")
///---- Config Middlewares
app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.engine("handlebars", hbs.engine)
//app.use(cors({credentials: true}))
///----  Configuración de Mongo Store
app.use(
   session({
      secret: "secret",
      store: MongoStore.create({
         mongoUrl: config.mongoDB.cnxStr,
      }),
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
         ///---espacio por sesión de 10min
         maxAge: 600000,
      },
   })
)
app.use(passport.initialize())
app.use(passport.session())
connectDB()

///---- Rutas API REST
app.use("/info", processRouter)
app.use("/api", productosRouter)

///---- rutas para el login y home
app.use(loginRouter)

app.get("*", (req, res) => {
   res.status(400).json({error: 0, descripcion: "La ruta que buscas no existe"})
})
///
const PORT = config.minimist_PORT || process.env.PORT || 8080
//console.log(PORT)

httpServer.listen(PORT, () => {
   console.log("listening on: ", PORT)
})
