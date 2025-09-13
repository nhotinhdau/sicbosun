import express from "express";
import axios from "axios";

const app = express();
const PORT = process.env.PORT || 3000;

// 👉 Thay link API gốc thật của bạn ở đây
const API_URL = "https://api.wsktnus8.net/v2/history/getLastResult?gameId=ktrng_3979&size=100&tableId=39791215743193&curPage=1";

// Cache phiên cuối cùng
let latestResult = null;

// Hàm fetch API gốc
async function fetchData() {
  try {
    const res = await axios.get(API_URL, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 5000,
    });

    const raw = res.data?.data?.[0] || res.data; // phòng nhiều format
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

    console.log("✅ Cập nhật:", latestResult);
  } catch (err) {
    console.log("❌ Lỗi fetch API:", err.response?.status || err.message);
  }
}

// Poll 5s/lần để luôn có phiên mới
setInterval(fetchData, 5000);
fetchData(); // gọi ngay khi start

// Endpoint client đọc cache
app.get("/api/lxk", (req, res) => {
  if (latestResult) return res.json(latestResult);
  return res.status(503).json({ error: "Chưa có dữ liệu, vui lòng thử lại." });
});

app.listen(PORT, () => {
  console.log(`🚀 Server chạy http://localhost:${PORT}`);
});
