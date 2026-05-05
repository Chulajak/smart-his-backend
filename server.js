const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Patient = require("./models/Patient");
const User = require("./models/User");
const verifyToken = require("./middleware/auth");
require("dotenv").config();

// 1. สร้างตัวจัดการเซิร์ฟเวอร์
const app = express();
const PORT = 5000; // เราจะให้ Backend วิ่งที่พอร์ต 5000 (React มักจะใช้ 5173 หรือ 3000)

// 2. ตั้งค่า Middleware (ด่านตรวจ)
app.use(cors()); // อนุญาตให้เชื่อมต่อข้ามโดเมนได้
app.use(express.json()); // ให้เซิร์ฟเวอร์อ่านข้อมูลแบบ JSON ได้

// ==========================================
// 🔌 โค้ดส่วนที่เชื่อมต่อกับ MongoDB
// ==========================================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("🟢 เชื่อมต่อ MongoDB สำเร็จแล้ว!"))
  .catch((err) => console.log("🔴 เชื่อมต่อฐานข้อมูลล้มเหลว:", err));

// Route หน้าบ้าน (ทดสอบ)
app.get("/", (req, res) => {
  res.send("<h1>ยินดีต้อนรับสู่ Smart HIS Backend API! 🚀</h1>");
});

// 3. API ดึงข้อมูลผู้ป่วยทั้งหมด (GET)
app.get("/api/patients", verifyToken, async (req, res) => {
  try {
    // รับค่า keyword, หน้าปัจจุบัน (page) และ จำนวนที่อยากได้ต่อหน้า (limit)
    // ถ้าหน้าเว็บไม่ได้ส่ง page มา ให้ถือว่าเป็นหน้า 1 และดึงมาแค่ 5 คนต่อหน้า
    const { keyword, page = 1, limit = 5 } = req.query;
    let queryCondition = {}; // สร้างเงื่อนไขการค้นหา

    if (keyword) {
      // ถ้ามีการพิมพ์ค้นหามา ให้ใช้ $regex ของ MongoDB (คล้ายๆ LIKE '%คำค้น%' ใน SQL)
      // $options: 'i' คือให้หาโดยไม่สนตัวพิมพ์เล็ก-ใหญ่
      // ใช้ $or เพื่อบอก MongoDB ว่า "หาจากชื่อ หรือ อีเมล หรือ เบอร์โทร ก็ได้นะ!"
      queryCondition = {
        $or: [
          { name: { $regex: keyword, $options: "i" } },
          { email: { $regex: keyword, $options: "i" } },
          { phone: { $regex: keyword, $options: "i" } },
        ],
      };
    }

    const skipIndex = (parseInt(page) - 1) * parseInt(limit); // คำนวณการข้ามข้อมูล เช่น ถ้าอยู่หน้า 2 (2-1) * 5 = ต้องข้าม 5 คนแรกทิ้งไป
    const patients = await Patient.find(queryCondition) // ดึงข้อมูลแบบ "จำกัดจำนวน" 
      .sort({ createdAt: -1 })
      .skip(skipIndex) // สั่งข้าม
      .limit(parseInt(limit)); // สั่งจำกัด

    const totalPateints = await Patient.countDocuments(queryCondition); // นับจำนวนคนไข้ "ทั้งหมด" ในฐานข้อมูล เพื่อเอาไปคำนวณว่ามีกี่หน้า
    const totalpages = Math.ceil(totalPateints / parseInt(limit)); // ปัดเศษขึ้นเสมอ

    // ส่งข้อมูลกลับไปแบบอัปเกรด (ส่งไปเป็นก้อน Object)
    res.json({
      data: patients, // รายชื่อคนไข้ (แค่ 5 คน)
      currentPage: parseInt(page), // หน้าปัจจุบัน
      totalPages: totalpages // จำนวนหน้าทั้งหมด
    }); 
  } catch (error) {
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูล" });
  }
});

// 4. API เพิ่มข้อมูลผู้ป่วยใหม่ (POST)
app.post("/api/patients", verifyToken, async (req, res) => {
  try {
    const newPatient = new Patient(req.body); // เอาข้อมูลที่ React ส่งมา (req.body) ไปใส่แม่พิมพ์
    const savedPatient = await newPatient.save(); // สั่งเซฟลง MongoDB
    res.status(201).json(savedPatient); // ส่งข้อมูลที่เซฟสำเร็จกลับไปยืนยัน
  } catch (error) {
    res.status(400).json({ message: "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบ" });
  }
});

// 5. API ลบข้อมูลผู้ป่วย (DELETE)
app.delete("/api/patients/:id", verifyToken, async (req, res) => {
  try {
    const patientId = req.params.id; // รับรหัส _id ที่หน้าบ้านส่งมาผ่าน URL
    await Patient.findByIdAndDelete(patientId); // สั่ง Mongoose ให้ไปตามหาและลบทิ้ง
    res.json({ message: "ลบข้อมูลผู้ป่วยออกจากระบบเรียบร้อย" }); // ส่งข้อความกลับไปบอกว่าลบเสร็จแล้ว
  } catch (error) {
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการลบข้อมูล" });
  }
});

// 6. API แก้ไขข้อมูลผู้ป่วย (PUT)
app.put("/api/patients/:id", verifyToken, async (req, res) => {
  try {
    const patientId = req.params.id; // ดึงรหัส _id จาก URL
    const updateData = req.body; // ดึงข้อมูลชุดใหม่ที่ส่งมาจาก React

    // สั่ง Mongoose ให้หาคนที่มี id ตรงกัน แล้วเอา updateData ไปทับ
    // { new: true } คือคำสั่งบังคับให้ Mongoose ส่งข้อมูล "เวอร์ชันใหม่ที่แก้เสร็จแล้ว" กลับมาให้เรา
    const updatedPatient = await Patient.findByIdAndUpdate(
      patientId,
      updateData,
      { returnDocument: "after" },
    );
    res.json(updatedPatient); // ส่งข้อมูลใหม่กลับไปให้ React
  } catch (error) {
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการอัปเดตข้อมูล" });
  }
});

// 7. API สมัครสมาชิก (Register)
app.post("/api/register", async (req, res) => {
  try {
    const { username, password, role } = req.body;

    // เช็คก่อนว่าชื่อนี้มีคนใช้ไปหรือยัง?
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "ชื่อผู้ใช้นี้มีในระบบแล้ว กรุณาใช้ชื่ออื่น" });
    }

    // บดรหัสผ่าน (Hashing)
    const salt = await bcrypt.genSalt(10); // genSalt(10) คือการสุ่มตัวอักษร ลงไป 10 รอบให้รหัสผ่านเดายากขึ้นไปอีก
    const hashedPassword = await bcrypt.hash(password, salt);

    // นำข้อมูลไปใส่แม่พิมพ์ User แล้วบันทึกลงDB
    const newUser = new User({
      username,
      password: hashedPassword, // นำรหัสที่สุ่มไปบันทึก
      role: role || "nurse",
    });

    await newUser.save();
    res.status(201).json({ message: "สมัครสมาชิกสำเร็จ!" });
  } catch (error) {
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการสมัครสมาชิก" });
  }
});

// 8. API เข้าสู่ระบบ (Login)
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // ค้นหาผู้ใช้จากชื่อ username
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: "ไม่พบชื่อผู้ใช้นี้ในระบบ" });
    }

    // ตรวจสอบรหัสผ่าน (compare รหัสที่พิมพ์มา กับ รหัสที่ถูก Hash ใน DB)
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "รหัสผ่านไม่ถูกต้อง" });
    }

    // ถ้ารหัสถูก! สร้างบัตร VIP (JWT)
    // เราจะแอบฝัง id และ role ลงไปในบัตรใบนี้ด้วย
    const token = jwt.sign(
      { id: user._id, role: user.role }, // ข้อมูลที่ฝัง (Payload)
      process.env.JWT_SECRET, // ลายเซ็นลับ (จากไฟล์ .env)
      { expiresIn: "8h" }, // อายุของบัตร (เช่น 8 ชั่วโมง)
    );

    // ส่งบัตร VIP กลับไปให้ React นำไปใช้งานต่อ
    res.json({
      message: "เข้าสู่ระบบสำเร็จ!",
      token: token,
      user: {
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ" });
  }
});

// 9. API สำหรับหน้า Dashboard สถิติภาพรวม
app.get('/api/dashboard/stats', verifyToken, async (req, res) => {
  try {
    const totalPatients = await Patient.countDocuments(); // นับจำนวนผู้ป่วยทั้งหมด
    const startOfMonth = new Date(); // ดึงวันที่ปัจจุบัน
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const newPatientsThisMonth = await Patient.countDocuments({ createdAt: { $gte: startOfMonth } });

    // ส่งตัวเลขกลับไปให้หน้าบ้านวาดกราฟหรือการ์ด
    res.json({
      totalPatients,
      newPatientsThisMonth
    });
  } catch (error) {
    res.status(500).json({ message: "ไม่สามารถดึงข้อมูลสถิติได้" });
  }
})

// 10. สั่งให้เซิร์ฟเวอร์เปิดทำการ
app.listen(PORT, () => {
  console.log(`🚀 API Server เปิดทำงานแล้วที่ http://localhost:${PORT}`);
});
