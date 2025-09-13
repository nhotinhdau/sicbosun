import express from "express";
import axios from "axios";

const app = express();
const PORT = process.env.PORT || 3000;

// URL gốc của API (bạn thay link thật của bạn ở đây)
const API_URL = "https://api.wsktnus8.net/v2/history/getLastResult?gameId=ktrng_3979&size=1&tableId=39791215743193&curPage=1";

// Cache phiên mới nhất
let latestResult = null;

// Hàm chuẩn hóa dữ liệu về 1 format thống nhất
function normalize(data) {
  if (!data) return null;

  // Trường hợp có facesList
  if (data.gameNum && Array.isArray(data.facesList)) {
    const [d1, d2, d3] = data.facesList.map(Number);
    return {
      Phien: String(data.gameNum).replace(/^#/, ""),
      Xuc_xac_1: d1,
      Xuc_xac_2: d2,
      Xuc_xac_3: d3,
      Tong: d1 + d2 + d3,
    };
  }

  // Trường hợp có state + data.OpenCode
  if (data.state === 1 && data.data?.OpenCode) {
    const [d1, d2, d3] = data.data.OpenCode.split(",").map(Number);
    return {
      Phien: data.data.Expect || data.data.ID,
      Xuc_xac_1: d1,
      Xuc_xac_2: d2,
      Xuc_xac_3: d3,
      Tong: d1 + d2 + d3,
    };
  }

  // Trường hợp có dices
  if (Array.isArray(data.dices)) {
    const [d1, d2, d3] = data.dices.map(Number);
    return {
      Phien: data.id || data.gameNum,
      Xuc_xac_1: d1,
      Xuc_xac_2: d2,
      Xuc_xac_3: d3,
      Tong: d1 + d2 + d3,
    };
  }

  return null;
}

// Hàm fetch dữ liệu và cập nhật cache
async function fetchData() {
  try {
    const res = await axios.get(API_URL, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 5000,
    });
    const data = res.data?.data?.[0] || res.data?.data || res.data;
    const parsed = normalize(data);
    if (parsed) {
      latestResult = parsed;
      console.log("✅ Cập nhật:", latestResult);
    } else {
      console.log("⚠️ Không parse được:", res.data);
    }
  } catch (err) {
    console.log("❌ Fetch lỗi:", err.response?.status || err.message);
  }
}

// Poll mỗi 5 giây để luôn có phiên mới nhất
setInterval(fetchData, 5000);
fetchData(); // gọi ngay khi start

// API public (client chỉ đọc cache, không gọi API gốc)
app.get("/api/lxk", (req, res) => {
  if (latestResult) return res.json(latestResult);
  return res.status(503).json({ error: "Chưa có dữ liệu, vui lòng thử lại." });
});

app.listen(PORT, () => console.log(`Server chạy cổng ${PORT}`));
