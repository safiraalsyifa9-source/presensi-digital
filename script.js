/* =====================================================
   KONFIGURASI
===================================================== */

const CONFIG = {

    // Ganti dengan URL Web App Google Apps Script Anda
    API_URL: 'https://script.google.com/macros/s/AKfycbwLFzhyei4uimSVoZP-Rn8TUhOs8LaXqYvfpHudQUutHSzGXy9-urxyj5SNw-4OvOFcfw/exec',

    // Ganti dengan URL Google Sheet Anda
    SHEET_URL: 'https://docs.google.com/spreadsheets/d/10zHNgdfYoMgktRn9l9zTsE8REJOdp_Mrfc7FZdrZIFE/edit?gid=0#gid=0',

    // GID sheet mahasiswa
    MAHASISWA_GID: '0',

    // GID sheet presensi
    PRESENSI_GID: '646034675',

    CACHE_KEY: 'presensi_mahasiswa_cache',

    CACHE_TIME: 30 * 60 * 1000
};


/* =====================================================
   VARIABEL
===================================================== */

let students = [];

let scanner = null;

let scannerRunning = false;

let flashOn = false;

let lastScannedNim = null;

let lastScanTime = 0;


/* =====================================================
   ELEMENT
===================================================== */

const connectionStatus =
    document.getElementById('connectionStatus');

const scanStatus =
    document.getElementById('scanStatus');

const studentInfo =
    document.getElementById('studentInfo');

const studentTableBody =
    document.getElementById('studentTableBody');

const studentNim =
    document.getElementById('studentNim');

const qrResult =
    document.getElementById('qrResult');

const downloadQrBtn =
    document.getElementById('downloadQrBtn');


/* =====================================================
   API HELPER
===================================================== */

async function apiGet(action) {

    if (!CONFIG.API_URL ||
        CONFIG.API_URL.includes('MASUKKAN_URL')) {

        throw new Error(
            'API_URL belum dikonfigurasi.'
        );
    }

    const url =
        `${CONFIG.API_URL}?action=${encodeURIComponent(action)}`;

    const response = await fetch(url, {
        method: 'GET',
        cache: 'no-store'
    });

    if (!response.ok) {
        throw new Error(
            `HTTP ${response.status}`
        );
    }

    return await response.json();
}


/* =====================================================
   API POST
===================================================== */

async function apiPost(data) {

    if (!CONFIG.API_URL ||
        CONFIG.API_URL.includes('MASUKKAN_URL')) {

        throw new Error(
            'API_URL belum dikonfigurasi.'
        );
    }

    const response = await fetch(
        CONFIG.API_URL,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8'
            },
            body: JSON.stringify(data)
        }
    );

    if (!response.ok) {
        throw new Error(
            `HTTP ${response.status}`
        );
    }

    return await response.json();
}


/* =====================================================
   STATUS KONEKSI
===================================================== */

function setConnectionStatus(online, text) {

    if (online) {

        connectionStatus.className =
            'status online';

        connectionStatus.textContent =
            `🟢 ${text || 'Terhubung ke server'}`;

    } else {

        connectionStatus.className =
            'status offline';

        connectionStatus.textContent =
            `🔴 ${text || 'Tidak terhubung ke server'}`;
    }
}


/* =====================================================
   CACHE
===================================================== */

function saveCache(data) {

    try {

        localStorage.setItem(
            CONFIG.CACHE_KEY,
            JSON.stringify({
                time: Date.now(),
                data: data
            })
        );

    } catch (error) {

        console.warn(
            'Gagal menyimpan cache:',
            error
        );
    }
}


function loadCache() {

    try {

        const raw =
            localStorage.getItem(
                CONFIG.CACHE_KEY
            );

        if (!raw) {
            return null;
        }

        const cache =
            JSON.parse(raw);

        if (!cache.data) {
            return null;
        }

        return cache.data;

    } catch (error) {

        console.warn(
            'Cache rusak:',
            error
        );

        return null;
    }
}


/* =====================================================
   LOAD DATA MAHASISWA
===================================================== */

async function loadStudents() {

    try {

        const result =
            await apiGet('get_all');

        if (
            result &&
            Array.isArray(result.data)
        ) {

            students = result.data;

        } else if (
            Array.isArray(result)
        ) {

            students = result;

        } else {

            throw new Error(
                'Format data mahasiswa tidak valid.'
            );
        }

        saveCache(students);

        renderStudents();

        setConnectionStatus(
            true,
            'Data berhasil diperbarui'
        );

    } catch (error) {

        console.error(error);

        const cache =
            loadCache();

        if (cache) {

            students = cache;

            renderStudents();

            setConnectionStatus(
                false,
                'Server offline — menggunakan cache'
            );

        } else {

            studentTableBody.innerHTML = `
                <tr>
                    <td colspan="5">
                        Gagal mengambil data mahasiswa.
                    </td>
                </tr>
            `;

            setConnectionStatus(
                false,
                'Tidak dapat terhubung ke server'
            );
        }
    }
}


/* =====================================================
   RENDER TABLE
===================================================== */

function renderStudents() {

    if (!students.length) {

        studentTableBody.innerHTML = `
            <tr>
                <td colspan="5">
                    Belum ada data mahasiswa.
                </td>
            </tr>
        `;

        return;
    }

    studentTableBody.innerHTML =
        students.map((student, index) => {

            const nim =
                student.nim ??
                student.NIM ??
                '';

            const nama =
                student.nama ??
                student.name ??
                student.Nama ??
                '';

            const kelas =
                student.kelas ??
                student.class ??
                student.Kelas ??
                '';

            const jurusan =
                student.jurusan ??
                student.major ??
                student.Jurusan ??
                '';

            return `
                <tr>
                    <td>${index + 1}</td>
                    <td>${escapeHtml(nim)}</td>
                    <td>${escapeHtml(nama)}</td>
                    <td>${escapeHtml(kelas)}</td>
                    <td>${escapeHtml(jurusan)}</td>
                </tr>
            `;

        }).join('');
}


/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeHtml(value) {

    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}


/* =====================================================
   CARI MAHASISWA
===================================================== */

function findStudent(nim) {

    const target =
        String(nim)
            .trim()
            .toLowerCase();

    return students.find(student => {

        const value =
            student.nim ??
            student.NIM ??
            student.Nim ??
            '';

        return String(value)
            .trim()
            .toLowerCase() === target;
    });
}


/* =====================================================
   TAMPILKAN DATA MAHASISWA
===================================================== */

function showStudent(student) {

    if (!student) {

        studentInfo.innerHTML = `
            <p>
                ❌ Mahasiswa dengan NIM tersebut
                tidak ditemukan.
            </p>
        `;

        return;
    }

    const nim =
        student.nim ??
        student.NIM ??
        '';

    const nama =
        student.nama ??
        student.name ??
        student.Nama ??
        '';

    const kelas =
        student.kelas ??
        student.class ??
        student.Kelas ??
        '';

    const jurusan =
        student.jurusan ??
        student.major ??
        student.Jurusan ??
        '';

    studentInfo.innerHTML = `
        <p>
            <strong>NIM:</strong>
            ${escapeHtml(nim)}
        </p>

        <p>
            <strong>Nama:</strong>
            ${escapeHtml(nama)}
        </p>

        <p>
            <strong>Kelas:</strong>
            ${escapeHtml(kelas)}
        </p>

        <p>
            <strong>Jurusan:</strong>
            ${escapeHtml(jurusan)}
        </p>
    `;
}


/* =====================================================
   PRESENSI
===================================================== */

async function submitAttendance(nim) {

    const student =
        findStudent(nim);

    if (!student) {

        showStudent(null);

        scanStatus.textContent =
            '❌ NIM tidak ditemukan.';

        return;
    }

    showStudent(student);

    scanStatus.textContent =
        '⏳ Mengirim presensi...';

    try {

        const result =
            await apiPost({
                action: 'presensi',
                nim: String(nim).trim()
            });

        if (
            result &&
            result.success === false
        ) {

            scanStatus.textContent =
                `⚠️ ${result.message || 'Presensi gagal.'}`;

            return;
        }

        scanStatus.textContent =
            `✅ Presensi berhasil untuk ${
                student.nama ??
                student.name ??
                ''
            }`;

    } catch (error) {

        console.error(error);

        scanStatus.textContent =
            '❌ Gagal mengirim presensi. Periksa koneksi.';
    }
}


/* =====================================================
   QR SCANNER
===================================================== */

async function startScanner() {

    if (scannerRunning) {
        return;
    }

    if (
        typeof Html5Qrcode ===
        'undefined'
    ) {

        scanStatus.textContent =
            '❌ Library QR Scanner belum tersedia.';

        return;
    }

    scanner =
        new Html5Qrcode('reader');

    try {

        await scanner.start(

            {
                facingMode: 'environment'
            },

            {
                fps: 10,
                qrbox: {
                    width: 250,
                    height: 250
                }
            },

            async decodedText => {

                const now =
                    Date.now();

                // Hindari scan berulang terlalu cepat
                if (
                    decodedText ===
                    lastScannedNim &&
                    now - lastScanTime < 3000
                ) {

                    return;
                }

                lastScannedNim =
                    decodedText;

                lastScanTime =
                    now;

                await processQr(
                    decodedText
                );
            },

            errorMessage => {
                // Error scan biasa tidak perlu ditampilkan
            }
        );

        scannerRunning = true;

        scanStatus.textContent =
            '🟢 Kamera aktif. Arahkan ke QR mahasiswa.';

    } catch (error) {

        console.error(error);

        scanStatus.textContent =
            '❌ Kamera gagal dimulai. Pastikan izin kamera diberikan.';
    }
}


/* =====================================================
   STOP SCANNER
===================================================== */

async function stopScanner() {

    if (!scanner || !scannerRunning) {
        return;
    }

    try {

        await scanner.stop();

        await scanner.clear();

    } catch (error) {

        console.warn(
            'Gagal menghentikan scanner:',
            error
        );
    }

    scannerRunning = false;

    scanStatus.textContent =
        'Kamera dihentikan.';
}


/* =====================================================
   PROSES QR
===================================================== */

async function processQr(decodedText) {

    let nim =
        String(decodedText).trim();

    /*
       Jika QR berisi JSON,
       coba ambil nilai NIM.
    */

    try {

        const data =
            JSON.parse(decodedText);

        if (data.nim) {
            nim = String(data.nim);
        }

    } catch (error) {
        // QR berupa teks biasa
    }

    /*
       Jika QR menggunakan format:
       NIM: 123456
    */

    if (
        nim.toLowerCase()
            .startsWith('nim:')
    ) {

        nim =
            nim.substring(4).trim();
    }

    await submitAttendance(nim);
}


/* =====================================================
   FLASH
===================================================== */

async function toggleFlash() {

    if (!scannerRunning || !scanner) {

        scanStatus.textContent =
            'Mulai kamera terlebih dahulu.';

        return;
    }

    try {

        const capabilities =
            scanner.getRunningTrackCameraCapabilities();

        if (
            !capabilities ||
            !capabilities.torchFeature()
        ) {

            scanStatus.textContent =
                '⚠️ Flash tidak didukung perangkat ini.';

            return;
        }

        flashOn = !flashOn;

        await scanner.applyVideoConstraints({
            advanced: [
                {
                    torch: flashOn
                }
            ]
        });

        scanStatus.textContent =
            flashOn
                ? '🔦 Flash menyala'
                : '🔦 Flash mati';

    } catch (error) {

        console.error(error);

        scanStatus.textContent =
            '❌ Tidak dapat mengontrol flash.';
    }
}


/* =====================================================
   GENERATE QR
===================================================== */

function generateStudentQr() {

    const nim =
        studentNim.value.trim();

    if (!nim) {

        alert(
            'Masukkan NIM terlebih dahulu.'
        );

        return;
    }

    qrResult.innerHTML = '';

    try {

        new QRCode(qrResult, {
            text: nim,
            width: 200,
            height: 200,
            correctLevel:
                QRCode.CorrectLevel.H
        });

        downloadQrBtn.style.display =
            'inline-block';

    } catch (error) {

        console.error(error);

        qrResult.innerHTML =
            '<p>Gagal membuat QR.</p>';

        downloadQrBtn.style.display =
            'none';
    }
}


/* =====================================================
   DOWNLOAD QR
===================================================== */

function downloadQr() {

    const canvas =
        qrResult.querySelector('canvas');

    const image =
        qrResult.querySelector('img');

    let url = null;

    if (canvas) {

        url =
            canvas.toDataURL(
                'image/png'
            );

    } else if (image) {

        url =
            image.src;
    }

    if (!url) {

        alert(
            'QR belum dibuat.'
        );

        return;
    }

    const nim =
        studentNim.value.trim() ||
        'mahasiswa';

    const link =
        document.createElement('a');

    link.href = url;

    link.download =
        `QR-${nim}.png`;

    document.body.appendChild(link);

    link.click();

    link.remove();
}


/* =====================================================
   OPEN GOOGLE SHEET
===================================================== */

function openSheet() {

    if (
        !CONFIG.SHEET_URL ||
        CONFIG.SHEET_URL.includes('MASUKKAN_URL')
    ) {

        alert(
            'SHEET_URL belum dikonfigurasi.'
        );

        return;
    }

    window.open(
        CONFIG.SHEET_URL,
        '_blank',
        'noopener,noreferrer'
    );
}


/* =====================================================
   EVENT
===================================================== */

document
    .getElementById('startScanBtn')
    .addEventListener(
        'click',
        startScanner
    );


document
    .getElementById('stopScanBtn')
    .addEventListener(
        'click',
        stopScanner
    );


document
    .getElementById('flashBtn')
    .addEventListener(
        'click',
        toggleFlash
    );


document
    .getElementById('generateQrBtn')
    .addEventListener(
        'click',
        generateStudentQr
    );


downloadQrBtn
    .addEventListener(
        'click',
        downloadQr
    );


document
    .getElementById('refreshBtn')
    .addEventListener(
        'click',
        loadStudents
    );


document
    .getElementById('openSheetBtn')
    .addEventListener(
        'click',
        openSheet
    );


studentNim
    .addEventListener(
        'keydown',
        event => {

            if (
                event.key === 'Enter'
            ) {

                generateStudentQr();
            }
        }
    );


/* =====================================================
   INIT
===================================================== */

async function init() {

    // Tampilkan cache terlebih dahulu
    const cache =
        loadCache();

    if (cache) {

        students = cache;

        renderStudents();
    }

    // Cek server dan ambil data terbaru
    await loadStudents();
}


document.addEventListener(
    'DOMContentLoaded',
    init
);


/* =====================================================
   CLEANUP
===================================================== */

window.addEventListener(
    'beforeunload',
    async () => {

        if (scannerRunning) {

            try {
                await scanner.stop();
            } catch (error) {
                console.warn(error);
            }
        }
    }
);