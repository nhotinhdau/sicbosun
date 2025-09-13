const express = require("express");
const axios = require("axios");
const app = express();
const PORT = process.env.PORT || 3000;

// 👉 Link API gốc
const SOURCE_API_URL = "https://wtx.tele68.com/v1/tx/sessions"; // thay link gốc

let latestResult = null;

// ===== Hàm tính kết quả =====
function getKetQua(d1, d2, d3) {
  if (d1 === d2 && d2 === d3) return "Bão"; // 3 xúc xắc giống nhau
  const tong = d1 + d2 + d3;
  if (tong >= 4 && tong <= 10) return "Xỉu";
  if (tong >= 11 && tong <= 17) return "Tài";
  return "Không xác định";
}

// ===== Hàm fetch API gốc =====
async function fetchAPI() {
  try {
    const res = await axios.get(SOURCE_API_URL, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    const json = res.data;

    if (json?.gameNum && Array.isArray(json.facesList)) {
      const [d1, d2, d3] = json.facesList;
      latestResult = {
        Phien: json.gameNum.replace("#", ""),
        Xuc_xac_1: d1,
        Xuc_xac_2: d2,
        Xuc_xac_3: d3,
        Tong: json.score,
        Ket_qua: getKetQua(d1, d2, d3),
        id: "@cskhtoollxk"
      };
      console.log("✅ Phiên mới:", latestResult);
    }
  } catch (err) {
    console.error("❌ Lỗi fetch API:", err.message);
  }
}

// Endpoint public
app.get("/api/taixiu", (req, res) => {
  if (latestResult) {
    res.json(latestResult);
  } else {
    res.status(503).json({ error: "Chưa có dữ liệu, server đang fetch..." });
  }
});

// Endpoint mặc định
app.get("/", (req, res) => {
  res.send("👉 API Phiên Gần Nhất. Truy cập /api/taixiu để xem kết quả.");
});

// Fetch mỗi 5s
setInterval(fetchAPI, 5000);
fetchAPI();

app.listen(PORT, () => {
  console.log(`🚀 Server chạy trên cổng ${PORT}`);
});
