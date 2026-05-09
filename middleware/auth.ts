import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// ใน Express ดั้งเดิม req จะไม่มีคำว่า .user 
// เราเลยต้องสร้าง Interface ใหม่มาครอบ Request เพื่อขยายให้มันรู้จัก req.user ครับ
export interface AuthRequest extends Request {
  user?: any; 
}

// สร้างฟังก์ชัน รปภ. (Middleware)
const verifyToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ message: "Access Denied: ไม่พบ Token" });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    req.user = decoded; // ยัดข้อมูลตั๋วใส่ req.user
    next(); // ปล่อยผ่านให้ไปทำงานต่อ
  } catch (error) {
    res.status(403).json({ message: "Invalid Token: Token ไม่ถูกต้องหรือหมดอายุ" });
  }
};

export default verifyToken;
