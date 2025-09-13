// server.js
const express = require("express");
const axios = require("axios");
const NodeCache = require("node-cache");

const app = express();
const PORT = process.env.PORT || 3000;

// Cache dữ liệu để client gọi không tốn nhiều request API gốc
const cache = new NodeCache({ stdTTL: 60, checkperiod: 120 });

// URL API gốc (bạn thay vào API của bạn)
const API_URL = "https://api.wsktnus8.net/v2/history/getLastResult?gameId=ktrng_3979&size=100&tableId=39791215743193&curPage=1"; 

// Biến điều khiển polling
let intervalMs = 20000; // 20 giây mặc định
let backoff = 0;
let latestData = null;

// Hàm fetch dữ liệu có chống 429
async function fetchData() {
  try {
    const res = await axios.get(API_URL, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 7000,
    });

    const raw = res.data;

    if (!raw?.gameNum || !raw?.facesList) {
      console.log("⚠️ Sai format:", res.data);
      return;
    }

    latestData = {
      phien: raw.gameNum,
      xuc_xac: raw.facesList,
      tong: raw.facesList.reduce((a, b) => a + b, 0),
      ket_qua: raw.facesList.reduce((a, b) => a + b, 0) >= 11 ? "Tài" : "Xỉu",
      thoigian: new Date().toISOString(),
    };

    cache.set("latest", latestData);

    console.log("✅ Cập nhật phiên:", latestData.phien);

    // reset backoff khi thành công
    backoff = 0;
    intervalMs = 20000;
  } catch (err) {
    const code = err.response?.status || err.code || err.message;
    console.log("❌ Lỗi fetch:", code);

    if (code === 429) {
      // tăng thời gian chờ dần để né block
      backoff = backoff ? backoff * 2 : 30000;
      intervalMs = Math.min(backoff, 120000); // tối đa 2 phút
      console.log("⏳ Bị 429 → delay", intervalMs / 1000, "giây");
    }
  } finally {
    setTimeout(fetchData, intervalMs);
  }
}

// chạy vòng lặp fetch
fetchData();

// API cho client lấy dữ liệu mới nhất
app.get("/api/taixiu/latest", (req, res) => {
  if (!latestData) {
    return res.status(503).json({ error: "Chưa có dữ liệu" });
  }
  res.json(latestData);
});

app.listen(PORT, () => {
  console.log(`🚀 Server chạy tại http://localhost:${PORT}`);
});
