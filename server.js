const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const Patient = require('./models/Patient')
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

// 3. API ดึงข้อมูลผู้ป่วยทั้งหมด (GET)
app.get('/api/patients', async (req, res) => {
  try {
    const patients = await Patient.find(); // สั่งให้ไปหาข้อมูลทั้งหมดใน MongoDB
    res.json(patients); // ส่งกลับไปให้ React
  } catch (error) {
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูล" });
  }
}); 

// 4. API เพิ่มข้อมูลผู้ป่วยใหม่ (POST)
app.post('/api/patients', async (req, res) => {
  try {
    const newPatient = new Patient(req.body); // เอาข้อมูลที่ React ส่งมา (req.body) ไปใส่แม่พิมพ์
    const savedPatient = await newPatient.save(); // สั่งเซฟลง MongoDB
    res.status(201).json(savedPatient); // ส่งข้อมูลที่เซฟสำเร็จกลับไปยืนยัน
  } catch (error) {
    res.status(400).json({ message: "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบ" });
  }
})

// 5. API ลบข้อมูลผู้ป่วย (DELETE)
app.delete('/api/patients/:id', async (req, res) => {
  try {
    const patientId = req.params.id; // รับรหัส _id ที่หน้าบ้านส่งมาผ่าน URL
    await Patient.findByIdAndDelete(patientId); // สั่ง Mongoose ให้ไปตามหาและลบทิ้ง
    res.json({ message: "ลบข้อมูลผู้ป่วยออกจากระบบเรียบร้อย" }); // ส่งข้อความกลับไปบอกว่าลบเสร็จแล้ว
  } catch (error) {
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการลบข้อมูล" });
  }
})

// 6. API แก้ไขข้อมูลผู้ป่วย (PUT)
app.put('/api/patients/:id', async (req, res) => {
  try {
    const patientId = req.params.id; // ดึงรหัส _id จาก URL
    const updateData = req.body; // ดึงข้อมูลชุดใหม่ที่ส่งมาจาก React

    // สั่ง Mongoose ให้หาคนที่มี id ตรงกัน แล้วเอา updateData ไปทับ
    // { new: true } คือคำสั่งบังคับให้ Mongoose ส่งข้อมูล "เวอร์ชันใหม่ที่แก้เสร็จแล้ว" กลับมาให้เรา
    const updatedPatient = await Patient.findByIdAndUpdate(patientId, updateData, { new: true });
    res.json(updatedPatient); // ส่งข้อมูลใหม่กลับไปให้ React
  } catch (error) {
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการอัปเดตข้อมูล" });
  }
})

// 7. สั่งให้เซิร์ฟเวอร์เปิดทำการ
app.listen(PORT, () => {
  console.log(`🚀 API Server เปิดทำงานแล้วที่ http://localhost:${PORT}`);
});