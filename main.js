const telegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const ip = require("ip");
const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");

//telegram token obtained from FatherBot
const telegramToken = "1169469449:AAHG_kN7rWPHc0qCxZSWhJJMJo8cK3TsZgA";

//weather token obtained from OpenWeather.org
const weatherToken = "fe9d16537bf73d11bed1a2d34e92b5b9";

const telegram = new telegramBot(telegramToken, { polling: true });

//test run on automated messages with on command /start
telegram.onText(/\/hello/, (message, match) => {
  const response = match[1];
  if (response == null) {
    telegram.sendMessage(
      message.chat.id,
      "Are you a productive member of the society today?"
    );
  }
});

//weather api endpoint
const weatherEndPoint = (city) =>
  `http://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${weatherToken}`;

//pass in api response as parameters
const weatherTemplate = (name, weather, main, wind) =>
  `${name}
  \n<b> Weather: </b> ${weather.main} (${weather.description})
  \n<b> Temperature: </b> ${main.temp} °C
  \n<b> Temperature Range: </b> ${main.temp_min} °C to ${main.temp_max} °C
  \n<b> Feels like: </b> ${main.feels_like} °C
  \n<b> Wind speed: </b> ${wind.speed} km/h`;

//refer to axios call notes
const weather = (chatId, city) => {
  const endPoint = weatherEndPoint(city);
  axios.get(endPoint).then(
    (response) => {
      const { name, weather, main, wind } = response.data;
      telegram.sendMessage(
        chatId,
        //must put weather is an array of object
        //to reach values using weather.main, need to specify the index of weather
        //use google inspect to console.log api response (https://samples.openweathermap.org/data/2.5/forecast?q=M%C3%BCnchen,DE&appid=439d4b804bc8187953eb36d2a8c26a02)
        weatherTemplate(name, weather[0], main, wind),
        {
          parse_mode: "HTML",
        }
      );
      console.log("success");
    },
    (error) => {
      console.log("error", error);
      telegram.sendMessage(
        chatId,
        `Error 404, ${city} is unknown! Please try again 🥺 `
      );
    }
  );
};

//weather command on ExtraCranberryBot, i.e. /weather
telegram.onText(/\/weather/, (message, match) => {
  const chatId = message.chat.id;
  //string split and retrieve first input
  //[1] because city is the second word i.e. /weather London
  const city = match.input.split(" ")[1];
  return weather(chatId, city);
});

//bot replies on command /ipv4
telegram.onText(/\/ipv4/, (message) => {
  const chatId = message.chat.id;
  const response = ip.address();
  return telegram.sendMessage(chatId, response);
});

const adapter = new FileSync("db.json");
const db = low(adapter);
db.defaults({ savedMessages: [] }).write();

//message being saved into savedMessage
//bot replies on command /save_note
telegram.onText(/\/save_note (.+)/, (message, match) => {
  const chatId = message.chat.id;
  const response = match[1];
  if (response == null) {
    telegram.sendMessage(chatId, "Invalid input, please try again 🥺");
  } else {
    db.get("savedMessages").push({ title: response }).write();
    telegram.sendMessage(chatId, "Message successfully saved to database!");
    // console.log(response);
  }
});

// bot replies on command /view_notes
telegram.onText(/\/view_notes/, (message) => {
  const chatId = message.chat.id;
  const received = db.get("savedMessages").map("title").value();
  for (const [i, v] of received.entries()) {
    telegram.sendMessage(chatId, `Message saved: ${v}`);
  }
  console.log(received);
});

//what is polling error?
telegram.on("polling_error", (error) => console.log(error));
