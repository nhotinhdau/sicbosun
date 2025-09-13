const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// URL API gốc Gooca
const SOURCE_API_URL = 'https://api.wsktnus8.net/v2/history/getLastResult?gameId=ktrng_3979&size=100&tableId=39791215743193&curPage=1'; // 👉 thay đúng URL b có nhé

// Endpoint: phiên gần nhất
app.get('/api/lxk', async (req, res) => {
    try {
        const response = await axios.get(SOURCE_API_URL);
        const data = response.data;

        if (!data || !data.data || !data.data.resultList || data.data.resultList.length === 0) {
            return res.status(500).json({
                error: "Dữ liệu từ API gốc không hợp lệ hoặc rỗng."
            });
        }

        const latestResult = data.data.resultList[0];
        const dices = latestResult.facesList; // [4,3,6]
        const tong = latestResult.score;
        const ketQua = (tong >= 4 && tong <= 10) ? "Xỉu" : "Tài";

        const result = {
            Phien: parseInt(latestResult.gameNum.replace("#", "")),
            Xuc_xac_1: dices[0],
            Xuc_xac_2: dices[1],
            Xuc_xac_3: dices[2],
            Tong: tong,
            Ket_qua: ketQua
        };

        res.json(result);

    } catch (error) {
        console.error("Lỗi khi gọi API gốc:", error.message);
        res.status(500).json({
            error: "Không thể lấy dữ liệu từ API gốc.",
            details: error.message
        });
    }
});

// Default route
app.get('/', (req, res) => {
    res.send('API Lấy Phiên Tài Xỉu (Gooca). Truy cập /api/taixiu/phien_gan_nhat để xem kết quả.');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
