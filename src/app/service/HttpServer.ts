// const { Client } = require("discord.js");
// const Config = require("./config");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
import { Client as DiscordClient, TextChannel } from 'discord.js';
import constants from './../constants';


export default async (client: DiscordClient): Promise<void> => {
  console.log('starting http server...');
  var scope = "nothing bro"
  const app = express()
  const channel = await client.channels.fetch(constants.SCOAP_SQUAD_CHANNEL_ID) as TextChannel;

  const whitelist = ['http://localhost:3000']
  var corsOptionsDelegate = function (req, callback) {
    var corsOptions;
    if (whitelist.indexOf(req.header('Origin')) !== -1) {
      corsOptions = { origin: true } // reflect (enable) the requested origin in the CORS response
    } else {
      corsOptions = { origin: false } // disable CORS for this request
    }
    callback(null, corsOptions) // callback expects two parameters: error and options
  }

  //========== EXPRESS HTTP SERVER
  app.use(helmet());
  app.use(cors(corsOptionsDelegate));

  app.use(express.json());
  app.use(express.urlencoded());

  app.get("/", (req, res) => {
    res.send("Hello World")
  })

  app.get("/scope", (req, res) => {
    res.send(scope)
  })

  app.post("/scope", (req, res) => {
    if (!req.body.scope) return res.status(400).send("missing scope")
    scope = req.body.scope 
    console.log('post request received, form data: ', scope )
    const message = 'post request received, form data: ' + scope 

    if (!channel) return;

    // Using a type guard to narrow down the correct type
    if (!((channel): channel is TextChannel => channel.type === 'text')(channel)) return;

    channel.send(message);
    // channel.send("what you want to send to that channel");
    
    res.send("completed")
  })

  app.listen(5000, () => {
    console.log("Listening at http://localhost:5000")
  })

}



// // ----
// // const client = new Client();
// var motd = "nothing bro"

// const app = express()

// //========== EXPRESS HTTP SERVER
// app.use(helmet());
// app.use(cors());

// app.use(express.json());
// app.use(express.urlencoded());

// app.get("/", (req, res) => {
//   res.send("Hello World")
// })

// app.post("/motd", (req, res) => {
//   if (!req.body.motd) return res.status(400).send("missing motd")
//   motd = req.body.motd 

//   res.send("completed")
// })

// app.listen(5000, () => {
//   console.log("Listening at http://localhost:5000")
// })


// //========== DISCORD BOT
// client.on("ready", () => {
//   console.log("Bot Listening")
// })

// client.on("message", (message) => {
//   if (message.author.bot || !message.guild) return;

//   // command handler
//   if (!message.content.toLowerCase().startsWith(Config.prefix)) return;

//   const [command, ...args] = message.content.slice(Config.prefix.length).split(/\s+/g);
  
//   if (command == "motd") {
//     message.channel.send(motd)
//   }
// })

// client.login(Config.token)