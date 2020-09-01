const { GraphQLClient, gql } = require('graphql-request')
const retry = require('async-retry')
const BigNumber = require("bignumber.js");
const Discord = require('discord.js');
const client = new Discord.Client();
const axios = require("axios");
const { Telegraf } = require('telegraf')


client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});



const endpoint = 'https://api.thegraph.com/subgraphs/name/pengiundev/curve-votingescrow-mainnet'
const graphQLClient = new GraphQLClient(endpoint)


async function run() {
  //console.log('Fetching ...');
  var currentStamp = Date.now() / 1000 - 60*15 | 0;
  var query = gql`
  {
    votingEscrows(orderBy: timestamp, orderDirection: desc, where: { timestamp_gt: ${currentStamp}}) {
      id
      provider
      value
      locktime
      timestamp
      type
      totalPower
    }
    crvlockeds {
       CRV
    }
  }
  `;
  const results = await retry(async bail => await graphQLClient.request(query))
  // console.log(results);

  var total_locked = 0;
  var total_velocked = 0;
  var count = 0;

  results.votingEscrows.forEach((item) => {
    if (item.type !== 'increase_unlock_time' && item.type !== 'withdraw') {
      var crv_amount = new BigNumber(item.value).div(10 ** 18).toFixed(0);
      var vecrv_amount = new BigNumber(item.value * (item.locktime - (Date.now() / 1000))).div(10 ** 18) / (86400 * 365) / 4;

      count++;
      total_locked = total_locked+parseInt(crv_amount);
      total_velocked = total_velocked+parseInt(vecrv_amount);
    }

  })

  var total_locked_all = new BigNumber(results.crvlockeds[0].CRV).div(10 ** 18).toFixed(0);
  total_locked_all = total_locked_all / 1000000;
  console.log(`total locked  = ${total_locked_all.toFixed(2)}`);
  var price = await get_price();
  console.log(`Current price is $${price}`);
  var total_amount = parseInt(total_locked * price);

  var llamas = getLlamas(total_amount);

  var total_value_locked = parseInt(total_locked_all * price * 1000000);

  var addresses = (count > 1)?'addresses':'address';
  var message = `${count} ${addresses} just locked a total of ${total_locked.toLocaleString()} CRV ($${total_amount.toLocaleString()}) adding voting power of ${total_velocked} veCRV | Total locked: ${total_locked_all.toFixed(2)}M CRV ($${total_value_locked.toLocaleString()}) | ${llamas}`;

  //console.log(message);
  if (total_locked > 0) {
      broadcastMessage(message);
  }

  sleep(1000*15*60).then(()=> {
    run();
  })

}

async function get_price() {
  response = await retry(async bail => await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=curve-dao-token&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true'))
  return response.data['curve-dao-token'].usd;
}

function broadcastMessage(message) {
  bot.telegram.sendMessage(`-1001357982180`, message);
  client.channels.cache.get(`748472140340396073`).send(message);
}

function getLlamas(crv_amount) {
  if (crv_amount > 500000) {
    return `🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙`;
  }
  if (crv_amount > 100000) {
    return `🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙`;
  }
  if (crv_amount > 50000) {
    return `🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙🦙`;
  }
  if (crv_amount > 10000) {
    return `🦙🦙🦙🦙🦙🦙🦙🦙`;
  }
  if (crv_amount > 1000) {
    return `🦙🦙🦙🦙`;
  }
  if (crv_amount > 100) {
    return `🦙🦙`;
  }
  if (crv_amount > 1) {
    return `🦙`;
  }
}


function sleep(millis) {
    return new Promise(resolve => setTimeout(resolve, millis));
}

sleep(2000).then(() => {
    run();
})



const bot = new Telegraf(process.env.tg_token)

bot.launch().then(() => {});
client.login(process.env.discord_token);
