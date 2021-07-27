const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
import { Client as DiscordClient, TextChannel } from 'discord.js';
import constants from './../constants';
import ScoapPoll from './ScoapPoll'

export default async (client: DiscordClient): Promise<void> => {
  console.log('starting http server...');
  var formData = "nothing bro"
  const app = express()
  const channel = await client.channels.fetch(constants.SCOAP_SQUAD_CHANNEL_ID) as TextChannel;
  const whitelist = constants.SCOAP_HTTP_SERVER_CORS_WHITELIST;

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
  app.get("/scoap", (req, res) => {
    res.send(formData)
  })

  app.post("/scoap", async (req, res) => {
    if (!req.body.scoap) return res.status(400).send("missing scoap")
    if (!channel) return;
    // Using a type guard to narrow down the correct type
    if (!((channel): channel is TextChannel => channel.type === 'text')(channel)) return;
    formData = await ScoapPoll(channel, req)
    res.send("completed")
  })

  app.listen(constants.SCOAP_HTTP_SERVER_PORT, () => {
    console.log(`Http server Listening at http://localhost:${constants.SCOAP_HTTP_SERVER_PORT}`)
  })

}

