const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");
const express = require("express");
const bodyParser = require("body-parser");
const Botly = require("botly");

const apiKeys = [
  'AIzaSyB9fVDozwTK3znlw4lRr8r9a0myTTYXUcw',
  'AIzaSyAgTZ_YZ3ima5A6KdMvMTPTBIMD3BLhAus',
  'AIzaSyAwBXW_RnyLhlflf-oizqAqQKormxNKWWA',
  'AIzaSyAyLhyj_UbiQ9XOSg7Dt2QDOecANiU0YLw',
  'AIzaSyDyUnrvyU5fSroBqM4p8E79Yb1C05uACmY',
  'AIzaSyBdx1mZYsQ0AI8A2hkoiFAuk2a2lLllLPc',
  'AIzaSyAQ9CrPSA3ABOuLF4WlMTXnS-u1gbL9nlQ',
  'AIzaSyAvGJRWTN7L7yh-LSj_XFC0bWHWmyhAe_8',
  'AIzaSyCnHCt6or_D65S0bmKIsGe_3T2Z2KPgspI',
  'AIzaSyBTWReK-B3-Q0sZxYXJ3uWwbk8n7Qymxu0',
  'AIzaSyCLxHxwZ7uTyaXwOapTfh30N3CLe7tV7jg'
];
let currentApiKeyIndex = 0;

function getNextApiKey() {
  const apiKey = apiKeys[currentApiKeyIndex];
  currentApiKeyIndex = (currentApiKeyIndex + 1) % apiKeys.length;
  return apiKey;
}

const app = express();
app.use(bodyParser.json());
const botly = new Botly({
  accessToken: 'EAAPWvX7lt4UBO2MIrDqbrM1cZAXw1HbBnB2ZCYQkUdazvXu4ZBzvJ3D8Eu59wUtfF33sr4CfVQ58ZAfshvQococ1if0sEFqvnxaX8lKIE7aK4tbveGtZCjaMNjtSNAvMNdireAay8OPssswXDbxhS0Pf9fGcJZC8tNuxA5kIZA037jUFazFAnVx3NRxEYLGRz92',
  verifyToken: 'abcde12345'
});

const chatusers = {};

function generateRandomIP() {
  const octet = () => Math.floor(Math.random() * 256);
  return `${octet()}.${octet()}.${octet()}.${octet()}`;
}

async function urlToGenerativePart(url, mimeType) {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return {
      inlineData: {
        data: Buffer.from(response.data).toString("base64"),
        mimeType
      },
    };
  } catch (error) {
    throw new Error('حدث خطأ أثناء جلب الصورة.');
  }
}

async function handleUserMessage(userId, message) {
  const userIP = generateRandomIP();
  const genAI = new GoogleGenerativeAI(getNextApiKey());
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  if (!chatusers[userId]) {
    chatusers[userId] = {
      history: []
    };

    const userChat = chatusers[userId];
    userChat.history.push({
      role: "user",
      parts: [{ text: 'انت الان إسمك أطلس، مساعد افتراضي تم تطويره بواسطة MoroccoAI، تذكر هذا طوال المحادثة، يعني حتى لو قلت لك من انت اصلا ستقول لي المعلومات التي قلتها لك.' }]
    });

    userChat.history.push({
      role: "model",
      parts: [{ text: 'أنت على حق! اسمي الشخصي "أطلس"، مساعد افتراضي تم تطويره بواسطة MoroccoAI. 😊 أنا سعيد بمساعدتك في أي شيء تحتاجه. هل هناك شيء محدد تريدني مساعدتك به اليوم؟' }]
    });
  }

  const userChat = chatusers[userId];
  userChat.history.push({
    role: "user",
    parts: [{ text: message }]
  });

  try {
    const chat = model.startChat({
      history: userChat.history,
      generationConfig: {
        maxOutputTokens: 1500,
      },
    });

    const result = await chat.sendMessage(message, {
      headers: {
        'X-Forwarded-For': userIP
      }
    });
    const text = await result.response.text();

    userChat.history.push({
      role: "model",
      parts: [{ text }]
    });

    return text;
  } catch (error) {
    console.error('حدث خطأ أثناء معالجة رسالة المستخدم:', error);
    throw new Error('حدث خطأ أثناء معالجة رسالتك. الرجاء المحاولة مرة أخرى.');
  }
}

async function handleUserImage(userId, imageUrl) {
  const userIP = generateRandomIP();
  const genAI = new GoogleGenerativeAI(getNextApiKey());
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  if (!chatusers[userId]) {
    chatusers[userId] = {
      history: []
    };
  }

  const userChat = chatusers[userId];
  try {
    const imagePart = await urlToGenerativePart(imageUrl, "image/jpeg");
    userChat.history.push({
      role: "user",
      parts: [imagePart]
    });

    const prompt = "ماذا ترى في هذه الصورة؟";
    const result = await model.generateContent([prompt, imagePart], {
      headers: {
        'X-Forwarded-For': userIP
      }
    });
    const text = await result.response.text();

    userChat.history.push({
      role: "model",
      parts: [{ text }]
    });

    return text;
  } catch (error) {
    console.error('حدث خطأ أثناء معالجة صورة المستخدم:', error);
    throw new Error('حدث خطأ أثناء معالجة صورتك. الرجاء المحاولة مرة أخرى.');
  }
}

botly.on("message", async (senderId, message, data) => {
  try {
    if (data && data.text) {
      const response = await handleUserMessage(senderId, data.text);
      console.log(response);
      botly.sendText({ id: senderId, text: response });
    } else if (message.message.attachments[0].type == "image") {
      const attachment = message.message.attachments[0];
      const imageUrl = attachment.payload.url;
      const response = await handleUserImage(senderId, imageUrl);
      botly.sendText({ id: senderId, text: response });
    }
  } catch (error) {
    botly.sendText({ id: senderId, text: error.message });
  }
});

app.use("/webhook", botly.router());

app.listen(8080, () => {
  console.log("Bot is running");
});
