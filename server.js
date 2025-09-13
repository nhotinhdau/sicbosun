const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

const SOURCE_API_URL = 'https://api.wsktnus8.net/v2/history/getLastResult?gameId=ktrng_3979&size=100&tableId=39791215743193&curPage=1';

// Biến cache
let latestResult = null;

// Hàm chuẩn hóa dữ liệu
function parseResult(raw) {
  if (!raw || !raw.id || !raw.dices) return null;

  const dices = raw.dices;
  const point = raw.point;
  let ketQua = raw.resultTruyenThong || "";

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

// Hàm fetch API gốc
async function fetchAPI() {
  try {
    const response = await axios.get(SOURCE_API_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json"
      },
      timeout: 8000
    });

    const data = response.data;
    const raw = data?.list?.[0] || data;
    const parsed = parseResult(raw);

    if (parsed) {
      latestResult = parsed;
      console.log("✅ Lấy phiên mới:", parsed);
    } else {
      console.warn("⚠️ Không parse được dữ liệu:", raw);
    }

  } catch (error) {
    if (error.response && error.response.status === 429) {
      console.error("⏳ Dính 429, giữ phiên cũ và thử lại sau...");
    } else {
      console.error("❌ Lỗi fetch API gốc:", error.message);
    }
  }
}

// Endpoint
app.get('/api/lxk', (req, res) => {
  if (latestResult) {
    res.json(latestResult); // Trả phiên mới nhất trong cache
  } else {
    res.status(503).json({ error: "Chưa có dữ liệu, vui lòng thử lại sau." });
  }
});

app.get('/', (req, res) => {
  res.send('👉 API Phiên Gần Nhất. Truy cập /api/lxk để xem kết quả.');
});

// Cập nhật phiên định kỳ
setInterval(fetchAPI, 10000); // gọi 10s/lần
fetchAPI(); // gọi ngay khi start

app.listen(PORT, () => {
  console.log(`🚀 Server chạy trên cổng ${PORT}`);
});
