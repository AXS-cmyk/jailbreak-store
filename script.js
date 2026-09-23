let token =
    localStorage.getItem("jailbreak_token") || "";

let currentUser = null;

let selectedProduct = "";
let selectedPrice = 0;
let selectedPaymentMethod = "";
let selectedFile = null;
let currentOrderId = null;


/* ================= PRODUCTS ================= */

const QR_CODES = {

    "JAILBREAK PRO 1": {
        DANA:
            "https://via.placeholder.com/300x300/111111/ffffff?text=DANA+PRO+1",

        SHOPEEPAY:
            "https://via.placeholder.com/300x300/111111/ffffff?text=SHOPEEPAY+PRO+1"
    },

    "JAILBREAK PRO 2": {
        DANA:
            "https://via.placeholder.com/300x300/111111/ffffff?text=DANA+PRO+2",

        SHOPEEPAY:
            "https://via.placeholder.com/300x300/111111/ffffff?text=SHOPEEPAY+PRO+2"
    },

    "JAILBREAK PRO 3": {
        DANA:
            "https://via.placeholder.com/300x300/111111/ffffff?text=DANA+PRO+3",

        SHOPEEPAY:
            "https://via.placeholder.com/300x300/111111/ffffff?text=SHOPEEPAY+PRO+3"
    },

    "JAILBREAK PRO 4": {
        DANA:
            "https://via.placeholder.com/300x300/111111/ffffff?text=DANA+PRO+4",

        SHOPEEPAY:
            "https://via.placeholder.com/300x300/111111/ffffff?text=SHOPEEPAY+PRO+4"
    },

    "JAILBREAK PRO 5": {
        DANA:
            "https://via.placeholder.com/300x300/111111/ffffff?text=DANA+PRO+5",

        SHOPEEPAY:
            "https://via.placeholder.com/300x300/111111/ffffff?text=SHOPEEPAY+PRO+5"
    }
};


/* ================= API ================= */

async function api(
    url,
    options = {}
) {

    options.headers =
        options.headers || {};

    if (token) {

        options.headers.Authorization =
            `Bearer ${token}`;
    }

    const response =
        await fetch(
            url,
            options
        );

    const data =
        await response.json();

    if (
        response.status === 401
    ) {

        logout();

        throw new Error(
            "Session login sudah berakhir."
        );
    }

    if (!response.ok) {

        throw new Error(
            data.message ||
            "Terjadi kesalahan."
        );
    }

    return data;
}


/* ================= AUTH UI ================= */

function openLogin() {

    document.getElementById(
        "loginModal"
    ).style.display = "block";

    document.getElementById(
        "registerModal"
    ).style.display = "none";
}


function openRegister() {

    document.getElementById(
        "registerModal"
    ).style.display = "block";

    document.getElementById(
        "loginModal"
    ).style.display = "none";
}


function closeAuthModals() {

    document.getElementById(
        "loginModal"
    ).style.display = "none";

    document.getElementById(
        "registerModal"
    ).style.display = "none";
}


/* ================= REGISTER ================= */

async function registerUser() {

    const username =
        document.getElementById(
            "registerUsername"
        ).value.trim();

    const password =
        document.getElementById(
            "registerPassword"
        ).value;

    const confirmPassword =
        document.getElementById(
            "registerConfirmPassword"
        ).value;

    try {

        const result =
            await api(
                "/api/register",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            username,
                            password,
                            confirmPassword
                        })
                }
            );

        alert(
            `Pendaftaran berhasil!\nUser ID kamu: ${result.userId}`
        );

        document.getElementById(
            "registerUsername"
        ).value = "";

        document.getElementById(
            "registerPassword"
        ).value = "";

        document.getElementById(
            "registerConfirmPassword"
        ).value = "";

        openLogin();

    } catch (error) {

        alert(error.message);
    }
}


/* ================= LOGIN ================= */

async function loginUser() {

    const username =
        document.getElementById(
            "loginUsername"
        ).value.trim();

    const password =
        document.getElementById(
            "loginPassword"
        ).value;

    try {

        const result =
            await api(
                "/api/login",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            username,
                            password
                        })
                }
            );

        token =
            result.token;

        currentUser =
            result.user;

        localStorage.setItem(
            "jailbreak_token",
            token
        );

        closeAuthModals();

        updateNavbar();

        loadOrders();

        alert(
            `Login berhasil. Halo ${currentUser.username}!`
        );

    } catch (error) {

        alert(error.message);
    }
}


/* ================= LOGOUT ================= */

function logout() {

    token = "";

    currentUser = null;

    localStorage.removeItem(
        "jailbreak_token"
    );

    updateNavbar();
}


/* ================= NAVBAR ================= */

function updateNavbar() {

    const authArea =
        document.getElementById(
            "authArea"
        );

    if (!authArea) {
        return;
    }

    if (currentUser) {

        authArea.innerHTML = `
            <span class="user-name">
                👤 ${escapeHtml(currentUser.username)}
            </span>

            <button class="nav-login-btn"
                    onclick="openPending()">
                🔄<sup id="pendingCount">0</sup>
            </button>

            <button class="nav-login-btn"
                    onclick="logout()">
                LOGOUT
            </button>
        `;

    } else {

        authArea.innerHTML = `
            <button class="nav-login-btn"
                    onclick="openLogin()">
                LOGIN
            </button>
        `;
    }
}


/* ================= BUY ================= */

function openModal(
    product,
    price
) {

    if (!token) {

        alert(
            "Silakan login terlebih dahulu."
        );

        openLogin();

        return;
    }

    selectedProduct = product;
    selectedPrice = price;

    selectedPaymentMethod = "";

    selectedFile = null;

    currentOrderId = null;

    document.getElementById(
        "modalProductName"
    ).textContent = product;

    document.getElementById(
        "buyModal"
    ).style.display = "block";

    document.getElementById(
        "whatsappNumber"
    ).value = "";

    document.getElementById(
        "fileInput"
    ).value = "";

    document.getElementById(
        "fileName"
    ).textContent = "";

    document.getElementById(
        "qrContainer"
    ).style.display = "none";

    document.getElementById(
        "sendProofBtn"
    ).style.display = "none";

    document.getElementById(
        "manualConfirmBtn"
    ).style.display = "block";

    document.querySelectorAll(
        ".payment-btn"
    ).forEach(
        btn =>
            btn.classList.remove(
                "active"
            )
    );
}


function closeModal() {

    document.getElementById(
        "buyModal"
    ).style.display = "none";
}


/* ================= PAYMENT ================= */

function selectPayment(
    method,
    button
) {

    selectedPaymentMethod =
        method;

    document.querySelectorAll(
        ".payment-btn"
    ).forEach(
        btn =>
            btn.classList.remove(
                "active"
            )
    );

    button.classList.add(
        "active"
    );

    const qr =
        QR_CODES[
            selectedProduct
        ][method];

    document.getElementById(
        "qrImage"
    ).src = qr;

    document.getElementById(
        "qrText"
    ).textContent =
        "Scan QR Code " + method;

    document.getElementById(
        "qrContainer"
    ).style.display = "block";
}


/* ================= FILE ================= */

function handleFileSelect(event) {

    selectedFile =
        event.target.files[0];

    if (!selectedFile) {

        document.getElementById(
            "fileName"
        ).textContent = "";

        document.getElementById(
            "sendProofBtn"
        ).style.display = "none";

        return;
    }

    document.getElementById(
        "fileName"
    ).textContent =
        "✓ " + selectedFile.name;

    document.getElementById(
        "sendProofBtn"
    ).style.display =
        "block";
}


/* ================= CREATE ORDER + PROOF ================= */

async function sendPaymentProof() {

    const whatsapp =
        document.getElementById(
            "whatsappNumber"
        ).value.trim();

    if (!whatsapp) {

        alert(
            "Masukkan nomor WhatsApp."
        );

        return;
    }

    if (!selectedPaymentMethod) {

        alert(
            "Pilih metode pembayaran terlebih dahulu."
        );

        return;
    }

    if (!selectedFile) {

        alert(
            "Upload bukti pembayaran terlebih dahulu."
        );

        return;
    }

    const button =
        document.getElementById(
            "sendProofBtn"
        );

    button.disabled = true;

    button.textContent =
        "MENGIRIM...";

    try {

        const orderResult =
            await api(
                "/api/orders",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({

                            product:
                                selectedProduct,

                            price:
                                selectedPrice,

                            whatsapp,

                            paymentMethod:
                                selectedPaymentMethod,

                            manualProof:
                                false
                        })
                }
            );

        currentOrderId =
            orderResult.order.id;


        const formData =
            new FormData();

        formData.append(
            "proof",
            selectedFile
        );


        await api(
            `/api/orders/${currentOrderId}/proof`,
            {
                method: "POST",
                body: formData
            }
        );


        closeModal();

        showWaiting();

        loadOrders();

    } catch (error) {

        button.disabled = false;

        button.textContent =
            "KIRIM BUKTI TF";

        alert(
            error.message
        );
    }
}


/* ================= MANUAL PROOF ================= */

async function confirmSentToNumber() {

    const whatsapp =
        document.getElementById(
            "whatsappNumber"
        ).value.trim();

    if (!whatsapp) {

        alert(
            "Masukkan nomor WhatsApp."
        );

        return;
    }

    if (!selectedPaymentMethod) {

        alert(
            "Pilih metode pembayaran."
        );

        return;
    }

    try {

        await api(
            "/api/orders",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify({

                        product:
                            selectedProduct,

                        price:
                            selectedPrice,

                        whatsapp,

                        paymentMethod:
                            selectedPaymentMethod,

                        manualProof:
                            true
                    })
            }
        );

        closeModal();

        showWaiting();

        loadOrders();

    } catch (error) {

        alert(
            error.message
        );
    }
}


/* ================= WAITING ================= */

function showWaiting() {

    document.getElementById(
        "waitingModal"
    ).style.display = "block";
}


function closeWaiting() {

    document.getElementById(
        "waitingModal"
    ).style.display = "none";
}


/* ================= ORDERS ================= */

async function loadOrders() {

    if (!token) {
        return;
    }

    try {

        const result =
            await api(
                "/api/orders"
            );

        const orders =
            result.orders || [];

        const unpaid =
            orders.filter(
                order =>
                    order.status ===
                    "unpaid"
            );

        const pendingCount =
            document.getElementById(
                "pendingCount"
            );

        if (pendingCount) {

            pendingCount.textContent =
                unpaid.length;
        }

        renderPendingOrders(
            unpaid
        );

    } catch (error) {

        console.error(error);
    }
}


/* ================= PENDING ================= */

function openPending() {

    document.getElementById(
        "pendingModal"
    ).style.display = "block";

    loadOrders();
}


function closePending() {

    document.getElementById(
        "pendingModal"
    ).style.display = "none";
}


function renderPendingOrders(
    orders
) {

    const container =
        document.getElementById(
            "pendingList"
        );

    if (!container) {
        return;
    }

    if (!orders.length) {

        container.innerHTML = `
            <div class="empty-pending">
                Tidak ada produk yang belum dibayar.
            </div>
        `;

        return;
    }

    container.innerHTML =
        orders.map(
            order => `

            <div class="pending-order">

                <div class="pending-product">
                    ${escapeHtml(order.product)}
                </div>

                <div class="pending-price">
                    Rp ${formatRupiah(order.price)}
                </div>

                <div class="pending-buttons">

                    <button
                        class="buy-btn"
                        onclick="continueOrder('${order.id}')">
                        SELESAIKAN PEMBAYARAN
                    </button>

                    <button
                        class="cancel-order-btn"
                        onclick="cancelOrder('${order.id}')">
                        BATALKAN PESANAN
                    </button>

                </div>

            </div>
        `
        ).join("");
}


/* ================= CONTINUE PAYMENT ================= */

async function continueOrder(
    orderId
) {

    try {

        const result =
            await api(
                "/api/orders"
            );

        const order =
            result.orders.find(
                o =>
                    o.id === orderId
            );

        if (!order) {

            alert(
                "Pesanan tidak ditemukan."
            );

            return;
        }

        selectedProduct =
            order.product;

        selectedPrice =
            order.price;

        selectedPaymentMethod =
            order.paymentMethod;

        currentOrderId =
            order.id;

        closePending();

        document.getElementById(
            "buyModal"
        ).style.display = "block";

        document.getElementById(
            "modalProductName"
        ).textContent =
            order.product;

        document.getElementById(
            "whatsappNumber"
        ).value =
            order.whatsapp;

        document.getElementById(
            "fileInput"
        ).value = "";

        document.getElementById(
            "fileName"
        ).textContent = "";

        document.getElementById(
            "sendProofBtn"
        ).style.display =
            "none";

        document.getElementById(
            "manualConfirmBtn"
        ).style.display =
            "block";

        document.querySelectorAll(
            ".payment-btn"
        ).forEach(btn => {

            btn.classList.remove(
                "active"
            );

            if (
                btn.textContent
                    .includes(
                        order.paymentMethod
                    )
            ) {
                btn.classList.add(
                    "active"
                );
            }
        });

        const qr =
            QR_CODES[
                order.product
            ][order.paymentMethod];

        document.getElementById(
            "qrImage"
        ).src = qr;

        document.getElementById(
            "qrText"
        ).textContent =
            "Scan QR Code " +
            order.paymentMethod;

        document.getElementById(
            "qrContainer"
        ).style.display =
            "block";

    } catch (error) {

        alert(
            error.message
        );
    }
}


/* ================= RESEND EXISTING ORDER ================= */

async function sendExistingProof() {

    if (!currentOrderId) {

        alert(
            "Pesanan tidak ditemukan."
        );

        return;
    }

    if (!selectedFile) {

        alert(
            "Upload bukti pembayaran terlebih dahulu."
        );

        return;
    }

    const button =
        document.getElementById(
            "sendProofBtn"
        );

    button.disabled = true;

    button.textContent =
        "MENGIRIM...";

    try {

        const formData =
            new FormData();

        formData.append(
            "proof",
            selectedFile
        );

        await api(
            `/api/orders/${currentOrderId}/proof`,
            {
                method: "POST",
                body: formData
            }
        );

        closeModal();

        showWaiting();

        loadOrders();

    } catch (error) {

        button.disabled = false;

        button.textContent =
            "KIRIM BUKTI TF";

        alert(
            error.message
        );
    }
}


/* ================= CANCEL ================= */

async function cancelOrder(
    orderId
) {

    const yes =
        confirm(
            "Yakin ingin membatalkan pesanan ini?"
        );

    if (!yes) {
        return;
    }

    try {

        await api(
            `/api/orders/${orderId}/cancel`,
            {
                method: "POST"
            }
        );

        loadOrders();

    } catch (error) {

        alert(
            error.message
        );
    }
}


/* ================= HELPERS ================= */

function formatRupiah(
    number
) {

    return new Intl.NumberFormat(
        "id-ID"
    ).format(number);
}


function escapeHtml(
    text
) {

    return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* ================= INIT ================= */

async function init() {

    if (!token) {

        updateNavbar();

        return;
    }

    try {

        const result =
            await api(
                "/api/me"
            );

        currentUser =
            result.user;

        updateNavbar();

        loadOrders();

    } catch {

        logout();
    }
}


document.addEventListener(
    "DOMContentLoaded",
    init
);


/* ================= CLICK OUTSIDE ================= */

window.addEventListener(
    "click",
    event => {

        const buyModal =
            document.getElementById(
                "buyModal"
            );

        const loginModal =
            document.getElementById(
                "loginModal"
            );

        const registerModal =
            document.getElementById(
                "registerModal"
            );

        const waitingModal =
            document.getElementById(
                "waitingModal"
            );

        const pendingModal =
            document.getElementById(
                "pendingModal"
            );

        if (
            event.target ===
            buyModal
        ) {
            closeModal();
        }

        if (
            event.target ===
            loginModal
        ) {
            closeAuthModals();
        }

        if (
            event.target ===
            registerModal
        ) {
            closeAuthModals();
        }

        if (
            event.target ===
            waitingModal
        ) {
            closeWaiting();
        }

        if (
            event.target ===
            pendingModal
        ) {
            closePending();
        }
    }
);