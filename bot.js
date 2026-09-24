const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
const path = require("path");

require("dotenv").config();


/* ================= CONFIG ================= */

const TOKEN =
    process.env.BOT_TOKEN;

const ADMIN_CHAT_ID =
    process.env.ADMIN_CHAT_ID
        ? String(process.env.ADMIN_CHAT_ID)
        : null;


if (!TOKEN) {

    throw new Error(
        "BOT_TOKEN belum diisi di Railway Variables/.env"
    );
}


if (!ADMIN_CHAT_ID) {

    throw new Error(
        "ADMIN_CHAT_ID belum diisi di Railway Variables/.env"
    );
}


/* ================= BOT ================= */

const bot =
    new TelegramBot(
        TOKEN,
        {
            polling: true
        }
    );


/* ================= FILE ================= */

const ORDERS_FILE =
    path.join(
        __dirname,
        "data",
        "orders.json"
    );


const USERS_FILE =
    path.join(
        __dirname,
        "data",
        "users.json"
    );


/* ================= DATA ================= */

function readOrders() {

    return JSON.parse(
        fs.readFileSync(
            ORDERS_FILE,
            "utf8"
        )
    );
}


function writeOrders(
    orders
) {

    fs.writeFileSync(

        ORDERS_FILE,

        JSON.stringify(
            orders,
            null,
            2
        )
    );
}


function readUsers() {

    return JSON.parse(
        fs.readFileSync(
            USERS_FILE,
            "utf8"
        )
    );
}


/* ================= FORMAT ================= */

function formatRupiah(
    number
) {

    return new Intl.NumberFormat(
        "id-ID"
    ).format(number);
}


function formatDate(
    date
) {

    return new Date(
        date
    ).toLocaleString(
        "id-ID",
        {
            timeZone:
                "Asia/Makassar",

            day:
                "2-digit",

            month:
                "2-digit",

            year:
                "numeric",

            hour:
                "2-digit",

            minute:
                "2-digit",

            second:
                "2-digit"
        }
    );
}


/* ================= REGISTER ================= */

async function sendRegisterNotification(
    user
) {

    const text = `
🆕 USER BARU TERDAFTAR

👤 Username:
${user.username}

🆔 User ID:
${user.id}

⏰ Waktu:
${formatDate(
    user.registeredAt
)}

🔐 Password:
Tidak ditampilkan demi keamanan.
`;


    await bot.sendMessage(
        ADMIN_CHAT_ID,
        text
    );
}


/* ================= LOGIN ================= */

async function sendLoginNotification(
    user
) {

    const text = `
🔐 USER LOGIN

👤 Username:
${user.username}

🆔 User ID:
${user.id}

⏰ Waktu:
${formatDate(
    new Date().toISOString()
)}
`;


    await bot.sendMessage(
        ADMIN_CHAT_ID,
        text
    );
}


/* ================= ORDER TEXT ================= */

function buildOrderText(
    order
) {

    let statusText =
        "🔄 Status: KONFIRMASI PEMBELIAN";


    if (
        order.status ===
        "paid"
    ) {

        statusText =
            "✅ Status: PEMBAYARAN DIKONFIRMASI";
    }


    if (
        order.status ===
        "unpaid"
    ) {

        statusText =
            "❌ Status: DIA BELUM BAYAR";
    }


    if (
        order.status ===
        "cancelled"
    ) {

        statusText =
            "🚫 Status: PESANAN DIBATALKAN";
    }


    if (
        order.status ===
        "pending"
    ) {

        statusText =
            "🔄 Status: KONFIRMASI PEMBELIAN";
    }


    return `
🔔 KONFIRMASI PEMBELIAN! 🔔

👤 USERS:
${order.username}

🆔 USER ID:
${order.userId}

📦 Produk:
${order.product}

💰 Harga:
Rp ${formatRupiah(
    order.price
)}

📱 Nomor WA:
${order.whatsapp}

💳 Payment:
${order.paymentMethod}

⏰ Waktu:
${formatDate(
    order.createdAt
)}

${statusText}

🧾 Order ID:
${order.id}

📎 Bukti:
${
    order.proof
        ? order.proof.originalName
        : order.manualProof
            ? "Dikirim manual ke nomor admin"
            : "Belum ada"
}
`;
}


/* ================= ORDER NOTIFICATION ================= */

async function sendOrderNotification(
    order
) {

    const text =
        buildOrderText(
            order
        );


    const buttons = [];


    if (
        order.status ===
        "pending"
    ) {

        buttons.push([

            {
                text:
                    "YA BENAR DIA SUDAH BAYAR",

                callback_data:
                    `paid:${order.id}`
            }

        ]);


        buttons.push([

            {
                text:
                    "DIA BELUM BAYAR",

                callback_data:
                    `unpaid:${order.id}`
            }

        ]);
    }


    await bot.sendMessage(

        ADMIN_CHAT_ID,

        text,

        {

            reply_markup: {

                inline_keyboard:
                    buttons
            }
        }
    );


    /* ================= SEND PROOF ================= */

    if (
        order.proof
    ) {

        const filePath =
            path.join(
                __dirname,
                "uploads",
                order.proof.filename
            );


        if (
            fs.existsSync(
                filePath
            )
        ) {

            await bot.sendPhoto(

                ADMIN_CHAT_ID,

                filePath,

                {

                    caption:
                        `🧾 Bukti pembayaran\n${order.id}`
                }
            );
        }
    }
}


/* ================= CALLBACK ================= */

bot.on(
    "callback_query",
    async callback => {

        try {

            const data =
                callback.data || "";


            const [
                action,
                orderId
            ] =
                data.split(":");


            if (
                ![
                    "paid",
                    "unpaid"
                ].includes(
                    action
                )
            ) {

                return;
            }


            if (
                String(
                    callback.message.chat.id
                ) !==
                ADMIN_CHAT_ID
            ) {

                await bot.answerCallbackQuery(

                    callback.id,

                    {
                        text:
                            "Akses ditolak."
                    }
                );

                return;
            }


            const orders =
                readOrders();


            const order =
                orders.find(
                    o =>
                        o.id ===
                        orderId
                );


            if (!order) {

                await bot.answerCallbackQuery(

                    callback.id,

                    {
                        text:
                            "Pesanan tidak ditemukan."
                    }
                );

                return;
            }


            /* ================= PAID ================= */

            if (
                action ===
                "paid"
            ) {

                order.status =
                    "paid";


                order.updatedAt =
                    new Date()
                        .toISOString();


                writeOrders(
                    orders
                );


                await bot.editMessageText(

                    buildOrderText(
                        order
                    ),

                    {

                        chat_id:
                            callback.message
                                .chat.id,

                        message_id:
                            callback.message
                                .message_id
                    }
                );


                await bot.answerCallbackQuery(

                    callback.id,

                    {
                        text:
                            "Pembayaran dikonfirmasi."
                    }
                );


                return;
            }


            /* ================= UNPAID ================= */

            if (
                action ===
                "unpaid"
            ) {

                order.status =
                    "unpaid";


                order.updatedAt =
                    new Date()
                        .toISOString();


                writeOrders(
                    orders
                );


                await bot.editMessageText(

                    buildOrderText(
                        order
                    ),

                    {

                        chat_id:
                            callback.message
                                .chat.id,

                        message_id:
                            callback.message
                                .message_id
                    }
                );


                await bot.answerCallbackQuery(

                    callback.id,

                    {
                        text:
                            "Pesanan ditandai belum bayar."
                    }
                );
            }

        } catch (error) {

            console.error(
                "Callback error:",
                error.message
            );
        }
    }
);


/* ================= /USER ================= */

bot.onText(
    /^\/user$/,
    async msg => {

        if (
            String(
                msg.chat.id
            ) !==
            ADMIN_CHAT_ID
        ) {

            return;
        }


        const users =
            readUsers();


        if (
            !users.length
        ) {

            return bot.sendMessage(

                msg.chat.id,

                "Belum ada user."
            );
        }


        let text =
            "👥 DAFTAR USERS\n\n";


        users.forEach(
            user => {

                text +=

                    `🆔 ${user.id}\n` +

                    `👤 ${user.username}\n` +

                    `📅 ${formatDate(
                        user.registeredAt
                    )}\n\n`;
            }
        );


        await bot.sendMessage(

            msg.chat.id,

            text
        );
    }
);


/* ================= /FINDUSER ================= */

bot.onText(
    /^\/finduser(?:\s+(.+))?$/,
    async (
        msg,
        match
    ) => {

        if (
            String(
                msg.chat.id
            ) !==
            ADMIN_CHAT_ID
        ) {

            return;
        }


        const query =
            match[1];


        if (!query) {

            return bot.sendMessage(

                msg.chat.id,

                "Gunakan:\n/finduser 003\natau\n/finduser username"
            );
        }


        const users =
            readUsers();


        const user =
            users.find(

                u =>

                    u.id ===
                        query ||

                    u.username
                        .toLowerCase() ===
                        query
                            .toLowerCase()
            );


        if (!user) {

            return bot.sendMessage(

                msg.chat.id,

                "❌ User tidak ditemukan."
            );
        }


        await bot.sendMessage(

            msg.chat.id,

            `
👤 USER DITEMUKAN

🆔 ID:
${user.id}

👤 Username:
${user.username}

📅 Daftar:
${formatDate(
    user.registeredAt
)}

🔐 Password:
Tidak ditampilkan demi keamanan.
`
        );
    }
);


/* ================= /FINDNUMBER ================= */

bot.onText(
    /^\/findnumber(?:\s+(.+))?$/,
    async (
        msg,
        match
    ) => {

        if (
            String(
                msg.chat.id
            ) !==
            ADMIN_CHAT_ID
        ) {

            return;
        }


        const number =
            match[1];


        if (!number) {

            return bot.sendMessage(

                msg.chat.id,

                "Gunakan:\n/findnumber 081234567890"
            );
        }


        const orders =
            readOrders();


        const results =
            orders

                .filter(

                    order =>

                        order.whatsapp
                            .replace(
                                /\D/g,
                                ""
                            )
                            .includes(

                                number.replace(
                                    /\D/g,
                                    ""
                                )
                            )
                )

                .sort(

                    (a, b) =>

                        new Date(
                            b.createdAt
                        ) -

                        new Date(
                            a.createdAt
                        )
                );


        if (
            !results.length
        ) {

            return bot.sendMessage(

                msg.chat.id,

                "❌ Tidak ditemukan pesanan dengan nomor tersebut."
            );
        }


        let text =
            "🔎 HASIL FIND NUMBER\n\n";


        results
            .slice(
                0,
                10
            )

            .forEach(
                order => {

                    text +=

                        `📦 ${order.product}\n` +

                        `👤 ${order.username}\n` +

                        `🆔 ${order.userId}\n` +

                        `📱 ${order.whatsapp}\n` +

                        `💳 ${order.paymentMethod}\n` +

                        `💰 Rp ${formatRupiah(
                            order.price
                        )}\n` +

                        `🔄 ${order.status}\n` +

                        `⏰ ${formatDate(
                            order.createdAt
                        )}\n` +

                        `🧾 ${order.id}\n\n`;
                }
            );


        await bot.sendMessage(

            msg.chat.id,

            text
        );
    }
);


/* ================= TELEGRAM ERRORS ================= */

bot.on(
    "polling_error",
    error => {

        console.error(
            "Telegram polling error:",
            error.message
        );
    }
);


/* ================= START ================= */

console.log(
    "🤖 Telegram bot aktif."
);


/* ================= EXPORT ================= */

module.exports = {

    sendRegisterNotification,

    sendLoginNotification,

    sendOrderNotification,

    bot
};
