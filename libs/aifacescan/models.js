import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
    enrollid: { type: Number, required: true },
    sn: { type: String, required: true },
    timestamp: { type: Date, required: true },
    image_url: { type: String, default: "" },
    gate_type: { type: String, enum: ['in', 'out', 'in-out'], default: 'in-out' },
    admin_id: { type: String, default: "" },
    note: { type: String, default: "Auto from device" }
}, { versionKey: false });

const deviceSchema = new mongoose.Schema({
    sn: { type: String, required: true, unique: true },
    model: { type: String },
    ipaddress: { type: String },
    mac: { type: String },
    user_count: { type: Number, default: 0 },
    siteid: { type: mongoose.Schema.Types.ObjectId, ref: 'sites', required: true },
    time: { type: Date, default: null },
    devinfo: { type: Object, default: {} },
    device_type: { type: String, enum: ['AI_FACESCAN', 'FC_FACESCAN', "IP_CAM_FACESCAN"], required: true },
    key: { type: String },
    gate_type: { type: String, enum: ['in', 'out', 'in-out'], default: 'in-out' }
});

const employeeSchema = new mongoose.Schema({
    enrollid: { type: Number, required: true },
    employee_id: { type: String, default: "" },
    name: { type: String, required: true },
    picture: { type: String, default: "" },
    password: { type: String, default: "" },
    rfid: { type: Number, default: null },
    siteid: { type: mongoose.Types.ObjectId, required: true },
    device_admin: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'inactive', 'terminated'], default: 'active' }
}, { timestamps: true });

const modelingSchema = new mongoose.Schema({
    enrollid: { type: Number, required: true },
    device_sn: { type: String, required: true },
    status: {
        type: Number,
        enum: [0, 1, 4, 5, 6],
        required: true
    },
    type: { type: String, enum: ["fc", "rf", "pv"], required: true },
    err_msg: { type: String, default: "" },
    retry_count: { type: Number, default: 0 },
    max_retries: { type: Number, default: 3 },
    last_attempt: { type: Date, default: null },
    processing: { type: Boolean, default: false },
    processing_at: { type: Date, default: null }
}, { timestamps: true });

export const Attendance = mongoose.model('attendance', attendanceSchema);
export const Device = mongoose.model('device', deviceSchema);
export const Employee = mongoose.model('employee', employeeSchema);
export const Modeling = mongoose.model('modeling', modelingSchema);
