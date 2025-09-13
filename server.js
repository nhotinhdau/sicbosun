const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

const API_URL = "https://api.wsktnus8.net/v2/history/getLastResult?gameId=ktrng_3979&size=100&tableId=39791215743193&curPage=1";

let latestResult = null;
let lastGameNum = null;
let isFetching = false;
let intervalMs = 10000; // 10s mặc định

async function fetchData() {
  if (isFetching) return;
  isFetching = true;

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

    const [d1, d2, d3] = raw.facesList.map(Number);
    const tong = d1 + d2 + d3;

    let ketQua = "Không xác định";
    if (d1 === d2 && d2 === d3) ketQua = "Bão";
    else if (tong >= 4 && tong <= 10) ketQua = "Xỉu";
    else if (tong >= 11 && tong <= 17) ketQua = "Tài";

    latestResult = {
      Phien: raw.gameNum.replace("#", ""),
      Xuc_xac_1: d1,
      Xuc_xac_2: d2,
      Xuc_xac_3: d3,
      Tong: tong,
      Ket_qua: ketQua,
    };

    if (raw.gameNum !== lastGameNum) {
      console.log("🎯 Phiên mới:", latestResult);
      lastGameNum = raw.gameNum;
      intervalMs = 10000; // giữ poll nhanh khi có phiên mới
    } else {
      intervalMs = 15000; // chậm lại nếu chưa có phiên mới
    }
  } catch (err) {
    const code = err.response?.status || err.code || err.message;
    console.log("❌ Lỗi fetch:", code);

    if (code === 429) {
      intervalMs = 30000; // nếu bị limit thì đợi lâu hơn
    }
  } finally {
    isFetching = false;
    setTimeout(fetchData, intervalMs);
  }
}

fetchData();

app.get("/api/lxk", (req, res) => {
  if (latestResult) return res.json(latestResult);
  return res.status(503).json({ error: "Chưa có dữ liệu, vui lòng thử lại." });
});

app.listen(PORT, () => {
  console.log(`🚀 Server chạy tại cổng ${PORT}`);
});
