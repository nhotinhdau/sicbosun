const express = require("express");
const axios = require("axios");
const NodeCache = require("node-cache");

const app = express();
const PORT = process.env.PORT || 3000;

// URL API gốc (thay bằng link https thật của bạn)
const API_URL = "https://api.wsktnus8.net/v2/history/getLastResult?gameId=ktrng_3979&size=100&tableId=39791215743193&curPage=1";

// Cache dữ liệu 60s để client gọi không bị spam API gốc
const cache = new NodeCache({ stdTTL: 60 });

// Biến lưu kết quả mới nhất
let latestResult = null;

// Hàm fetch dữ liệu HTTPS
async function fetchData() {
  try {
    const res = await axios.get(API_URL, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 7000,
    });

    const raw = res.data;
    // Giả sử API trả về có cấu trúc giống bạn gửi:
    // { "gameNum": "#2199019", "score": 11, "resultType": 3, "facesList": [2,3,6] }

    if (raw?.gameNum && raw?.facesList) {
      latestResult = {
        gameNum: raw.gameNum,
        score: raw.score,
        resultType: raw.resultType,
        facesList: raw.facesList,
      };

      cache.set("latest", latestResult);
      console.log("✅ Cập nhật phiên:", latestResult.gameNum);
    } else {
      console.log("⚠️ Format không hợp lệ:", raw);
    }
  } catch (err) {
    console.log("❌ Lỗi fetch:", err.response?.status || err.message);
  } finally {
    // delay 30–45s có random để né 429
    const delay = 30000 + Math.floor(Math.random() * 15000);
    console.log("⏳ Sẽ gọi lại sau", delay / 1000, "giây");
    setTimeout(fetchData, delay);
  }
}

// Gọi vòng lặp lần đầu
fetchData();

// API cho client lấy phiên mới nhất
app.get("/api/taixiu/latest", (req, res) => {
  if (!latestResult) {
    return res.status(503).json({
      error: "Chưa có dữ liệu",
      details: "Đợi vài giây để server lấy phiên đầu tiên.",
    });
  }
  res.json(latestResult);
});

// Endpoint mặc định
app.get("/", (req, res) => {
  res.send("API HTTPS Tài Xỉu. Truy cập /api/taixiu/latest để xem phiên mới nhất.");
});

app.listen(PORT, () => {
  console.log(`🚀 Server chạy tại http://localhost:${PORT}`);
});
