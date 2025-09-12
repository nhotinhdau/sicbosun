const express = require('express');
const axios = require('axios');
const NodeCache = require('node-cache');
const app = express();
const PORT = process.env.PORT || 3000;

// Cache lịch sử (1h)
const historicalDataCache = new NodeCache({ stdTTL: 3600, checkperiod: 120 });

// URL API gốc
const SUNWIN_API_URL = 'https://api.wsktnus8.net/v2/history/getLastResult?gameId=ktrng_3979&size=100&tableId=39791215743193&curPage=1';

// Quản lý lịch sử
class HistoricalDataManager {
    constructor(maxHistoryLength = 500) {
        this.history = [];
        this.maxHistoryLength = maxHistoryLength;
    }

    addSession(newData) {
        if (!newData || !newData.phien) return false;
        if (this.history.some(item => item.phien === newData.phien)) {
            return false;
        }

        this.history.push(newData);
        if (this.history.length > this.maxHistoryLength) {
            this.history = this.history.slice(this.history.length - this.maxHistoryLength);
        }
        this.history.sort((a, b) => a.phien - b.phien);
        return true;
    }

    getHistory() {
        return [...this.history];
    }

    getRecentHistory(count) {
        return this.history.slice(-count);
    }

    calculateFrequency(dataSubset) {
        let taiCount = 0, xiuCount = 0;
        if (!dataSubset || dataSubset.length === 0) {
            return { taiCount: 0, xiuCount: 0, totalCount: 0, taiRatio: 0, xiuRatio: 0 };
        }
        dataSubset.forEach(item => {
            if (item.ket_qua && item.ket_qua.toLowerCase() === 'tài') taiCount++;
            else if (item.ket_qua && item.ket_qua.toLowerCase() === 'xỉu') xiuCount++;
        });
        const totalCount = dataSubset.length;
        return {
            taiCount,
            xiuCount,
            totalCount,
            taiRatio: totalCount > 0 ? taiCount / totalCount : 0,
            xiuRatio: totalCount > 0 ? xiuCount / totalCount : 0
        };
    }

    calculateCurrentSequence(dataSubset, resultType) {
        if (!dataSubset || dataSubset.length === 0) return 0;
        let count = 0;
        const lastResultType = resultType.toLowerCase();
        for (let i = dataSubset.length - 1; i >= 0; i--) {
            if (dataSubset[i].ket_qua && dataSubset[i].ket_qua.toLowerCase() === lastResultType) count++;
            else break;
        }
        return count;
    }
}

// Engine dự đoán
class PredictionEngine {
    constructor(historyMgr) {
        this.historyMgr = historyMgr;
        this.baseWeights = {
            bet: 5.0,
            dao11: 4.5,
            dao22: 4.0,
            dao33: 3.8,
            tyLeApDao: 3.0,
            mauLapLai: 3.5,
            uuTienGanDay: 3.2,
            default: 1.0
        };
    }

    duDoanVi(tong) {
        if (!tong) return [];
        return [
            ((tong % 6) + 10),
            ((tong % 6) + 11),
            ((tong % 6) + 12)
        ];
    }

    predict() {
        const fullHistory = this.historyMgr.getHistory();
        const historyLength = fullHistory.length;

        if (historyLength === 0) {
            return this.buildResult("Chưa xác định", 10, "Không có dữ liệu");
        }

        const recentHistory = this.historyMgr.getRecentHistory(100);
        const lastResult = recentHistory[recentHistory.length - 1].ket_qua;

        if (historyLength === 1) {
            const du_doan = (lastResult.toLowerCase() === 'tài') ? "Xỉu" : "Tài";
            return this.buildResult(du_doan, 30, "Dữ liệu còn ít, đảo chiều");
        }

        let predictionScores = { 'Tài': 0, 'Xỉu': 0 };
        let dynamicWeights = { ...this.baseWeights };

        const recent30 = this.historyMgr.getRecentHistory(30);
        const recent10 = this.historyMgr.getRecentHistory(10);
        const recent20 = this.historyMgr.getRecentHistory(20);

        const taiSeq = this.historyMgr.calculateCurrentSequence(recent10, 'Tài');
        const xiuSeq = this.historyMgr.calculateCurrentSequence(recent10, 'Xỉu');
        if (taiSeq >= 4) {
            predictionScores['Xỉu'] += taiSeq * dynamicWeights.bet;
        } else if (xiuSeq >= 4) {
            predictionScores['Tài'] += xiuSeq * dynamicWeights.bet;
        }

        if (this.isAlternating(recent10, 1) && recent10.length >= 6) {
            const nextPred = (lastResult.toLowerCase() === 'tài') ? "Xỉu" : "Tài";
            predictionScores[nextPred] += dynamicWeights.dao11;
        }

        if (this.isAlternating(recent10, 2) && recent10.length >= 8) {
            const nextPred = (lastResult.toLowerCase() === 'tài') ? "Xỉu" : "Tài";
            predictionScores[nextPred] += dynamicWeights.dao22;
        }

        if (this.isAlternating(recent20, 3) && recent20.length >= 12) {
            const nextPred = (lastResult.toLowerCase() === 'tài') ? "Xỉu" : "Tài";
            predictionScores[nextPred] += dynamicWeights.dao33;
        }

        if (recent20.length >= 10) {
            const last5 = recent20.slice(-5).map(r => r.ket_qua).join("");
            const prev5 = recent20.slice(-10, -5).map(r => r.ket_qua).join("");
            if (last5.toLowerCase() === prev5.toLowerCase()) {
                const nextPred = last5.toLowerCase()[0] === 't' ? "Tài" : "Xỉu";
                predictionScores[nextPred] += dynamicWeights.mauLapLai;
            }
        }

        if (recent10.length >= 7) {
            const taiCount = recent10.filter(r => r.ket_qua && r.ket_qua.toLowerCase() === 'tài').length;
            const xiuCount = recent10.filter(r => r.ket_qua && r.ket_qua.toLowerCase() === 'xỉu').length;
            if (taiCount >= 5) {
                predictionScores['Tài'] += dynamicWeights.uuTienGanDay;
            } else if (xiuCount >= 5) {
                predictionScores['Xỉu'] += dynamicWeights.uuTienGanDay;
            }
        }

        if (recent30.length >= 10) {
            const { taiRatio, xiuRatio } = this.historyMgr.calculateFrequency(recent30);
            if (Math.abs(taiRatio - xiuRatio) > 0.3) {
                const nextPred = (taiRatio > xiuRatio) ? "Xỉu" : "Tài";
                predictionScores[nextPred] += (Math.abs(taiRatio - xiuRatio) * 10) * dynamicWeights.tyLeApDao;
            }
        }

        const defaultPrediction = (lastResult.toLowerCase() === 'tài') ? "Xỉu" : "Tài";
        predictionScores[defaultPrediction] += dynamicWeights.default;

        let finalPrediction = predictionScores['Tài'] > predictionScores['Xỉu'] ? 'Tài' : 'Xỉu';
        let finalScore = predictionScores[finalPrediction];
        const totalScore = predictionScores['Tài'] + predictionScores['Xỉu'];
        let confidence = (finalScore / totalScore) * 100;

        confidence = confidence * Math.min(1, historyLength / 100);
        confidence = Math.min(99.99, Math.max(10, confidence));

        return this.buildResult(finalPrediction, confidence, "Dựa trên chuỗi gần nhất và mẫu thống kê");
    }

    isAlternating(history, groupSize) {
        if (history.length < groupSize * 2) return false;
        const recent = history.slice(-groupSize * 2);
        return recent.slice(0, groupSize).every(r => r.ket_qua && recent[groupSize].ket_qua && r.ket_qua.toLowerCase() !== recent[groupSize].ket_qua.toLowerCase());
    }

    buildResult(du_doan, do_tin_cay, giai_thich) {
        return { du_doan, do_tin_cay: do_tin_cay.toFixed(2), giai_thich };
    }
}

const historyManager = new HistoricalDataManager(500);
const predictionEngine = new PredictionEngine(historyManager);

// Hàm hỗ trợ gọi API với retry
async function fetchDataWithRetry(url, retries = 5, delay = 2000) {
    try {
        const response = await axios.get(url, { timeout: 10000 });
        return response.data;
    } catch (error) {
        if (error.response && error.response.status === 429 && retries > 0) {
            console.warn(`Đã nhận lỗi 429, đang thử lại sau ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchDataWithRetry(url, retries - 1, delay * 2);
        }
        throw error;
    }
}

// API chính
app.get('/concac/ditme/lxk', async (req, res) => {
    try {
        const currentData = await fetchDataWithRetry(SUNWIN_API_URL);

        if (!currentData || !currentData.Phien || !currentData.Ket_qua || !currentData.Tong) {
            return res.status(500).json({
                error: "Dữ liệu từ API gốc không hợp lệ.",
                chi_tiet: currentData
            });
        }

        // Chuẩn hoá dữ liệu từ API gốc
        const normalizedData = {
            phien: parseInt(currentData.Phien.toString().replace('#', '')),
            ket_qua: currentData.Ket_qua,
            tong: currentData.Tong,
            xuc_xac: [
                currentData.Xuc_xac_1,
                currentData.Xuc_xac_2,
                currentData.Xuc_xac_3
            ]
        };

        // Lưu lịch sử để dự đoán
        historyManager.addSession(normalizedData);

        // Chạy dự đoán cho phiên sau
        const { du_doan, do_tin_cay, giai_thich } = predictionEngine.predict();

        // Build response cuối cùng
        const result = {
            id: "@cskhtoollxk",
            phien_truoc: normalizedData.phien,
            ket_qua: normalizedData.ket_qua,
            xuc_xac: normalizedData.xuc_xac,
            tong: normalizedData.tong,
            phien_sau: normalizedData.phien + 1,
            du_doan,
            do_tin_cay,
            du_doan_vi: predictionEngine.duDoanVi(normalizedData.tong),
            giai_thich
        };

        res.json(result);
    } catch (error) {
        console.error("Lỗi API:", error.message);
        res.status(500).json({ error: "API lỗi", chi_tiet: error.message });
    }
});

app.get('/', (req, res) => {
    res.send('API Sicbo Prediction đang chạy 🚀');
});

app.listen(PORT, () => {
    console.log(`Server đang chạy trên cổng ${PORT}`);
});
