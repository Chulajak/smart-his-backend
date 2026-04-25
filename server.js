const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

// 1. สร้างตัวจัดการเซิร์ฟเวอร์
const app = express();
const PORT = 5000; // เราจะให้ Backend วิ่งที่พอร์ต 5000 (React มักจะใช้ 5173 หรือ 3000)

// 2. ตั้งค่า Middleware (ด่านตรวจ)
app.use(cors()); // อนุญาตให้เชื่อมต่อข้ามโดเมนได้
app.use(express.json()); // ให้เซิร์ฟเวอร์อ่านข้อมูลแบบ JSON ได้

// ==========================================
// 🔌 โค้ดส่วนที่เชื่อมต่อกับ MongoDB
// ==========================================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('🟢 เชื่อมต่อ MongoDB สำเร็จแล้ว!'))
  .catch((err) => console.log('🔴 เชื่อมต่อฐานข้อมูลล้มเหลว:', err));

// Route หน้าบ้าน (ทดสอบ)
app.get('/', (req, res) => {
  res.send('<h1>ยินดีต้อนรับสู่ Smart HIS Backend API! 🚀</h1>');
});

// 3. สร้าง Route (ช่องทางรับออเดอร์ GET)
app.get('/api/patients', (req, res) => {
  // สมมติว่านี่คือข้อมูลที่ดึงมาจากฐานข้อมูล (เดี๋ยวเราค่อยต่อ Database จริงวันหลัง)
  const mockPatients = [
    { id: 1, name: "สมชาย ใจดี", email: "somchai@email.com", phone: "081-111-1111" },
    { id: 2, name: "สมหญิง รักเรียน", email: "somying@email.com", phone: "082-222-2222" }
  ];
  
  // ส่งข้อมูลกลับไปให้คนที่เรียก (React) ในรูปแบบ JSON
  res.json(mockPatients);
});

// 4. สั่งให้เซิร์ฟเวอร์เปิดทำการ
app.listen(PORT, () => {
  console.log(`🚀 API Server เปิดทำงานแล้วที่ http://localhost:${PORT}`);
});