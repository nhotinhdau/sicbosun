const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// URL của API gốc
const SOURCE_API_URL = 'https://api.wsktnus8.net/v2/history/getLastResult?gameId=ktrng_3979&size=100&tableId=39791215743193&curPage=1';

// Endpoint để lấy thông tin của phiên gần nhất
app.get('/api/sicbo', async (req, res) => {
    try {
        const response = await axios.get(SOURCE_API_URL);
        const data = response.data;

        // Kiểm tra dữ liệu
        if (!data || !data.list || !Array.isArray(data.list) || data.list.length === 0) {
            return res.status(500).json({
                error: "Dữ liệu từ API gốc không hợp lệ hoặc rỗng.",
                details: "Cấu trúc phản hồi không như mong đợi."
            });
        }

        const latestResult = data.list[0];
        const dices = latestResult.facesList;

        if (!Array.isArray(dices) || dices.length < 3) {
            return res.status(500).json({
                error: "Dữ liệu xúc xắc không hợp lệ.",
                details: "Không đủ 3 giá trị xúc xắc."
            });
        }

        // Tách xúc xắc
        const [x1, x2, x3] = dices;
        const tong = x1 + x2 + x3;
        const ket_qua = (tong >= 11 && tong <= 17) ? "Tài" : "Xỉu";

        // Format kết quả theo yêu cầu
        const result = {
            Phien: parseInt(latestResult.gameNum.replace('#', '')), // bỏ dấu #
            Xuc_xac_1: x1,
            Xuc_xac_2: x2,
            Xuc_xac_3: x3,
            Tong: tong,
            Ket_qua: ket_qua
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

// Endpoint mặc định
app.get('/', (req, res) => {
    res.send('Chào mừng đến với API Lấy Phiên Gần Nhất. Truy cập /api/taixiu/phien_gan_nhat để xem kết quả.');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
