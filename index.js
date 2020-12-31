"use strict";

const express = require("express");
const line = require("@line/bot-sdk");
const PORT = process.env.PORT || 3000;
const dotenv = require("dotenv");
dotenv.config();

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const app = express();

app.get("/", (req, res) => res.send("Hello（GET)"));
app.post("/webhook", line.middleware(config), (req, res) => {
  console.log(req.body.events);

  if (
    req.body.events[0].replyToken === "00000000000000000000000000000000" &&
    req.body.events[1].replyToken === "ffffffffffffffffffffffffffffffff"
  ) {
    res.send("Hello!(POST)");
    console.log("疎通確認用");
    return;
  }

  Promise.all(req.body.events.map(handleEvent)).then((result) =>
    res.json(result)
  );
});

const client = new line.Client(config);

 async function handleEvent(event) {
  if (event.type !== "message" || event.message.type !== "text") {
    return Promise.resolve(null);
  }

  // ライブラリのimport
  const OBSWebSocket = require("obs-websocket-js");
  // インスタンス初期化
  const obs = new OBSWebSocket();
  // OBSに接続してPromiseを受け取る
  obs
    .connect({
      address: "localhost:4000",  //先ほどOBSで設定したポート番号を記入
      password: "xxxxxxxxxxxxxxx",  //先ほどOBSで登録したパスワードを記入
    })
    // 接続成功
    .then(() => {
      console.log(`Success! We're connected & authenticated.`);
      // シーンの一覧を取得するリクエスト
      return obs.send("GetSceneList");
    })
    .then((data) => {
        console.log(data)
      console.log(`${data.scenes.length} Available Scenes!`);
      // シーンの一覧から現在のシーンを探す
      data.scenes.forEach((scene) => {
        if (scene.name !== data.currentScene) {
          console.log(
            `Found a different scene! Switching to Scene: ${scene.name}`
          );
          // 現在のシーンを切り替えるリクエスト
          obs.send("SetCurrentScene", {
            "scene-name": scene.name,
          });
        }
      });
    })
    .catch((err) => {
      // Promise convention dicates you have a catch on every chain.
      console.log(err);
    });
  // シーンが切り替わったイベントをObserveする
  obs.on("SwitchScenes", (data) => {
    console.log(`New Active Scene: ${data.sceneName}`);
  });
  // エラーをObserveする
  obs.on("error", (err) => {
    console.error("socket error:", err);
  });

  return client.replyMessage(event.replyToken, {
    type: "text",
    text: event.message.text,
  });
}

app.listen(PORT);
console.log(`Server running at ${PORT}`);