const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// URL API gốc
const SOURCE_API_URL = 'https://api.wsktnus8.net/v2/history/getLastResult?gameId=ktrng_3979&size=100&tableId=39791215743193&curPage=1';

// Cache lưu dữ liệu
let latestResult = null;
let lastFetchTime = 0;

// Hàm fetch API gốc
async function fetchData() {
  const now = Date.now();
  if (now - lastFetchTime < 3000 && latestResult) {
    return latestResult; // Dùng cache nếu mới fetch < 3s
  }

  try {
    const response = await axios.get(SOURCE_API_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        "Accept": "application/json,text/plain,*/*"
      }
    });

    const data = response.data;
    const raw = data?.list?.[0] || data;

    if (!raw || !raw.id || !raw.dices) {
      throw new Error("API gốc trả về dữ liệu không hợp lệ");
    }

    const dices = raw.dices;
    const point = raw.point;
    let ketQua = raw.resultTruyenThong;

    // Chuẩn hóa kết quả
    if (ketQua?.toLowerCase() === "tai") ketQua = "Tài";
    else if (ketQua?.toLowerCase() === "xiu") ketQua = "Xỉu";
    else ketQua = "Bão";

    latestResult = {
      Ket_qua: ketQua,
      Phien: `${raw.id}`,
      Tong: point,
      Xuc_xac_1: dices[0],
      Xuc_xac_2: dices[1],
      Xuc_xac_3: dices[2],
      id: "@cskhtoollxk"
    };

    lastFetchTime = now;
    return latestResult;

  } catch (error) {
    console.error("❌ Lỗi khi gọi API gốc:", error.message);
    throw error;
  }
}

// Endpoint
app.get('/api/lxk', async (req, res) => {
  try {
    const result = await fetchData();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: "Không thể lấy dữ liệu từ API gốc.",
      details: error.message
    });
  }
});

app.get('/', (req, res) => {
  res.send('👉 API Phiên Gần Nhất. Truy cập /api/lxk để xem kết quả.');
});

app.listen(PORT, () => {
  console.log(`🚀 Server chạy trên cổng ${PORT}`);
});
