const mongoose = require('mongoose');

// 1. สร้างแม่พิมพ์ (Schema)
const patientSchema = new mongoose.Schema({
  name: { type: String, required: true }, // required: true แปลว่า "บังคับต้องกรอกชื่อ ห้ามว่าง!"
  email: { type: String },
  phone: { type: String }
}, { 
  timestamps: true // บันทึกเวลาอัตโนมัติว่าถูกสร้างหรือแก้ไขเมื่อไหร่
});

// 2. สร้าง Model และส่งออกไปให้ไฟล์อื่นใช้งาน
module.exports = mongoose.model('Patient', patientSchema);