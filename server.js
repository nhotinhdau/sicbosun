const express = require("express");
const axios = require("axios"); // Import axios
const rateLimit = require("express-rate-limit");

const app = express();
const PORT = process.env.PORT || 3000;

// URL API gốc của bạn
const API_URL = "https://api.wsktnus8.net/v2/history/getLastResult?gameId=ktrng_3979&size=100&tableId=39791215743193&curPage=1"; // Thay thế bằng URL API của bạn

// Biến lưu phiên mới nhất
let latestResult = null;

// Hàm lấy dữ liệu từ API
async function fetchLatestResult() {
    try {
        const response = await axios.get(API_URL);
        const json = response.data;
        
        // Chuyển đổi dữ liệu về đúng format
        latestResult = {
            gameNum: json.Phien,
            score: json.Tong,
            resultType: json.Ket_qua,
            facesList: [
                json.Xuc_xac_1,
                json.Xuc_xac_2,
                json.Xuc_xac_3
            ]
        };

        console.log("🎲 Phiên mới nhất:", latestResult);
    } catch (err) {
        console.error("❌ Lỗi khi lấy dữ liệu từ API:", err.message);
    }
}

// Lấy dữ liệu lần đầu
fetchLatestResult();

// Lập lịch để lấy dữ liệu định kỳ mỗi 1 giây (1000ms)
setInterval(fetchLatestResult, 1000);

// --- Cấu hình Rate Limiter cho API ---
const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 phút
    max: 10, // Giới hạn mỗi IP chỉ được gọi 10 request trong 1 phút
    message: "🚫 Quá nhiều yêu cầu từ IP này, vui lòng thử lại sau 1 phút.",
    statusCode: 429,
    headers: true,
});

// REST API lấy phiên mới nhất
app.get("/api/lxk", apiLimiter, (req, res) => {
    if (!latestResult) {
        return res.status(503).json({
            error: "Chưa có dữ liệu",
            details: "Vui lòng thử lại sau vài giây."
        });
    }
    res.json(latestResult);
});

// Endpoint mặc định
app.get("/", (req, res) => {
    res.send("API Tai Xiu. Truy cap /api/taixiu/latest de xem phien moi nhat.");
});

app.listen(PORT, () => {
    console.log(`🚀 Server chay tai http://localhost:${PORT}`);
});
