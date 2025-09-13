const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// URL API gốc
const SOURCE_API_URL = 'https://api.wsktnus8.net/v2/history/getLastResult?gameId=ktrng_3979&size=100&tableId=39791215743193&curPage=1';

// Cache dữ liệu
let latestResult = null;

// ===== Hàm chuẩn hóa kết quả =====
function parseResult(raw) {
  if (!raw || !raw.id || !raw.dices) return null;

  const dices = raw.dices;
  const point = raw.point;
  let ketQua = raw.resultTruyenThong || "";

  // Chuẩn hóa kết quả
  if (ketQua.toLowerCase() === "tai") ketQua = "Tài";
  else if (ketQua.toLowerCase() === "xiu") ketQua = "Xỉu";
  else ketQua = "Bão";

  return {
    Ket_qua: ketQua,
    Phien: `${raw.id}`,
    Tong: point,
    Xuc_xac_1: dices[0],
    Xuc_xac_2: dices[1],
    Xuc_xac_3: dices[2],
    id: "@anhbaocx"
  };
}

// ===== Hàm fetch API gốc định kỳ =====
async function fetchAPI() {
  try {
    const response = await axios.get(SOURCE_API_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        "Accept": "application/json,text/plain,*/*"
      }
    });

    const data = response.data;
    const raw = data?.list?.[0] || data;
    const parsed = parseResult(raw);

    if (parsed) {
      latestResult = parsed;
      console.log("✅ Cập nhật phiên mới:", parsed);
    } else {
      console.warn("⚠️ Không parse được dữ liệu:", raw);
    }
  } catch (error) {
    console.error("❌ Lỗi fetch API gốc:", error.message);
  }
}

// ===== Endpoint công khai =====
app.get('/api/lxk', (req, res) => {
  if (latestResult) {
    res.json(latestResult);
  } else {
    res.status(503).json({ error: "Chưa có dữ liệu, vui lòng thử lại sau." });
  }
});

// ===== Endpoint mặc định =====
app.get('/', (req, res) => {
  res.send('👉 API Phiên Gần Nhất. Truy cập /api/lxk để xem kết quả.');
});

// ===== Chạy định kỳ 5 giây fetch 1 lần =====
setInterval(fetchAPI, 5000);
fetchAPI(); // gọi ngay lần đầu khi server start

app.listen(PORT, () => {
  console.log(`🚀 Server chạy trên cổng ${PORT}`);
});
