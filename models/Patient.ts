import mongoose, { Document, Schema } from 'mongoose';

// 1. สร้าง Interface ประกบ (extends Document เพื่อบอกว่าเป็นเอกสารใน MongoDB)
export interface IPatient extends Document {
  name: string;
  email: string;
  phone: string;
  createdAt: Date;
  updatedAt: Date;
}

// 2. สร้าง Schema และจับ Interface ยัดเข้าไปในวงเล็บแหลม <IPatient>
const patientSchema = new Schema<IPatient>({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
}, { timestamps: true });

// 3. ส่งออก Model (เปลี่ยน module.exports เป็น export default)
export default mongoose.model<IPatient>('Patient', patientSchema);