import express from "express";
import axios from "axios";

const app = express();
const PORT = process.env.PORT || 3000;

const API_URL = "https://api.wsktnus8.net/v2/history/getLastResult?gameId=ktrng_3979&size=100&tableId=39791215743193&curPage=1";

let latestResult = null;
let isFetching = false;
let lastGameNum = null;
let intervalMs = 10000; // poll mặc định 10s

// Hàm fetch API gốc
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

    // Nếu có phiên mới → log ngay và giữ tốc độ
    if (raw.gameNum !== lastGameNum) {
      console.log("🎯 Phiên mới:", latestResult);
      lastGameNum = raw.gameNum;
      intervalMs = 10000; // giữ poll nhanh khi đang có phiên mới
    } else {
      // Nếu trùng phiên cũ → giảm tốc để tránh spam
      intervalMs = 15000;
    }
  } catch (err) {
    const code = err.response?.status || err.code || err.message;
    console.log("❌ Lỗi fetch:", code);

    // Nếu bị 429 → chờ lâu hơn
    if (code === 429) {
      intervalMs = 30000;
    }
  } finally {
    isFetching = false;
    scheduleNext();
  }
}

// Lên lịch gọi tiếp
function scheduleNext() {
  setTimeout(fetchData, intervalMs);
}

// Bắt đầu fetch ngay khi khởi động
fetchData();

// Endpoint client đọc cache
app.get("/api/lxk", (req, res) => {
  if (latestResult) return res.json(latestResult);
  return res.status(503).json({ error: "Chưa có dữ liệu, vui lòng thử lại." });
});

app.listen(PORT, () => {
  console.log(`🚀 Server chạy http://localhost:${PORT}`);
});
