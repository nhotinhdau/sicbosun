const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// URL API gốc
const SOURCE_API_URL = 'https://api.wsktnus8.net/v2/history/getLastResult?gameId=ktrng_3979&size=100&tableId=39791215743193&curPage=1';

// Cache data
let latestResult = null;
let lastFetchTime = 0;
const CACHE_LIFETIME = 3000; // Cache time: 3 seconds

// Function to fetch data with retry and format flexibility
async function fetchDataWithRetry(retries = 3) {
  const now = Date.now();
  // Use cache if data is fresh
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
      let rawData = null;

      // Try to parse different data structures
      if (data?.list?.[0]?.id && data?.list?.[0]?.dices) {
        // First format: { list: [ { id, dices, ... } ] }
        rawData = data.list[0];
        console.log("✅ Detected API format: { list: [ { id, dices, ... } ] }");
        latestResult = {
          gameNum: `#${rawData.id}`,
          score: rawData.point,
          facesList: rawData.dices
        };
      } else if (data?.resultList?.[0]?.gameNum && data?.resultList?.[0]?.facesList) {
        // Second format: { resultList: [ { gameNum, facesList, ... } ] }
        rawData = data.resultList[0];
        console.log("✅ Detected API format: { resultList: [ { gameNum, facesList, ... } ] }");
        const score = rawData.facesList.reduce((sum, face) => sum + face, 0);
        latestResult = {
          gameNum: rawData.gameNum,
          score: score,
          facesList: rawData.facesList
        };
      } else if (data?.Phien && data?.Tong && data?.Xuc_xac_1) {
        // Third format: { Phien, Tong, Xuc_xac_1, ... }
        rawData = data;
        console.log("✅ Detected API format: { Phien, Tong, Xuc_xac_1, ... }");
        latestResult = {
          gameNum: `#${rawData.Phien}`,
          score: rawData.Tong,
          facesList: [rawData.Xuc_xac_1, rawData.Xuc_xac_2, rawData.Xuc_xac_3]
        };
      } else {
        // If no format matches, throw an error
        throw new Error("Không thể nhận diện định dạng dữ liệu từ API gốc.");
      }

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
        throw err; // Throw error if not a 429
      }
    }
  }
  // If all retries fail, throw the last error
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

          
