const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true // กฎเหล็ก: ชื่อผู้ใช้ห้ามซ้ำกัน!
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        default: 'nurse'
    }
},{ timestamps: true })

module.exports = mongoose.model('User', userSchema);