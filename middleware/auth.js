const jwt = require("jsonwebtoken");

// สร้างฟังก์ชัน รปภ. (Middleware)
const verifyToken = (req, res, next) => {
  // ขอดูตั๋วหน่อย! (ดึง Token มาจาก Header ที่ชื่อ Authorization)
  const authHeader = req.header("Authorization");

  // ถ้าไม่มีตั๋ว ส่งกลับไปเลย
  if (!authHeader) {
    return res.status(401).json({ message: "ปฏิเสธการเข้าถึง! ไม่มีบัตรผ่าน" });
  }

  try {
    const token = authHeader.split(" ")[1]; // แกะคำว่า "Bearer " ออก เพื่อเอาแต่รหัสตั๋วเพียวๆ
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // ใช้ JWT_SECRET เทียบว่าของแท้ไหม
    req.user = decoded; // ถ้าตั๋วของแท้ ให้แนบข้อมูลคนๆ นั้น (เช่น id) ติดตัวเข้าไปด้วย
    next(); // เชิญผ่านเข้าไปทำธุระที่ API ต่อไปได้เลยครับ! (นี่คือท่าไม้ตายของ Middleware)
  } catch (error) {
    res.status(401).json({ message: "บัตรผ่านไม่ถูกต้อง หรือหมดอายุแล้ว" });
  }
};

module.exports = verifyToken;
