const express = require("express");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, "data");
const UPLOAD_DIR = path.join(__dirname, "uploads");

const USERS_FILE = path.join(DATA_DIR, "users.json");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, "[]");
}

if (!fs.existsSync(ORDERS_FILE)) {
    fs.writeFileSync(ORDERS_FILE, "[]");
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },

    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const filename =
            `proof_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;

        cb(null, filename);
    }
});

const upload = multer({
    storage,

    limits: {
        fileSize: 5 * 1024 * 1024
    },

    fileFilter: (req, file, cb) => {
        const allowed = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (!allowed.includes(file.mimetype)) {
            return cb(new Error("File harus JPG, PNG, atau WEBP."));
        }

        cb(null, true);
    }
});


/* ================= DATA ================= */

function readUsers() {
    return JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
}

function writeUsers(users) {
    fs.writeFileSync(
        USERS_FILE,
        JSON.stringify(users, null, 2)
    );
}

function readOrders() {
    return JSON.parse(fs.readFileSync(ORDERS_FILE, "utf8"));
}

function writeOrders(orders) {
    fs.writeFileSync(
        ORDERS_FILE,
        JSON.stringify(orders, null, 2)
    );
}


/* ================= TELEGRAM ================= */

async function notifyTelegram(order) {
    try {
        const bot = require("./bot");

        await bot.sendOrderNotification(order);

    } catch (error) {
        console.error(
            "Telegram notification error:",
            error.message
        );
    }
}


/* ================= AUTH ================= */

function createToken(user) {
    return jwt.sign(
        {
            id: user.id,
            username: user.username
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "7d"
        }
    );
}

function auth(req, res, next) {

    const header = req.headers.authorization;

    if (!header) {
        return res.status(401).json({
            success: false,
            message: "Belum login."
        });
    }

    const token = header.replace("Bearer ", "");

    try {

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.user = decoded;

        next();

    } catch {

        return res.status(401).json({
            success: false,
            message: "Session login sudah tidak valid."
        });
    }
}


/* ================= REGISTER ================= */

app.post("/api/register", async (req, res) => {

    try {

        const {
            username,
            password,
            confirmPassword
        } = req.body;

        if (!username || !password || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Semua kolom wajib diisi."
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Konfirmasi password tidak cocok."
            });
        }

        if (username.length < 3) {
            return res.status(400).json({
                success: false,
                message: "Username minimal 3 karakter."
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password minimal 6 karakter."
            });
        }

        const users = readUsers();

        const exists = users.find(
            u =>
                u.username.toLowerCase() ===
                username.toLowerCase()
        );

        if (exists) {
            return res.status(409).json({
                success: false,
                message: "Username sudah digunakan."
            });
        }

        const nextNumber = users.length + 1;

        const userId =
            String(nextNumber).padStart(3, "0");

        const passwordHash =
            await bcrypt.hash(password, 12);

        const user = {
            id: userId,
            username,
            passwordHash,
            registeredAt: new Date().toISOString()
        };

        users.push(user);

        writeUsers(users);

        return res.json({
            success: true,
            message: "Pendaftaran berhasil.",
            userId
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Terjadi kesalahan server."
        });
    }
});


/* ================= LOGIN ================= */

app.post("/api/login", async (req, res) => {

    try {

        const {
            username,
            password
        } = req.body;

        const users = readUsers();

        const user = users.find(
            u =>
                u.username.toLowerCase() ===
                String(username).toLowerCase()
        );

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Username atau password salah."
            });
        }

        const valid =
            await bcrypt.compare(
                password,
                user.passwordHash
            );

        if (!valid) {
            return res.status(401).json({
                success: false,
                message: "Username atau password salah."
            });
        }

        const token = createToken(user);

        return res.json({
            success: true,
            token,

            user: {
                id: user.id,
                username: user.username,
                registeredAt: user.registeredAt
            }
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Terjadi kesalahan server."
        });
    }
});


/* ================= CURRENT USER ================= */

app.get("/api/me", auth, (req, res) => {

    const users = readUsers();

    const user = users.find(
        u => u.id === req.user.id
    );

    if (!user) {
        return res.status(404).json({
            success: false,
            message: "User tidak ditemukan."
        });
    }

    res.json({
        success: true,

        user: {
            id: user.id,
            username: user.username,
            registeredAt: user.registeredAt
        }
    });
});


/* ================= TELEGRAM CONFIG ================= */

app.get("/api/config", (req, res) => {

    res.json({
        telegramBotUsername:
            process.env.TELEGRAM_BOT_USERNAME || ""
    });
});


/* ================= CREATE ORDER ================= */

app.post("/api/orders", auth, async (req, res) => {

    try {

        const {
            product,
            price,
            whatsapp,
            paymentMethod,
            manualProof
        } = req.body;

        if (
            !product ||
            !price ||
            !whatsapp ||
            !paymentMethod
        ) {
            return res.status(400).json({
                success: false,
                message: "Data pembelian belum lengkap."
            });
        }

        const validPayments = [
            "DANA",
            "SHOPEEPAY"
        ];

        if (!validPayments.includes(paymentMethod)) {
            return res.status(400).json({
                success: false,
                message: "Metode pembayaran tidak valid."
            });
        }

        const users = readUsers();

        const user = users.find(
            u => u.id === req.user.id
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User tidak ditemukan."
            });
        }

        const orders = readOrders();

        const order = {
            id:
                "ORD-" +
                Date.now().toString(36).toUpperCase(),

            userId: user.id,
            username: user.username,

            product,
            price: Number(price),

            whatsapp,
            paymentMethod,

            status: "pending",

            manualProof: manualProof === true,

            proof: null,

            createdAt: new Date().toISOString(),

            updatedAt: new Date().toISOString()
        };

        orders.push(order);

        writeOrders(orders);

        await notifyTelegram(order);

        res.json({
            success: true,
            message:
                "Pesanan berhasil dikirim. Mohon tunggu admin konfirmasi.",
            order
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Gagal membuat pesanan."
        });
    }
});


/* ================= UPLOAD PROOF ================= */

app.post(
    "/api/orders/:orderId/proof",
    auth,
    upload.single("proof"),
    async (req, res) => {

        try {

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: "Bukti pembayaran belum dipilih."
                });
            }

            const orders = readOrders();

            const order = orders.find(
                o =>
                    o.id === req.params.orderId &&
                    o.userId === req.user.id
            );

            if (!order) {

                fs.unlinkSync(req.file.path);

                return res.status(404).json({
                    success: false,
                    message: "Pesanan tidak ditemukan."
                });
            }

            order.proof = {
                filename: req.file.filename,
                originalName: req.file.originalname,
                mimetype: req.file.mimetype,
                uploadedAt: new Date().toISOString()
            };

            order.manualProof = false;

            order.status = "pending";

            order.updatedAt =
                new Date().toISOString();

            writeOrders(orders);

            await notifyTelegram(order);

            res.json({
                success: true,
                message:
                    "Bukti pembayaran berhasil dikirim.",
                order
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                success: false,
                message:
                    "Gagal mengirim bukti pembayaran."
            });
        }
    }
);


/* ================= GET USER ORDERS ================= */

app.get("/api/orders", auth, (req, res) => {

    const orders = readOrders();

    const userOrders = orders
        .filter(o => o.userId === req.user.id)
        .sort(
            (a, b) =>
                new Date(b.createdAt) -
                new Date(a.createdAt)
        );

    res.json({
        success: true,
        orders: userOrders
    });
});


/* ================= CANCEL ORDER ================= */

app.post(
    "/api/orders/:orderId/cancel",
    auth,
    (req, res) => {

        const orders = readOrders();

        const order = orders.find(
            o =>
                o.id === req.params.orderId &&
                o.userId === req.user.id
        );

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Pesanan tidak ditemukan."
            });
        }

        if (
            order.status === "paid" ||
            order.status === "cancelled"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Pesanan tidak bisa dibatalkan."
            });
        }

        order.status = "cancelled";

        order.updatedAt =
            new Date().toISOString();

        writeOrders(orders);

        res.json({
            success: true,
            message: "Pesanan dibatalkan."
        });
    }
);


/* ================= GLOBAL ERROR ================= */

app.use((error, req, res, next) => {

    console.error(error);

    res.status(400).json({
        success: false,
        message:
            error.message ||
            "Terjadi kesalahan."
    });
});


/* ================= START ================= */

app.listen(PORT, () => {

    console.log("");
    console.log("================================");
    console.log(" JAILBREAK STORE");
    console.log("================================");
    console.log(`Website: http://localhost:${PORT}`);
    console.log("Server berhasil dijalankan.");
    console.log("================================");
    console.log("");
});