const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
import { Client as DiscordClient, TextChannel } from 'discord.js';
import constants from './../constants';


export default async (client: DiscordClient): Promise<void> => {
  console.log('starting http server...');
  var scoap = "nothing bro"
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

  app.get("/scoap", (req, res) => {
    res.send(scoap)
  })

  app.post("/scoap", async (req, res) => {
    if (!req.body.scoap) return res.status(400).send("missing scoap")
    scoap = req.body.scoap 
    console.log('post request received, form data: ', scoap )
    const message = 'post request received, form data: ' + scoap 

    if (!channel) return;

    // Using a type guard to narrow down the correct type
    if (!((channel): channel is TextChannel => channel.type === 'text')(channel)) return;

    const pollMessage = await channel.send(message);
    await pollMessage.react(`✅`);
    await pollMessage.react(`⛔`);
    // Create a reaction collector
    const filter = (reaction) => reaction.emoji.name === '✅';
    const collector = pollMessage.createReactionCollector(filter, { time: 30000 });
    collector.on('collect', async (reaction, user) => {
    console.log(`Collected ${reaction.emoji.name} from user ${user.id}`)
    let msg = `Collected ${reaction.emoji.name} from user ${user.username}`
    const pollMessage = await channel.send(msg);
    });

    collector.on('end', collected => console.log(`Collected ${collected.size} items`));

    
    res.send("completed")
  })

  app.listen(5000, () => {
    console.log("Listening at http://localhost:5000")
  })

}

