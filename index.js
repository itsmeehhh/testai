const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");
const express = require("express");
const bodyParser = require("body-parser");
const  Botly = require("botly");

const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const app = express();
app.use(bodyParser.json());
const botly = new Botly({
  accessToken: 'EAAPWvX7lt4UBO2MIrDqbrM1cZAXw1HbBnB2ZCYQkUdazvXu4ZBzvJ3D8Eu59wUtfF33sr4CfVQ58ZAfshvQococ1if0sEFqvnxaX8lKIE7aK4tbveGtZCjaMNjtSNAvMNdireAay8OPssswXDbxhS0Pf9fGcJZC8tNuxA5kIZA037jUFazFAnVx3NRxEYLGRz92',
  verifyToken: 'abcde12345'
});

const chatusers = {};

// Converts image URL to a GoogleGenerativeAI.Part object.
async function urlToGenerativePart(url, mimeType) {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  return {
    inlineData: {
      data: Buffer.from(response.data).toString("base64"),
      mimeType
    },
  };
}

async function handleUserMessage(userId, message) {
  if (!chatusers[userId]) {
    chatusers[userId] = {
      model: genAI.getGenerativeModel({ model: "gemini-1.5-flash" }),
      history: []
    };

    const userChatt = chatusers[userId];
  userChatt.history.push({
    role: "user",
    parts: [{ text: 'انت الان إسمك أطلس، مساعد افتراضي تم تطويره بواسطة MoroccoAI، تذكر هذا طوال المحادثة، يعني حتى لو قلت لك من انت اصلا ستقول لي المعلومات التي قلتها لك.' }]
  });

  userChatt.history.push({
    role: "model",
    parts: [{ text: 'أنت على حق! اسمي الشخصي "أطلس"، مساعد افتراضي تم تطويره بواسطة MoroccoAI. 😊 أنا سعيد بمساعدتك في أي شيء تحتاجه. هل هناك شيء محدد تريدني مساعدتك به اليوم؟' }]
  });
  }

  const userChat = chatusers[userId];
  userChat.history.push({
    role: "user",
    parts: [{ text: message }]
  });

  const chat = userChat.model.startChat({
    history: userChat.history,
    generationConfig: {
      maxOutputTokens: 1500,
    },
  });

  const result = await chat.sendMessage(message);
  const text = await result.response.text();

  userChat.history.push({
    role: "model",
    parts: [{ text }]
  });

  return text;
}

async function handleUserImage(userId, imageUrl) {
  if (!chatusers[userId]) {
    chatusers[userId] = {
      model: genAI.getGenerativeModel({ model: "gemini-1.5-flash" }),
      history: []
    };
  }

  const userChat = chatusers[userId];
  const imagePart = await urlToGenerativePart(imageUrl, "image/jpeg");
  userChat.history.push({
    role: "user",
    parts: [imagePart]
  });

  const prompt = "ماذا ترى في هذه الصورة؟";
  const result = await userChat.model.generateContent([prompt, imagePart]);
  const text = await result.response.text();

  userChat.history.push({
    role: "model",
    parts: [{ text }]
  });

  return text;
}

botly.on("message", async (senderId, message, data) => {
  if (data && data.text) {
    const response = await handleUserMessage(senderId, data.text);
    console.log(response)
    botly.sendText({ id: senderId, text: response });
  } else if (message.message.attachments[0].type == "image") {
    const attachment = message.message.attachments[0] 
            const imageUrl = attachment.payload.url;
    // const imageUrl = data.attachments[0].payload.url;
    const response = await handleUserImage(senderId, imageUrl);
    botly.sendText({ id: senderId, text: response });
  }
});

app.use("/webhook", botly.router());

app.listen(8080, () => {
  console.log("Bot is running");
});