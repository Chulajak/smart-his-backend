import express, { Request, Response } from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import Patient from './models/Patient';
import User from './models/User';
import verifyToken, { AuthRequest } from './middleware/auth';

dotenv.config();

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// ==========================================
// 🔌 โค้ดส่วนที่เชื่อมต่อกับ MongoDB
// ==========================================
mongoose
  .connect(process.env.MONGO_URI as string) // บังคับว่าเป็น string
  .then(() => console.log("🟢 เชื่อมต่อ MongoDB สำเร็จแล้ว!"))
  .catch((err) => console.log("🔴 เชื่อมต่อฐานข้อมูลล้มเหลว:", err));

app.get("/", (req: Request, res: Response) => {
  res.send("<h1>ยินดีต้อนรับสู่ Smart HIS Backend API! 🚀</h1>");
});

// 3. API ดึงข้อมูลผู้ป่วยทั้งหมด (GET)
app.get("/api/patients", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const { keyword, page = "1", limit = "5" } = req.query; // ตั้งค่าเริ่มต้นเป็นข้อความ
    let queryCondition: any = {}; 

    if (keyword) {
      queryCondition = {
        $or: [
          { name: { $regex: keyword as string, $options: "i" } },
          { email: { $regex: keyword as string, $options: "i" } },
          { phone: { $regex: keyword as string, $options: "i" } },
        ],
      };
    }

    const skipIndex = (parseInt(page as string) - 1) * parseInt(limit as string);
    const patients = await Patient.find(queryCondition)
      .sort({ createdAt: -1 })
      .skip(skipIndex)
      .limit(parseInt(limit as string));

    const totalPatients = await Patient.countDocuments(queryCondition);
    const totalPages = Math.ceil(totalPatients / parseInt(limit as string));

    res.json({
      data: patients,
      currentPage: parseInt(page as string),
      totalPages: totalPages
    });
  } catch (error) {
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูล" });
  }
});

// 4. API เพิ่มข้อมูลผู้ป่วยใหม่ (POST)
app.post("/api/patients", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const newPatient = new Patient(req.body);
    const savedPatient = await newPatient.save();
    res.status(201).json(savedPatient);
  } catch (error) {
    res.status(400).json({ message: "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบ" });
  }
});

// 5. API ลบข้อมูลผู้ป่วย (DELETE)
app.delete("/api/patients/:id", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const patientId = req.params.id;
    await Patient.findByIdAndDelete(patientId);
    res.json({ message: "ลบข้อมูลผู้ป่วยออกจากระบบเรียบร้อย" });
  } catch (error) {
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการลบข้อมูล" });
  }
});

// 6. API แก้ไขข้อมูลผู้ป่วย (PUT)
app.put("/api/patients/:id", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const patientId = req.params.id;
    const updateData = req.body;

    const updatedPatient = await Patient.findByIdAndUpdate(
      patientId,
      updateData,
      { returnDocument: "after" }
    );
    res.json(updatedPatient);
  } catch (error) {
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการอัปเดตข้อมูล" });
  }
});

// 7. API สมัครสมาชิก (Register)
app.post("/api/register", async (req: Request, res: Response) => {
  try {
    const { username, password, role } = req.body;

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      res.status(400).json({ message: "ชื่อผู้ใช้นี้มีในระบบแล้ว กรุณาใช้ชื่ออื่น" });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      username,
      password: hashedPassword,
      role: role || "nurse",
    });

    await newUser.save();
    res.status(201).json({ message: "สมัครสมาชิกสำเร็จ!" });
  } catch (error) {
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการสมัครสมาชิก" });
  }
});

// 8. API เข้าสู่ระบบ (Login)
app.post("/api/login", async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      res.status(400).json({ message: "ไม่พบชื่อผู้ใช้นี้ในระบบ" });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(400).json({ message: "รหัสผ่านไม่ถูกต้อง" });
      return;
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET as string, // บังคับว่าเป็น string
      { expiresIn: "8h" }
    );

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
app.get('/api/dashboard/stats', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const totalPatients = await Patient.countDocuments();
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const newPatientsThisMonth = await Patient.countDocuments({ createdAt: { $gte: startOfMonth } });

    res.json({
      totalPatients,
      newPatientsThisMonth
    });
  } catch (error) {
    res.status(500).json({ message: "ไม่สามารถดึงข้อมูลสถิติได้" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 API Server เปิดทำงานแล้วที่ http://localhost:${PORT}`);
});