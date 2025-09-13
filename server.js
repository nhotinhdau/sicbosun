const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// URL API gốc
const SOURCE_API_URL = 'https://api.wsktnus8.net/v2/history/getLastResult?gameId=ktrng_3979&size=100&tableId=39791215743193&curPage=1';

// Cache lưu dữ liệu
let latestResult = null;
let lastFetchTime = 0;
const CACHE_LIFETIME = 3000; // Thời gian cache: 3 giây

// Hàm fetch API gốc với cơ chế thử lại
async function fetchDataWithRetry(retries = 3) {
  const now = Date.now();
  // Sử dụng cache nếu dữ liệu vẫn còn mới
  if (now - lastFetchTime < CACHE_LIFETIME && latestResult) {
    console.log("✅ Dùng dữ liệu từ cache.");
    return latestResult;
  }

  let error = null;
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`⏳ Đang thử lấy dữ liệu từ API gốc (lần ${i + 1}/${retries})...`);
      const response = await axios.get(SOURCE_API_URL, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
          "Accept": "application/json,text/plain,/"
        }
      });

      const data = response.data;
      const raw = data?.list?.[0] || data;

      if (!raw || !raw.id || !raw.dices) {
        throw new Error("API gốc trả về dữ liệu không hợp lệ");
      }

      // Chuẩn hóa sang định dạng mới
      latestResult = {
        gameNum: `#${raw.id}`,
        score: raw.point,
        resultType: raw.resultTruyenThong?.toLowerCase() === "tai" ? 1 : raw.resultTruyenThong?.toLowerCase() === "xiu" ? 2 : 3,
        facesList: raw.dices
      };

      lastFetchTime = Date.now();
      console.log("✅ Lấy dữ liệu thành công!");
      return latestResult;
      
    } catch (err) {
      error = err;
      if (err.response && err.response.status === 429) {
        const delay = Math.pow(2, i) * 1000; // Exponential backoff: 1s, 2s, 4s
        console.warn(`⚠️ Lỗi 429 (Too Many Requests). Đang đợi ${delay / 1000} giây để thử lại...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error(`❌ Lỗi khi gọi API gốc: ${err.message}`);
        throw err; // Ném lỗi nếu không phải là 429
      }
    }
  }
  // Nếu tất cả các lần thử lại đều thất bại, ném lỗi cuối cùng
  throw error;
}

// Endpoint
app.get('/api/lxk', async (req, res) => {
  try {
    const result = await fetchDataWithRetry();
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

                      
